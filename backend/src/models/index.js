import mongoose from 'mongoose'

// ── COUPON ────────────────────────────────────────────────
const couponSchema = new mongoose.Schema({
  code:           { type: String, required: true, unique: true, uppercase: true },
  type:           { type: String, enum: ['percent', 'flat', 'delivery'], required: true },
  value:          { type: Number, required: true },
  minOrderAmount: { type: Number, default: 0 },
  maxDiscount:    { type: Number },
  usageLimit:     { type: Number, default: 1000 },
  usedCount:      { type: Number, default: 0 },
  perUserLimit:   { type: Number, default: 1 },
  usedBy:         [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive:       { type: Boolean, default: true },
  validFrom:      { type: Date, default: Date.now },
  expiresAt:      { type: Date }
}, { timestamps: true })

// ── COMPLAINT ─────────────────────────────────────────────
const complaintSchema = new mongoose.Schema({
  complaintNumber: { type: String, unique: true },
  orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone:     { type: String, required: true },
  deliveryDate: { type: Date, required: true },
  description: { type: String, required: true },
  photos:    [{ url: String, publicId: String }],
  status:    { type: String, enum: ['New', 'Reviewing', 'Resolved', 'Rejected'], default: 'New' },
  adminNote: { type: String }
}, { timestamps: true })

complaintSchema.pre('save', async function(next) {
  if (!this.complaintNumber) {
    const count = await mongoose.model('Complaint').countDocuments()
    this.complaintNumber = `CMP-${String(count + 1).padStart(6, '0')}`
  }
  next()
})

// ── PINCODE ───────────────────────────────────────────────
const pincodeSchema = new mongoose.Schema({
  pincode:       { type: String, required: true, unique: true },
  city:          { type: String, required: true },
  state:         { type: String, required: true },
  zone:          { type: String, enum: ['tamil-nadu', 'south-india', 'rest-india'], required: true },
  deliveryFee:   { type: Number, required: true },
  estimatedDays: { type: String, required: true }, // '1-2 days'
  isActive:      { type: Boolean, default: true }
}, { timestamps: true })

// ── STOCK LOG ─────────────────────────────────────────────
const stockLogSchema = new mongoose.Schema({
  productId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName:    { type: String },
  variantWeight:  { type: String, required: true },
  changeType:     { type: String, enum: ['manual', 'order', 'cancellation', 'adjustment'], required: true },
  quantityBefore: { type: Number, required: true },
  quantityChange: { type: Number, required: true }, // negative = decrease
  quantityAfter:  { type: Number, required: true },
  orderId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  adminId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:           { type: String }
}, { timestamps: true })

// ── BULK ENQUIRY ──────────────────────────────────────────
const bulkEnquirySchema = new mongoose.Schema({
  name:      { type: String, required: true },
  phone:     { type: String, required: true },
  email:     { type: String },
  company:   { type: String },
  variety:   { type: String, required: true },
  quantity:  { type: String, required: true },
  city:      { type: String, required: true },
  requiredBy:{ type: Date },
  message:   { type: String },
  status:    { type: String, enum: ['New', 'Contacted', 'Converted', 'Closed'], default: 'New' }
}, { timestamps: true })

// ── NOTIFY ME ─────────────────────────────────────────────
const notifyMeSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  notified:  { type: Boolean, default: false }
}, { timestamps: true })

notifyMeSchema.index({ phone: 1, productId: 1 }, { unique: true })

// ── BUSINESS HOURS ────────────────────────────────────────
const businessHoursSchema = new mongoose.Schema({
  day:             { type: String, enum: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'], required: true, unique: true },
  isOpen:          { type: Boolean, default: true },
  openTime:        { type: String, default: '08:00' },  // 24hr format
  closeTime:       { type: String, default: '20:00' },
  pickupOpenTime:  { type: String, default: '07:00' },
  pickupCloseTime: { type: String, default: '18:00' }
}, { timestamps: true })

// ── PAYMENT TRANSACTION ──────────────────────────────────
const paymentTransactionSchema = new mongoose.Schema({
  orderId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber:       { type: String, required: true, index: true },
  provider:          { type: String, enum: ['razorpay', 'direct-upi'], required: true },
  providerPaymentId: { type: String, index: true },
  providerOrderId:   { type: String },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['paid', 'failed', 'pending'], default: 'paid' },
  utrNumber:         { type: String },
  source:            { type: String, enum: ['admin-confirm', 'verify-endpoint', 'webhook'], required: true },
  confirmedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt:       { type: Date, default: Date.now },
  metadata:          { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true })

paymentTransactionSchema.index(
  { orderId: 1, provider: 1, providerPaymentId: 1 },
  { unique: true, sparse: true }
)

// ── WEBHOOK EVENT LOG ────────────────────────────────────
const paymentWebhookEventSchema = new mongoose.Schema({
  provider:    { type: String, enum: ['razorpay'], required: true },
  eventId:     { type: String, required: true, unique: true, index: true },
  eventType:   { type: String, required: true },
  receivedAt:  { type: Date, default: Date.now },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  paymentId:   { type: String },
  payloadHash: { type: String }
}, { timestamps: true })

export const Coupon        = mongoose.model('Coupon',        couponSchema)
export const Complaint     = mongoose.model('Complaint',     complaintSchema)
export const Pincode       = mongoose.model('Pincode',       pincodeSchema)
export const StockLog      = mongoose.model('StockLog',      stockLogSchema)
export const BulkEnquiry   = mongoose.model('BulkEnquiry',   bulkEnquirySchema)
export const NotifyMe      = mongoose.model('NotifyMe',      notifyMeSchema)
export const BusinessHours = mongoose.model('BusinessHours', businessHoursSchema)
export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema)
export const PaymentWebhookEvent = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema)
