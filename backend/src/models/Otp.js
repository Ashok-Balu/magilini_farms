import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const otpSchema = new mongoose.Schema({
  phone:     { type: String, required: true, index: true, trim: true },
  otpHash:   { type: String, required: true },
  attempts:  { type: Number, default: 0 },
  lockedAt:  { type: Date },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true })

otpSchema.methods.verifyOtp = async function(otp) {
  return bcrypt.compare(String(otp), this.otpHash)
}

otpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt
}

otpSchema.methods.isLocked = function(maxAttempts = 3) {
  return Boolean(this.lockedAt) || this.attempts >= maxAttempts
}

otpSchema.statics.createOtp = async function(phone, otp, expiryMinutes = 10) {
  await this.deleteMany({ phone })
  const salt   = await bcrypt.genSalt(10)
  const hash   = await bcrypt.hash(String(otp), salt)
  const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000)
  return this.create({ phone, otpHash: hash, expiresAt: expiry, attempts: 0 })
}

export default mongoose.model('Otp', otpSchema)
