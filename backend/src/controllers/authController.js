import User from '../models/User.js'
import Otp  from '../models/Otp.js'
import OtpRequest from '../models/OtpRequest.js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { generateToken, setTokenCookie, setVerificationCookie, clearVerificationCookie, clearAuthCookies } from '../middleware/auth.js'
import { otpService } from '../services/otp/otpService.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { otpConfig } from '../config/otp.js'
import { logger } from '../utils/logger.js'

const normalizePhone = (value) => String(value || '').replace(/\D/g, '')

const isValidPhone = (value) => /^\d{10}$/.test(normalizePhone(value))

const generateOTP = () => crypto.randomInt(1000, 10000)

const signVerificationToken = (phone) => jwt.sign({ phone, purpose: 'otp_profile' }, process.env.JWT_SECRET, { expiresIn: '10m' })

const logAuthActivity = (event, phone, details = {}) => {
  logger.info('Auth activity', {
    scope: 'auth',
    event,
    phone,
    ...details
  })
}

// POST /api/auth/send-otp
export const sendOtp = asyncHandler(async (req, res) => {
  try {
    const phone = normalizePhone(req.body.phone)
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' })
    }

    const blockedUser = await User.findOne({ phone, isBlocked: true })
    if (blockedUser) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
    }

    if (otpConfig.rateLimitEnabled) {
      const requestWindowStart = new Date(Date.now() - otpConfig.windowMs)
      const requestCount = await OtpRequest.countRecentRequests(phone, requestWindowStart)
      if (requestCount >= otpConfig.maxRequests) {
        return res.status(429).json({ success: false, message: 'Too many OTP requests. Please try again later.' })
      }
    }

    const otp = generateOTP()
    const otpRecord = await Otp.createOtp(phone, otp, otpConfig.expiryMinutes)
    const requestRecord = otpConfig.rateLimitEnabled
      ? await OtpRequest.recordRequest(phone, otpConfig.windowMs)
      : null

    try {
      await otpService.sendOTP(phone, otp, otpConfig.expiryMinutes)
    } catch (err) {
      logger.error('OTP send failed', { phone, error: err.message, stack: err.stack })
      await Otp.deleteMany({ phone })
      if (requestRecord?._id) await OtpRequest.findByIdAndDelete(requestRecord._id)
      return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' })
    }

    logAuthActivity('otp_sent', phone, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      otpId: otpRecord._id.toString()
    })

    res.json({ success: true, message: `OTP sent to +91 ${phone}` })
  } catch (err) {
    logger.error('Send OTP endpoint error', { error: err.message, stack: err.stack })
    throw err
  }
})

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body.phone)
  const otp = String(req.body.otp || '').trim()

  if (!isValidPhone(phone) || !/^\d{4}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required.' })
  }

  const otpRecord = await Otp.findOne({ phone }).sort({ createdAt: -1 })
  if (!otpRecord) {
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' })
  }

  if (otpRecord.isExpired()) {
    await Otp.deleteMany({ phone })
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new OTP.' })
  }

  if (!otpConfig.unlimitedVerifyAttempts && otpRecord.isLocked(otpConfig.maxAttempts)) {
    return res.status(429).json({ success: false, message: 'Maximum verification attempts exceeded.' })
  }

  const isValid = await otpRecord.verifyOtp(otp)
  if (!isValid) {
    if (otpConfig.unlimitedVerifyAttempts) {
      logAuthActivity('otp_failed_dev_unlimited', phone, { ip: req.ip, userAgent: req.headers['user-agent'] })
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' })
    }

    otpRecord.attempts += 1
    if (otpRecord.attempts >= otpConfig.maxAttempts) {
      otpRecord.lockedAt = new Date()
      await otpRecord.save()
      logAuthActivity('otp_failed_locked', phone, { ip: req.ip, userAgent: req.headers['user-agent'] })
      return res.status(429).json({ success: false, message: 'Maximum verification attempts exceeded.' })
    }

    await otpRecord.save()
    const remaining = otpConfig.maxAttempts - otpRecord.attempts
    logAuthActivity('otp_failed', phone, { ip: req.ip, userAgent: req.headers['user-agent'], remaining })
    return res.status(400).json({
      success: false,
      message: `Incorrect OTP. ${remaining} attempt(s) remaining.`
    })
  }

  await Otp.deleteMany({ phone })

  const user = await User.findOne({ phone })
  if (user?.isBlocked) {
    return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
  }

  if (user) {
    const token = generateToken(user._id)
    setTokenCookie(res, token)
    logAuthActivity('otp_verified_existing_user', phone, { userId: user._id.toString(), ip: req.ip, userAgent: req.headers['user-agent'] })
    return res.json({
      success: true,
      needsProfileCompletion: false,
      message: 'Logged in successfully!',
      user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, savedAddress: user.savedAddress }
    })
  }

  const verificationToken = signVerificationToken(phone)
  setVerificationCookie(res, verificationToken)
  logAuthActivity('otp_verified_new_user', phone, { ip: req.ip, userAgent: req.headers['user-agent'] })
  // Return response. In rare debugging scenarios you can enable
  // DEBUG_OTP_IN_BODY=true to receive the `otp_ticket` in the JSON
  // body so the frontend can continue while cookie issues are resolved.
  const responsePayload = {
    success: true,
    needsProfileCompletion: true,
    message: 'OTP verified. Please complete your profile.'
  }

  if (String(process.env.DEBUG_OTP_IN_BODY || '').toLowerCase() === 'true') {
    responsePayload.otp_ticket = verificationToken
  }

  return res.json(responsePayload)
})

// POST /api/auth/complete-profile
export const completeProfile = asyncHandler(async (req, res) => {
  const { name, email, address } = req.body

  if (req.user) {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }
    if (name) user.name = name.trim()
    if (email) user.email = email.trim()
    if (address) user.savedAddress = address
    await user.save()
    logAuthActivity('profile_updated_existing_user', user.phone, { userId: user._id.toString(), ip: req.ip, userAgent: req.headers['user-agent'] })
    return res.json({ success: true, message: 'Profile updated.', user })
  }

  if (!req.pendingAuth?.phone) {
    return res.status(401).json({ success: false, message: 'Not authenticated. Please login.' })
  }

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Name is required.' })
  }

  const phone = normalizePhone(req.pendingAuth.phone)
  let user = await User.findOne({ phone })

  if (user) {
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
    }
    if (name) user.name = name.trim()
    if (email) user.email = email.trim()
    if (address) user.savedAddress = address
    await user.save()
  } else {
    user = await User.create({
      name: name.trim(),
      phone,
      email: email?.trim() || undefined,
      savedAddress: address
    })
  }

  const token = generateToken(user._id)
  setTokenCookie(res, token)
  clearVerificationCookie(res)
  logAuthActivity('profile_completed_new_user', phone, { userId: user._id.toString(), ip: req.ip, userAgent: req.headers['user-agent'] })

  return res.json({
    success: true,
    message: 'Account created successfully!',
    user: { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, savedAddress: user.savedAddress }
  })
})

// POST /api/auth/admin-login
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' })
  }
  const loginEmail = email.trim().toLowerCase()
  const user = await User.findOne({ email: loginEmail, role: 'admin' })
  if (!user || !user.password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }
  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    logger.warn('Admin login failed', { email: loginEmail, reason: 'invalid_password', ip: req.ip })
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }
  const token = generateToken(user._id)
  setTokenCookie(res, token)
  logger.info('Admin login success', { adminId: user._id, email: user.email, ip: req.ip })
  res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user })
})

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res)
  res.json({ success: true, message: 'Logged out successfully.' })
})

// POST /api/auth/dev/clear-otp
export const clearDevOtpRecords = asyncHandler(async (_req, res) => {
  if (!otpConfig.isDevelopment) {
    return res.status(403).json({ success: false, message: 'This endpoint is available only in development.' })
  }

  const [otpResult, requestResult] = await Promise.all([
    Otp.deleteMany({}),
    OtpRequest.deleteMany({})
  ])

  return res.json({
    success: true,
    message: 'Development OTP records cleared.',
    deleted: {
      otpRecords: otpResult.deletedCount || 0,
      otpRequestRecords: requestResult.deletedCount || 0
    }
  })
})
