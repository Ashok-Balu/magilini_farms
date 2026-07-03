import { OTPProvider } from './OTPProvider.js'
import { logger } from '../../../utils/logger.js'

export class DevelopmentOTPProvider extends OTPProvider {
  async send(phone, otp, expiryMinutes) {
    const lines = [
      '=================================================',
      'Development OTP',
      `Phone : ${phone}`,
      `OTP   : ${otp}`,
      `Valid : ${expiryMinutes} Minutes`,
      '================================================='
    ]

    const banner = lines.join('\n')
    process.stdout.write(`${banner}\n`)
    logger.info('Development OTP generated', {
      phone,
      otp,
      expiryMinutes,
      mode: 'console'
    })

    return true
  }
}
