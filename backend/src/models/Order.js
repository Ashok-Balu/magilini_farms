import mongoose from 'mongoose'

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
  line1:    String, line2: String,
  city:     String, state: String,
  pincode:  String, landmark: String
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
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  razorpayOrderId:   { type: String },
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

// Auto generate order number before save
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments()
    this.orderNumber = `NM-${String(count + 1).padStart(6, '0')}`
  }
  next()
})

export default mongoose.model('Order', orderSchema)
