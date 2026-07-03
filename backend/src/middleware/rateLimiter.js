import rateLimit from 'express-rate-limit'
import { otpConfig } from '../config/otp.js'
import { errorResponse } from '../utils/response.js'

const createLimiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: errorResponse(message, [message]), standardHeaders: true, legacyHeaders: false })

export const otpLimiter     = rateLimit({
  windowMs: otpConfig.windowMs,
  max: otpConfig.maxRequests,
  skip: () => !otpConfig.rateLimitEnabled,
  message: errorResponse('Too many OTP requests. Try after 1 hour.', ['Too many OTP requests. Try after 1 hour.']),
  standardHeaders: true,
  legacyHeaders: false
})
export const loginLimiter   = createLimiter(15 * 60 * 1000, 10,  'Too many login attempts. Try after 15 minutes.')
export const apiLimiter     = createLimiter(60 * 1000,      100, 'Too many requests. Please slow down.')
export const paymentLimiter = createLimiter(60 * 1000,      10,  'Too many payment requests.')
export const uploadLimiter  = createLimiter(60 * 1000,      20,  'Too many uploads. Please wait.')
