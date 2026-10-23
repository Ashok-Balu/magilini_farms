import rateLimit from 'express-rate-limit'
import { errorResponse } from '../utils/response.js'

const createLimiter = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: errorResponse(message, [message]), standardHeaders: true, legacyHeaders: false })

export const loginLimiter          = createLimiter(15 * 60 * 1000, 10,  'Too many login attempts. Try after 15 minutes.')
export const registerLimiter       = createLimiter(60 * 60 * 1000, 20,  'Too many registration attempts. Try again later.')
export const forgotPasswordLimiter = createLimiter(60 * 60 * 1000, 5,   'Too many password reset requests. Try again later.')
export const apiLimiter     = createLimiter(60 * 1000,      100, 'Too many requests. Please slow down.')
export const paymentLimiter = createLimiter(60 * 1000,      10,  'Too many payment requests.')
export const uploadLimiter  = createLimiter(60 * 1000,      20,  'Too many uploads. Please wait.')
