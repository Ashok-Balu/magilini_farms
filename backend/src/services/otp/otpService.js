import { DevelopmentOTPProvider } from './providers/DevelopmentOTPProvider.js'
import { TwilioOTPProvider } from './providers/TwilioOTPProvider.js'

const isProduction = String(process.env.NODE_ENV || 'development').toLowerCase() === 'production'
const configuredProvider = String(process.env.OTP_PROVIDER || '').trim().toLowerCase()

const hasTwilioCredentials = () => {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

const resolveProvider = () => {
  if (configuredProvider === 'twilio') return new TwilioOTPProvider()
  if (configuredProvider === 'development' || configuredProvider === 'console') {
    return new DevelopmentOTPProvider()
  }
  
  // In production, use Twilio only if credentials are available
  // Otherwise fall back to console logging
  if (isProduction) {
    return hasTwilioCredentials() ? new TwilioOTPProvider() : new DevelopmentOTPProvider()
  }
  
  return new DevelopmentOTPProvider()
}

const provider = resolveProvider()

export const otpService = {
  providerName: provider.constructor.name,
  async sendOTP(phone, otp, expiryMinutes) {
    return provider.send(phone, otp, expiryMinutes)
  }
}
