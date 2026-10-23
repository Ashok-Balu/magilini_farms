import mongoose from 'mongoose'
import { weightToKg } from '../utils/weight.js'

const variantSchema = new mongoose.Schema({
  weight:      { type: String, required: true, validate: value => weightToKg(value) > 0 },
  price:       { type: Number, required: true, min: 0.01 },
  mrp:         { type: Number, required: true, min: 0.01, validate: function(value) { return value >= this.price } },
  stock:       { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  isAvailable: { type: Boolean, default: true }
}, { _id: true })

const imageSchema = new mongoose.Schema({
  url:      { type: String, required: true },
  publicId: { type: String, required: true }
}, { _id: false })

const seoSchema = new mongoose.Schema({
  metaTitle:       { type: String },
  metaDescription: { type: String }
}, { _id: false })

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  slug:       { type: String, required: true, unique: true, lowercase: true },
  category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  description:{ type: String, required: true },
  keyPoints:  [{ type: String }],
  storageTips:{ type: String },
  productTerms:{ type: String },
  tags:       [{ type: String }],
  badge:      { type: String },
  minimumQty: { type: Number, default: 1, min: 1, validate: Number.isSafeInteger },
  variants:   [variantSchema],
  images:     [imageSchema],

  // Seasonal
  seasonalStatus: {
    type: String,
    enum: ['available', 'off-season', 'coming-soon'],
    default: 'available'
  },
  availableFrom: { type: Date },
  seasonNote:    { type: String },

  isFeatured: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  seo:        seoSchema
}, { timestamps: true })

// Virtual: overall stock status
productSchema.virtual('stockStatus').get(function() {
  const variants = this.variants || []
  const totalStock = variants.reduce((s, v) => s + v.stock, 0)
  if (totalStock === 0) return 'out-of-stock'
  if (variants.some(v => v.stock <= 10)) return 'low-stock'
  return 'in-stock'
})

productSchema.set('toJSON', { virtuals: true })
productSchema.set('toObject', { virtuals: true })

export default mongoose.model('Product', productSchema)
