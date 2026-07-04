import { OTPProvider } from './OTPProvider.js'
import { logger } from '../../../utils/logger.js'

export class DevelopmentOTPProvider extends OTPProvider {
  async send(phone, otp, expiryMinutes) {
    const timestamp = new Date().toISOString()
    const lines = [
      '═══════════════════════════════════════════════════',
      '🔐 DEVELOPMENT OTP (Check logs below)',
      `📱 Phone    : ${phone}`,
      `🔑 OTP      : ${otp}`,
      `⏱️  Expires  : ${expiryMinutes} minutes`,
      `⏰ Timestamp: ${timestamp}`,
      '═══════════════════════════════════════════════════'
    ]

    const banner = lines.join('\n')
    process.stdout.write(`\n${banner}\n\n`)
    
    logger.info('🔐 OTP generated (Development Mode)', {
      phone,
      otp,
      expiryMinutes,
      timestamp,
      mode: 'console'
    })

    return true
  }
}
