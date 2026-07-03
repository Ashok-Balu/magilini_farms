import mongoose from 'mongoose'

const otpRequestSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true, trim: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true })

otpRequestSchema.statics.countRecentRequests = function(phone, since) {
  return this.countDocuments({ phone, createdAt: { $gte: since } })
}

otpRequestSchema.statics.recordRequest = function(phone, windowMs = 60 * 60 * 1000) {
  return this.create({ phone, expiresAt: new Date(Date.now() + windowMs) })
}

export default mongoose.model('OtpRequest', otpRequestSchema)