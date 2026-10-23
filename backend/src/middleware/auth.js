import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'

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
    if (req.cookies?.token && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.origin
      const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
        .split(',')
        .map(value => value.trim().replace(/\/+$/, ''))
        .filter(Boolean)
      if (!origin || !allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return res.status(403).json(errorResponse('Forbidden', ['Request origin is not allowed.']))
      }
    }

    const user    = await User.findById(decoded.id).select('-__v')
    if (!user)          return res.status(401).json(errorResponse('Unauthorized', ['User not found.']))
    if (user.isBlocked) return res.status(403).json(errorResponse('Forbidden', ['Your account has been blocked.']))
    if ((decoded.sessionVersion ?? 0) !== (user.authVersion ?? 0)) {
      return res.status(401).json(errorResponse('Unauthorized', ['Session has been revoked.']))
    }

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json(errorResponse('Unauthorized', ['Invalid or expired JWT token.']))
  }
}

export const optionalAuth = async (req, res, next) => {
  try {
    let token = req.cookies?.token
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-__v')
      if (user && !user.isBlocked && (decoded.sessionVersion ?? 0) === (user.authVersion ?? 0)) req.user = user
    }
  } catch {}
  next()
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

export const generateToken = (userId, sessionVersion = 0) => {
  return jwt.sign({ id: userId, sessionVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
}

export const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  })
  try {
    logger.info('Set auth cookie', { cookie: 'token', secure: cookieBaseOptions.secure, sameSite: cookieBaseOptions.sameSite })
  } catch (err) {
    // ignore logging failures
  }
}

export const clearAuthCookies = (res) => {
  res.clearCookie('token', cookieBaseOptions)
}
