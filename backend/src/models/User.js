import mongoose from 'mongoose'
import bcrypt   from 'bcryptjs'

const addressSchema = new mongoose.Schema({
  line1:    { type: String },
  line2:    { type: String },
  city:     { type: String },
  state:    { type: String },
  pincode:  { type: String },
  landmark: { type: String }
}, { _id: false })

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  phone:        { type: String, required: true, unique: true, trim: true },
  email:        { type: String, trim: true, lowercase: true },
  password:     { type: String },          // only set for admin users
  role:         { type: String, enum: ['customer', 'admin'], default: 'customer' },
  savedAddress: addressSchema,
  isBlocked:    { type: Boolean, default: false }
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

export default mongoose.model('User', userSchema)
