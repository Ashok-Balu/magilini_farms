const asBool = (value, fallback) => {
  if (value === undefined) return fallback
  return String(value).trim().toLowerCase() === 'true'
}

const asInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase()
const isDevelopment = nodeEnv === 'development'
const isProduction = nodeEnv === 'production'

const maxRequests = asInt(process.env.OTP_MAX_REQUESTS, isDevelopment ? 100 : 5)
const maxAttempts = asInt(process.env.OTP_MAX_ATTEMPTS, isDevelopment ? Number.MAX_SAFE_INTEGER : 3)
const expiryMinutes = asInt(process.env.OTP_EXPIRY_MINUTES, 10)
const rateLimitEnabled = asBool(process.env.OTP_RATE_LIMIT_ENABLED, isProduction)
const showOtpInConsole = asBool(process.env.OTP_SHOW_IN_CONSOLE, isDevelopment)
const exposeOtpInResponse = false

export const otpConfig = {
  nodeEnv,
  isDevelopment,
  isProduction,
  rateLimitEnabled,
  maxRequests,
  maxAttempts,
  expiryMinutes,
  windowMs: 60 * 60 * 1000,
  showOtpInConsole,
  exposeOtpInResponse,
  unlimitedVerifyAttempts: isDevelopment,
  autoResendOnExpiredVerify: isDevelopment,
  resetCountersOnRestart: isDevelopment
}
