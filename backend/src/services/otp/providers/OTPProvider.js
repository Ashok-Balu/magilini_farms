export class OTPProvider {
  async send(_phone, _otp, _expiryMinutes) {
    throw new Error('OTPProvider.send must be implemented by subclasses')
  }
}
