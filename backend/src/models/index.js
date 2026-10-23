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
  photos:    [{ url: String, publicId: String, format: String, accessType: { type: String, enum: ['upload', 'authenticated'], default: 'upload' } }],
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
  pincode:       { type: String, required: true, unique: true, match: /^[1-9]\d{5}$/ },
  city:          { type: String, required: true },
  district:      { type: String, default: '' },
  state:         { type: String, required: true },
  zone:          { type: String, enum: ['tamil-nadu', 'south-india', 'rest-india'], required: true },
  deliveryFee:   { type: Number, required: true },
  estimatedDays: { type: String, required: true }, // '1-2 days'
  isServiceable: { type: Boolean, default: true },
  reason:        { type: String, default: '' },
  priority:      { type: Number, default: 0 },
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
  movementKey:    { type: String },
  note:           { type: String }
}, { timestamps: true })

stockLogSchema.index({ movementKey: 1 }, { unique: true, sparse: true })

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

// ── NOTIFICATION DELIVERY ─────────────────────────────────
const notificationDeliverySchema = new mongoose.Schema({
  channel:      { type: String, enum: ['whatsapp'], required: true },
  recipient:    { type: String, required: true },
  templateName: { type: String, required: true },
  params:       [{ type: String }],
  status:       { type: String, enum: ['pending', 'sending', 'delivered', 'failed', 'simulated'], default: 'pending' },
  attempts:     { type: Number, default: 0 },
  lastError:    { type: String },
  sentAt:       { type: Date },
  orderNumber:  { type: String }
}, { timestamps: true })

notificationDeliverySchema.index({ status: 1, updatedAt: -1 })

// ── ADMIN AUDIT LOG ──────────────────────────────────────
const adminAuditLogSchema = new mongoose.Schema({
  action:   { type: String, required: true, index: true },
  scope:    { type: String, default: 'admin' },
  actorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resourceId: { type: String },
  details:  { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true })

adminAuditLogSchema.index({ createdAt: -1, _id: -1 })

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
  provider:          { type: String, enum: ['razorpay', 'direct-upi', 'pay-at-farm'], required: true },
  providerPaymentId: { type: String },
  providerOrderId:   { type: String },
  amount:            { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['paid', 'failed', 'pending'], default: 'paid' },
  refundStatus:      { type: String, enum: ['not_requested', 'pending', 'processing', 'refunded', 'failed', 'unknown'], default: 'not_requested' },
  refundType:        { type: String, enum: ['full', 'duplicate'] },
  refundId:          { type: String },
  refundAmount:      { type: Number },
  refundRequestedAt: { type: Date },
  refundedAt:        { type: Date },
  refundAttempts:    [{
    refundId: String,
    status: { type: String, enum: ['pending', 'processing', 'refunded', 'failed', 'unknown'] },
    amount: Number,
    updatedAt: { type: Date, default: Date.now }
  }],
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
paymentTransactionSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true })

const paymentAttemptSchema = new mongoose.Schema({
  orderId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  idempotencyKey:  { type: String, required: true },
  attemptNumber:   { type: Number, required: true },
  providerOrderId: { type: String },
  amountMinor:     { type: Number, required: true },
  currency:        { type: String, required: true, default: 'INR' },
  status:          { type: String, enum: ['creating', 'created', 'failed', 'unknown', 'captured'], default: 'creating' },
  paymentIds:      [{ type: String }],
  paymentEvents:   [{ paymentId: String, status: String, errorCode: String, errorDescription: String, occurredAt: { type: Date, default: Date.now } }],
  failureMessage:  { type: String },
  createdAt:       { type: Date, default: Date.now },
  updatedAt:       { type: Date, default: Date.now }
}, { timestamps: true })
paymentAttemptSchema.index({ orderId: 1, idempotencyKey: 1 }, { unique: true })
paymentAttemptSchema.index({ orderId: 1, attemptNumber: 1 }, { unique: true })
paymentAttemptSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true })

// ── WEBHOOK EVENT LOG ────────────────────────────────────
const paymentWebhookEventSchema = new mongoose.Schema({
  provider:    { type: String, enum: ['razorpay'], required: true },
  eventId:     { type: String, required: true, unique: true, index: true },
  eventType:   { type: String, required: true },
  status:      { type: String, enum: ['pending', 'processing', 'processed', 'failed'], default: 'pending' },
  processingLeaseUntil: { type: Date },
  receivedAt:  { type: Date, default: Date.now },
  processedAt: { type: Date },
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  paymentId:   { type: String },
  providerOrderId: { type: String },
  paymentAmountMinor: { type: Number },
  paymentCurrency: { type: String },
  gatewayPaymentStatus: { type: String },
  payloadHash: { type: String }
}, { timestamps: true })

// ── REVIEW ────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      { type: String, required: true, trim: true },
  phone:     { type: String },
  location:  { type: String, trim: true },
  rating:    { type: Number, required: true, min: 1, max: 5 },
  title:     { type: String, trim: true },
  comment:   { type: String, required: true, trim: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false },
  adminReply: { type: String }
}, { timestamps: true })

reviewSchema.index({ productId: 1, createdAt: -1 })

export const Coupon        = mongoose.model('Coupon',        couponSchema)
export const Complaint     = mongoose.model('Complaint',     complaintSchema)
export const Pincode       = mongoose.model('Pincode',       pincodeSchema)
export const StockLog      = mongoose.model('StockLog',      stockLogSchema)
export const BulkEnquiry   = mongoose.model('BulkEnquiry',   bulkEnquirySchema)
export const NotifyMe      = mongoose.model('NotifyMe',      notifyMeSchema)
export const NotificationDelivery = mongoose.model('NotificationDelivery', notificationDeliverySchema)
export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema)
export const BusinessHours = mongoose.model('BusinessHours', businessHoursSchema)
export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema)
export const PaymentAttempt = mongoose.model('PaymentAttempt', paymentAttemptSchema)
export const PaymentWebhookEvent = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema)
export const Review        = mongoose.model('Review',        reviewSchema)
