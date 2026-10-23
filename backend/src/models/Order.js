import mongoose from 'mongoose'
import crypto from 'crypto'

const orderItemSchema = new mongoose.Schema({
  productId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  variantId:  { type: mongoose.Schema.Types.ObjectId },
  name:       { type: String, required: true },
  weight:     { type: String, required: true },
  price:      { type: Number, required: true },
  qty:        { type: Number, required: true, min: 1 },
  subtotal:   { type: Number, required: true }
}, { _id: false })

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone:    { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
  line1:    { type: String, required: true },
  line2:    String,
  city:     { type: String, required: true },
  state:    { type: String, required: true },
  pincode:  { type: String, required: true, match: /^[1-9]\d{5}$/ },
  landmark: String
}, { _id: false })

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note:   { type: String },
  adminId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminName:{ type: String },
  time:   { type: Date, default: Date.now }
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderNumber:  { type: String, unique: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  idempotencyKey: { type: String },
  requestHash: { type: String },

  customer: {
    name:     { type: String, required: true },
    phone:    { type: String, required: true },
    email:    { type: String }
  },

  deliveryType: { type: String, enum: ['home', 'pickup'], required: true },

  deliveryAddress: addressSchema,
  pickupDate:      { type: Date },

  items:    [orderItemSchema],
  totalKg:  { type: Number, required: true },

  // Packaging
  packaging:    { type: String, enum: ['standard', 'gift'], default: 'standard' },
  giftMessage:  { type: String, maxlength: 100 },
  packagingFee: { type: Number, default: 0 },

  orderNotes:           { type: String, maxlength: 200 },
  preferredDeliveryDate:{ type: Date },

  // Pricing
  subtotal:       { type: Number, required: true },
  couponCode:     { type: String },
  couponDiscount: { type: Number, default: 0 },
  deliveryFee:    { type: Number, default: 0 },
  total:          { type: Number, required: true },

  // Payment
  paymentMethod: {
    type: String,
    enum: ['razorpay-upi', 'razorpay-card', 'razorpay-nb', 'direct-upi', 'pay-at-farm'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refund_pending', 'refunded', 'refund_failed'],
    default: 'pending'
  },
  inventoryStatus: {
    type: String,
    enum: ['reserved', 'committed', 'released']
  },
  inventoryExpiresAt: { type: Date },
  refundRequired: { type: Boolean, default: false },
  razorpayOrderId:   { type: String },
  paymentAttemptSequence: { type: Number, default: 0 },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },
  utrNumber:         { type: String },
  paymentScreenshot: { type: String },
  paymentConfirmedAt:{ type: Date },
  paymentConfirmedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Delivery
  courierName:    { type: String },
  courierTracking:{ type: String },
  deliveryZone:   { type: String },

  // Status
  status: {
    type: String,
    enum: ['New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Pickup-Ready', 'Picked-Up'],
    default: 'New'
  },
  statusHistory: [statusHistorySchema],
  internalNote:  { type: String },
  cancelledBy:   { type: String },
  cancelReason:  { type: String }
}, { timestamps: true })

orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
)

orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `NM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  }
  next()
})

export default mongoose.model('Order', orderSchema)
