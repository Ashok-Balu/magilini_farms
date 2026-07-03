import { DevelopmentOTPProvider } from './providers/DevelopmentOTPProvider.js'
import { TwilioOTPProvider } from './providers/TwilioOTPProvider.js'

const isProduction = String(process.env.NODE_ENV || 'development').toLowerCase() === 'production'
const configuredProvider = String(process.env.OTP_PROVIDER || '').trim().toLowerCase()

const resolveProvider = () => {
  if (configuredProvider === 'twilio') return new TwilioOTPProvider()
  if (configuredProvider === 'development' || configuredProvider === 'console') {
    return new DevelopmentOTPProvider()
  }
  return isProduction ? new TwilioOTPProvider() : new DevelopmentOTPProvider()
}

const provider = resolveProvider()

export const otpService = {
  providerName: provider.constructor.name,
  async sendOTP(phone, otp, expiryMinutes) {
    return provider.send(phone, otp, expiryMinutes)
  }
}
