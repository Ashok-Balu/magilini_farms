import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  slug:      { type: String, required: true, unique: true, lowercase: true },
  emoji:     { type: String, default: '🥭' },
  image:     { type: String },
  isActive:  { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('Category', categorySchema)
