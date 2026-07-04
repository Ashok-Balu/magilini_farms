import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { errorResponse } from '../utils/response.js'

const cookieBaseOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
}

export const protect = async (req, res, next) => {
  try {
    // Get token from httpOnly cookie or Authorization header
    let token = req.cookies?.token
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (!token) return res.status(401).json(errorResponse('Unauthorized', ['JWT token is missing.']))

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findById(decoded.id).select('-__v')
    if (!user)          return res.status(401).json(errorResponse('Unauthorized', ['User not found.']))
    if (user.isBlocked) return res.status(403).json(errorResponse('Forbidden', ['Your account has been blocked.']))

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json(errorResponse('Unauthorized', ['Invalid or expired JWT token.']))
  }
}

export const allowSessionOrVerification = async (req, res, next) => {
  try {
    let token = req.cookies?.token
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id).select('-__v')
        if (user) {
          if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' })
          }
          req.user = user
          req.authMode = 'session'
          return next()
        }
      } catch {
        // Ignore stale/invalid session token for this route and fall back to otp_ticket.
      }
    }

    const verificationToken = req.cookies?.otp_ticket
    if (!verificationToken) {
      return res.status(401).json(errorResponse('Unauthorized', ['Authentication required. Please login.']))
    }

    const decoded = jwt.verify(verificationToken, process.env.JWT_SECRET)
    if (decoded.purpose !== 'otp_profile' || !decoded.phone) {
      return res.status(401).json(errorResponse('Unauthorized', ['Verification session expired. Please request a new OTP.']))
    }

    req.pendingAuth = { phone: String(decoded.phone) }
    req.authMode = 'verification'
    next()
  } catch (err) {
    return res.status(401).json(errorResponse('Unauthorized', ['Invalid or expired session. Please login again.']))
  }
}

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(errorResponse('Forbidden', ['Admin access required.']))
  }
  next()
}

export const customerOnly = (req, res, next) => {
  if (req.user?.role !== 'customer') {
    return res.status(403).json(errorResponse('Forbidden', ['Customer access required.']))
  }
  if (req.user?.isBlocked) {
    return res.status(403).json(errorResponse('Forbidden', ['Your account has been blocked.']))
  }
  next()
}

export const authMiddleware = protect
export const adminMiddleware = [protect, adminOnly]
export const customerMiddleware = [protect, customerOnly]

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

export const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
}

export const setVerificationCookie = (res, token) => {
  res.cookie('otp_ticket', token, {
    ...cookieBaseOptions,
    maxAge: 10 * 60 * 1000
  })
}

export const clearAuthCookies = (res) => {
  res.clearCookie('token', cookieBaseOptions)
  res.clearCookie('otp_ticket', cookieBaseOptions)
}

export const clearVerificationCookie = (res) => {
  res.clearCookie('otp_ticket', cookieBaseOptions)
}
