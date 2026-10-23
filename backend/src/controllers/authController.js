import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import { generateToken, setTokenCookie, clearAuthCookies } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { sendPasswordResetEmail } from '../services/email/emailService.js'
import { logger } from '../utils/logger.js'

const logAuthActivity = (event, details = {}) => {
  logger.info('Auth activity', { scope: 'auth', event, ...details })
}

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  addresses: user.addresses
})

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, phone } = req.body

  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' })
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    phone: phone ? String(phone).trim() : undefined,
    role: 'customer'
  })

  const token = generateToken(user._id, user.authVersion ?? 0)
  setTokenCookie(res, token)
  logAuthActivity('register', { userId: user._id.toString() })

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    data: { user: publicUser(user) }
  })
})

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = String(email).trim().toLowerCase()

  const user = await User.findOne({ email: normalizedEmail, role: 'customer' }).select('+password')
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' })
  }
  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
  }

  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    logAuthActivity('login_failed', { reason: 'invalid_password' })
    return res.status(401).json({ success: false, message: 'Invalid email or password.' })
  }

  const token = generateToken(user._id, user.authVersion ?? 0)
  setTokenCookie(res, token)
  logAuthActivity('login_success', { userId: user._id.toString() })

  res.json({
    success: true,
    message: 'Login successful',
    data: { user: publicUser(user) }
  })
})

// POST /api/auth/admin-login
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const loginEmail = String(email).trim().toLowerCase()
  const user = await User.findOne({ email: loginEmail, role: 'admin' }).select('+password')
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }
  const isMatch = await user.comparePassword(password)
  if (!isMatch) {
    logger.warn('Admin login failed', { reason: 'invalid_password' })
    return res.status(401).json({ success: false, message: 'Invalid credentials.' })
  }
  const token = generateToken(user._id, user.authVersion ?? 0)
  setTokenCookie(res, token)
  logger.info('Admin login success', { adminId: user._id })
  res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
})

// GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  const user = req.user.toObject ? req.user.toObject() : { ...req.user }
  delete user.authVersion
  res.json({ success: true, user })
})

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { authVersion: 1 } })
  clearAuthCookies(res)
  res.json({ success: true, message: 'Logged out successfully.' })
})

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = String(req.body.email).trim().toLowerCase()
  const genericMessage = 'If an account exists for this email, a password reset link has been sent.'

  const user = await User.findOne({ email: normalizedEmail, role: 'customer' })
  if (user) {
    const rawToken = user.createPasswordResetToken()
    await user.save({ validateBeforeSave: false })

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`
    await sendPasswordResetEmail(user.email, resetLink)
    logAuthActivity('forgot_password_requested', { userId: user._id.toString() })
  }

  res.json({ success: true, message: genericMessage })
})

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body
  const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex')

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await User.findOneAndUpdate({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  }, {
    $set: { password: hashedPassword },
    $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    $inc: { authVersion: 1 }
  }, { new: true, runValidators: true })

  if (!user) {
    return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' })
  }

  logAuthActivity('password_reset', { userId: user._id.toString() })
  res.json({ success: true, message: 'Password has been reset. Please log in with your new password.' })
})
