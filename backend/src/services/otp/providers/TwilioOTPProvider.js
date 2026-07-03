import { OTPProvider } from './OTPProvider.js'
import { sendSMS } from '../../notificationService.js'

export class TwilioOTPProvider extends OTPProvider {
  async send(phone, otp, _expiryMinutes) {
    const message = `Your MagiliniFarms OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`
    const sent = await sendSMS(phone, message)
    if (!sent) {
      throw new Error('Failed to deliver OTP via Twilio provider.')
    }
    return true
  }
}
