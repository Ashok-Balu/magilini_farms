import { Coupon, Complaint, Pincode, BulkEnquiry, NotifyMe, BusinessHours, StockLog } from '../models/index.js'
import User    from '../models/User.js'
import Order   from '../models/Order.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { notifyComplaintReceived, notifyBulkEnquiry } from '../services/notificationService.js'

const audit = (action, details = {}) => {
  console.info(JSON.stringify({ scope: 'admin', action, at: new Date().toISOString(), ...details }))
}

// ── COUPON ────────────────────────────────────────────────
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body
  if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required.' })

  const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true })
  if (!coupon) return res.status(400).json({ success: false, message: 'Invalid coupon code.' })
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return res.status(400).json({ success: false, message: 'Coupon has expired.' })
  if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' })
  if (Number(subtotal) < coupon.minOrderAmount) return res.status(400).json({ success: false, message: `Minimum order ₹${coupon.minOrderAmount} required for this coupon.` })
  if (req.user) {
    const usedCountByUser = coupon.usedBy.filter(id => String(id) === String(req.user._id)).length
    if (usedCountByUser >= Number(coupon.perUserLimit || 1)) {
      return res.status(400).json({ success: false, message: 'You have reached the per-user limit for this coupon.' })
    }
  }

  let discount = 0
  let description = ''
  if (coupon.type === 'percent') {
    discount    = Math.round(Number(subtotal) * coupon.value / 100)
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    description = `${coupon.value}% off${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`
  } else if (coupon.type === 'flat') {
    discount    = Math.min(coupon.value, Number(subtotal))
    description = `₹${coupon.value} flat off`
  } else if (coupon.type === 'delivery') {
    description = 'Free delivery'
    discount    = 0 // actual delivery discount applied at checkout
  }

  res.json({ success: true, discount, description, couponType: coupon.type })
})

export const adminGetCoupons   = asyncHandler(async (_, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 })
  res.json({ success: true, coupons })
})
export const adminCreateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body)
  audit('coupon_created', { couponId: coupon._id, code: coupon.code, adminId: req.user?._id })
  res.status(201).json({ success: true, coupon })
})
export const adminUpdateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true })
  audit('coupon_updated', { couponId: coupon?._id, adminId: req.user?._id })
  res.json({ success: true, coupon })
})
export const adminDeleteCoupon = asyncHandler(async (req, res) => { await Coupon.findByIdAndDelete(req.params.id); audit('coupon_deleted', { couponId: req.params.id, adminId: req.user?._id }); res.json({ success: true, message: 'Coupon deleted.' }) })

// ── DELIVERY / PINCODE ────────────────────────────────────
export const checkPincode = asyncHandler(async (req, res) => {
  const requestedPin = String(req.params.pincode || req.params.pin || '').trim()
  const pin = await Pincode.findOne({ pincode: requestedPin, isActive: true })
  if (!pin) return res.json({ success: false, serviceable: false, message: 'Sorry, we do not deliver to this pincode yet. You can choose Farm Pickup instead.' })

  const toDateText = (d) => d.toISOString().slice(0, 10)
  const daysText = String(pin.estimatedDays || '')
  const match = daysText.match(/(\d+)\s*-\s*(\d+)/)
  const minDays = Number(match?.[1] || 1)
  const maxDays = Number(match?.[2] || minDays)
  const start = new Date()
  start.setDate(start.getDate() + minDays)
  const end = new Date()
  end.setDate(end.getDate() + maxDays)

  res.json({
    success: true,
    serviceable: true,
    city: pin.city,
    state: pin.state,
    deliveryFee: pin.deliveryFee,
    estimatedDays: pin.estimatedDays,
    estimatedDeliveryDate: {
      from: toDateText(start),
      to: toDateText(end)
    },
    zone: pin.zone
  })
})

export const adminGetPincodes   = asyncHandler(async (_, res) => res.json({ success: true, pincodes: await Pincode.find().sort({ zone: 1, pincode: 1 }) }))
export const adminCreatePincode = asyncHandler(async (req, res) => { const pincode = await Pincode.create(req.body); audit('pincode_created', { pincodeId: pincode._id, adminId: req.user?._id }); res.status(201).json({ success: true, pincode }) })
export const adminUpdatePincode = asyncHandler(async (req, res) => { const pincode = await Pincode.findByIdAndUpdate(req.params.id, req.body, { new: true }); audit('pincode_updated', { pincodeId: pincode?._id, adminId: req.user?._id }); res.json({ success: true, pincode }) })
export const adminDeletePincode = asyncHandler(async (req, res) => { await Pincode.findByIdAndDelete(req.params.id); audit('pincode_deleted', { pincodeId: req.params.id, adminId: req.user?._id }); res.json({ success: true }) })

// ── COMPLAINT ─────────────────────────────────────────────
export const submitComplaint = asyncHandler(async (req, res) => {
  const { orderId, deliveryDate, description } = req.body
  if (!orderId || !deliveryDate || !description) {
    return res.status(400).json({ success: false, message: 'Order ID, delivery date, and description are required.' })
  }

  const photos = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || []

  // Verify order belongs to user and has been delivered
  const order = await Order.findOne({ _id: orderId, userId: req.user._id })
  if (!order) return res.status(400).json({ success: false, message: 'Order not found.' })
  if (order.status !== 'Delivered' && order.status !== 'Picked-Up') {
    return res.status(400).json({ success: false, message: 'Order has not been delivered yet.' })
  }

  // Check 24-hour complaint window from delivery
  const deliveredEntry = order.statusHistory.findLast(h => h.status === 'Delivered' || h.status === 'Picked-Up')
  if (deliveredEntry) {
    const hoursSinceDelivery = (Date.now() - new Date(deliveredEntry.time).getTime()) / (1000 * 60 * 60)
    if (hoursSinceDelivery > 24) {
      return res.status(400).json({ success: false, message: 'Complaint window is 24 hours after delivery. The window has passed.' })
    }
  }

  const complaint = await Complaint.create({
    orderId: order._id,
    userId:  req.user._id,
    phone:   req.user.phone,
    deliveryDate: new Date(deliveryDate),
    description,
    photos
  })

  await notifyComplaintReceived({ ...complaint.toObject(), orderId: order.orderNumber })
  res.status(201).json({ success: true, message: 'Complaint submitted. We will review within 24 hours.', complaintNumber: complaint.complaintNumber })
})

export const getMyComplaints     = asyncHandler(async (req, res) => res.json({ success: true, complaints: await Complaint.find({ userId: req.user._id }).sort({ createdAt: -1 }) }))
export const adminGetComplaints  = asyncHandler(async (_, res) => res.json({ success: true, complaints: await Complaint.find().sort({ createdAt: -1 }).populate('orderId', 'orderNumber') }))
export const adminGetComplaint   = asyncHandler(async (req, res) => res.json({ success: true, complaint: await Complaint.findById(req.params.id).populate('orderId userId') }))
export const adminUpdateComplaint = asyncHandler(async (req, res) => { const complaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true }); audit('complaint_updated', { complaintId: req.params.id, adminId: req.user?._id, status: req.body.status }); res.json({ success: true, complaint }) })

// ── BULK ENQUIRY ──────────────────────────────────────────
export const submitBulkEnquiry  = asyncHandler(async (req, res) => {
  const { name, phone, quantity, city } = req.body
  if (!name || !phone || !quantity || !city) return res.status(400).json({ success: false, message: 'Name, phone, quantity, and city are required.' })
  const enquiry = await BulkEnquiry.create(req.body)
  await notifyBulkEnquiry(enquiry)
  res.status(201).json({ success: true, message: 'Enquiry submitted! We will contact you within 24 hours.' })
})
export const adminGetBulkEnquiries  = asyncHandler(async (_, res) => res.json({ success: true, enquiries: await BulkEnquiry.find().sort({ createdAt: -1 }) }))
export const adminUpdateBulkEnquiry = asyncHandler(async (req, res) => { const enquiry = await BulkEnquiry.findByIdAndUpdate(req.params.id, req.body, { new: true }); audit('bulk_enquiry_updated', { enquiryId: req.params.id, adminId: req.user?._id, status: req.body.status }); res.json({ success: true, enquiry }) })

// ── NOTIFY ME ─────────────────────────────────────────────
export const registerNotifyMe = asyncHandler(async (req, res) => {
  const { phone, productId } = req.body
  if (!phone || !productId) return res.status(400).json({ success: false, message: 'Phone and productId are required.' })
  await NotifyMe.findOneAndUpdate({ phone: phone.trim(), productId }, { phone: phone.trim(), productId, notified: false }, { upsert: true })
  res.json({ success: true, message: 'We will notify you when this product is available!' })
})

// ── BUSINESS HOURS ────────────────────────────────────────
export const getBusinessHours = asyncHandler(async (_, res) => {
  res.json({ success: true, hours: await BusinessHours.find().sort({ day: 1 }) })
})
export const adminUpdateHours = asyncHandler(async (req, res) => {
  const updated = await Promise.all(
    req.body.hours.map(h => BusinessHours.findOneAndUpdate({ day: h.day }, h, { upsert: true, new: true }))
  )
  res.json({ success: true, hours: updated })
})

// ── ADMIN CUSTOMERS ───────────────────────────────────────
export const adminGetCustomers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query
  const query = { role: 'customer' }
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search } }]
  const total     = await User.countDocuments(query)
  const customers = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
  const customerIds = customers.map(c => c._id)
  const [ordersAgg] = await Promise.all([
    Order.aggregate([
      { $match: { userId: { $in: customerIds } } },
      { $group: { _id: '$userId', orders: { $sum: 1 }, totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } } } }
    ])
  ])
  const map = new Map(ordersAgg.map(item => [String(item._id), item]))
  const enriched = customers.map(customer => ({
    ...customer.toObject(),
    ordersCount: map.get(String(customer._id))?.orders || 0,
    totalSpent: map.get(String(customer._id))?.totalSpent || 0
  }))
  res.json({ success: true, total, customers: enriched })
})

export const adminGetCustomer = asyncHandler(async (req, res) => {
  const customer   = await User.findById(req.params.id).select('-password')
  if (!customer) return res.status(404).json({ success: false, message: 'Customer not found.' })
  const orders     = await Order.find({ userId: req.params.id }).sort({ createdAt: -1 })
  const totalSpend = orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0)
  res.json({ success: true, customer, orders, totalSpend })
})

export const adminToggleBlock = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, [{ $set: { isBlocked: { $not: '$isBlocked' } } }], { new: true }).select('-password')
  audit('customer_block_toggled', { customerId: user?._id, blocked: user?.isBlocked, adminId: req.user?._id })
  res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}.`, user })
})

// ── CATEGORIES ───────────────────────────────────────────
export const adminGetCategories = asyncHandler(async (_, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, createdAt: -1 })
  res.json({ success: true, categories })
})

export const adminCreateCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body)
  audit('category_created', { categoryId: category._id, adminId: req.user?._id })
  res.status(201).json({ success: true, category })
})

export const adminUpdateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true })
  audit('category_updated', { categoryId: req.params.id, adminId: req.user?._id })
  res.json({ success: true, category })
})

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id)
  audit('category_deleted', { categoryId: req.params.id, adminId: req.user?._id })
  res.json({ success: true })
})

// ── BUSINESS HOURS ────────────────────────────────────────
export const adminGetBusinessHours = asyncHandler(async (_, res) => {
  res.json({ success: true, hours: await BusinessHours.find().sort({ day: 1 }) })
})

export const adminUpdateBusinessHours = asyncHandler(async (req, res) => {
  const hours = Array.isArray(req.body.hours) ? req.body.hours : []
  const updated = await Promise.all(hours.map(h => BusinessHours.findOneAndUpdate({ day: h.day }, h, { upsert: true, new: true })))
  audit('business_hours_updated', { adminId: req.user?._id })
  res.json({ success: true, hours: updated })
})

// ── STOCK LOGS ────────────────────────────────────────────
export const adminGetStockLogs = asyncHandler(async (req, res) => {
  const { productId, page = 1, limit = 50 } = req.query
  const query = productId ? { productId } : {}
  const total = await StockLog.countDocuments(query)
  const logs  = await StockLog.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).populate('orderId', 'orderNumber')
  res.json({ success: true, total, logs })
})

