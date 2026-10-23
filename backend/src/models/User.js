import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'
import crypto   from 'crypto'

const addressSchema = new mongoose.Schema({
  fullName:  { type: String, required: true, trim: true },
  phone:     { type: String, required: true, trim: true },
  line1:     { type: String, required: true, trim: true },
  line2:     { type: String, trim: true },
  city:      { type: String, required: true, trim: true },
  district:  { type: String, trim: true },
  state:     { type: String, required: true, trim: true },
  pincode:   { type: String, required: true, trim: true, match: /^[1-9]\d{5}$/ },
  landmark:  { type: String, trim: true },
  type:      { type: String, enum: ['home', 'office', 'other'], default: 'home' },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true })

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:  { type: String, required: true, select: false },
  phone:     { type: String, trim: true },
  role:      { type: String, enum: ['customer', 'admin'], default: 'customer' },
  addresses: [addressSchema],
  isBlocked: { type: Boolean, default: false },
  authVersion: { type: Number, default: 0, min: 0 },

  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date, select: false }
}, { timestamps: true })

// Hash password before save if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password)
}

// Generates a raw reset token to email to the user; only the SHA-256 hash is persisted.
userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex')
  this.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex')
  this.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000)
  return rawToken
}

export default mongoose.model('User', userSchema)
