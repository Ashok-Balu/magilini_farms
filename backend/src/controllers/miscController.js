import mongoose from 'mongoose'
import { Coupon, Complaint, Pincode, BulkEnquiry, NotifyMe, NotificationDelivery, AdminAuditLog, BusinessHours, StockLog, Review } from '../models/index.js'
import User    from '../models/User.js'
import Order   from '../models/Order.js'
import Product from '../models/Product.js'
import Category from '../models/Category.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { cloudinary } from '../config/cloudinary.js'
import { notifyComplaintReceived, notifyBulkEnquiry, notifySeasonAvailable, retryWAMessage } from '../services/notificationService.js'
import { getDeliveryByPincode } from '../services/deliveryService.js'

const audit = async (action, details = {}) => {
  const { adminId, ...context } = details
  const resourceId = Object.entries(context).find(([key]) => key.endsWith('Id'))?.[1]
  await AdminAuditLog.create({
    action,
    scope: 'admin',
    actorId: adminId,
    resourceId: resourceId == null ? undefined : String(resourceId),
    details: context
  })
  console.info(JSON.stringify({ scope: 'admin', action, at: new Date().toISOString(), ...details }))
}

const complaintWithPhotoLinks = (complaint) => {
  const document = complaint.toObject ? complaint.toObject() : complaint
  return {
    ...document,
    photos: (document.photos || []).map(({ url, publicId, format, accessType, ...photo }) => ({
      ...photo,
      url: accessType === 'authenticated'
        ? cloudinary.utils.private_download_url(publicId, format, {
          resource_type: 'image',
          type: 'authenticated',
          expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
          attachment: false,
          secure: true
        })
        : url
    }))
  }
}

export const getStoreSettings = asyncHandler(async (_req, res) => {
  const minimumOrderKg = Number(process.env.MIN_ORDER_KG || 3)
  const freeDeliveryMin = Number(process.env.FREE_DELIVERY_MIN || 0)
  res.json({
    success: true,
    settings: {
      minimumOrderKg: Number.isFinite(minimumOrderKg) && minimumOrderKg > 0 ? minimumOrderKg : 3,
      freeDeliveryMin: Number.isFinite(freeDeliveryMin) && freeDeliveryMin > 0 ? freeDeliveryMin : 0
    }
  })
})

// ── COUPON ────────────────────────────────────────────────
export const applyCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body
  if (!code) return res.status(400).json({ success: false, message: 'Please enter a coupon code.' })

  const normalizedCode = code.trim().toUpperCase()
  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true })

  if (!coupon) return res.status(400).json({ success: false, message: `Coupon "${normalizedCode}" is not valid.` })
  if (coupon.validFrom && coupon.validFrom > new Date()) return res.status(400).json({ success: false, message: 'This coupon is not active yet.' })
  if (coupon.expiresAt && coupon.expiresAt <= new Date()) return res.status(400).json({ success: false, message: 'This coupon has expired.' })
  if (coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: 'This coupon has reached its maximum usage limit.' })

  const orderAmount = Number(subtotal) || 0
  if (orderAmount < coupon.minOrderAmount) {
    return res.status(400).json({ success: false, message: `Minimum order of ₹${coupon.minOrderAmount} required. Your cart is ₹${orderAmount}.` })
  }

  if (req.user) {
    const usedCountByUser = (coupon.usedBy || []).filter(id => String(id) === String(req.user._id)).length
    if (usedCountByUser >= Number(coupon.perUserLimit || 1)) {
      return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times.' })
    }
  }

  let discount = 0
  let description = ''

  if (coupon.type === 'percent') {
    discount = Math.round(orderAmount * coupon.value / 100)
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
    description = `${coupon.value}% off${coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ''}`
  } else if (coupon.type === 'flat') {
    discount = Math.min(coupon.value, orderAmount)
    description = `Flat ₹${coupon.value} off`
  } else if (coupon.type === 'delivery') {
    discount = 0
    description = `Free delivery (up to ₹${coupon.value})`
  }

  const response = {
    success: true,
    discount,
    description,
    couponType: coupon.type,
    code: normalizedCode,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscount: coupon.maxDiscount
  }
  if (coupon.type === 'delivery') response.deliveryDiscountLimit = coupon.value
  res.json(response)
})

export const adminGetCoupons = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.find().sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, coupons })
})
export const adminCreateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(req.body)
  await audit('coupon_created', { couponId: coupon._id, code: coupon.code, adminId: req.user?._id })
  res.status(201).json({ success: true, coupon })
})
export const adminUpdateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' })
  await audit('coupon_updated', { couponId: coupon._id, adminId: req.user?._id })
  res.json({ success: true, coupon })
})
export const adminDeleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id)
  if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' })
  await audit('coupon_deleted', { couponId: coupon._id, adminId: req.user?._id })
  res.json({ success: true, message: 'Coupon deleted.' })
})

// ── DELIVERY / PINCODE ────────────────────────────────────
export const checkPincode = asyncHandler(async (req, res) => {
  const requestedPin = String(req.params.pincode || req.params.pin || '').trim()
  const delivery = await getDeliveryByPincode(requestedPin)

  if (!delivery.serviceable) {
    return res.json({
      success: true,
      serviceable: false,
      message: delivery.message || 'Delivery is currently unavailable for this pincode.',
      reason: delivery.reason || 'Blocked Delivery Area'
    })
  }

  res.json({
    success: true,
    serviceable: true,
    zone: delivery.zone,
    deliveryFee: delivery.deliveryFee,
    estimatedDays: delivery.estimatedDays,
    city: delivery.city,
    state: delivery.state
  })
})

export const adminGetPincodes = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const [total, pincodes] = await Promise.all([
    Pincode.countDocuments(),
    Pincode.find().sort({ zone: 1, pincode: 1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, pincodes })
})
export const adminCreatePincode = asyncHandler(async (req, res) => { const pincode = await Pincode.create(req.body); await audit('pincode_created', { pincodeId: pincode._id, adminId: req.user?._id }); res.status(201).json({ success: true, pincode }) })
export const adminUpdatePincode = asyncHandler(async (req, res) => {
  const pincode = await Pincode.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
  if (!pincode) return res.status(404).json({ success: false, message: 'Pincode not found.' })
  await audit('pincode_updated', { pincodeId: pincode._id, adminId: req.user?._id })
  res.json({ success: true, pincode })
})
export const adminDeletePincode = asyncHandler(async (req, res) => {
  const pincode = await Pincode.findByIdAndDelete(req.params.id)
  if (!pincode) return res.status(404).json({ success: false, message: 'Pincode not found.' })
  await audit('pincode_deleted', { pincodeId: req.params.id, adminId: req.user?._id })
  res.json({ success: true })
})

// ── COMPLAINT ─────────────────────────────────────────────
export const submitComplaint = asyncHandler(async (req, res) => {
  const { orderId, deliveryDate, description } = req.body
  if (!orderId || !deliveryDate || !description) {
    return res.status(400).json({ success: false, message: 'Order ID, delivery date, and description are required.' })
  }

  const photos = req.files?.map(f => ({
    url: f.path,
    publicId: f.filename,
    format: f.mimetype === 'image/jpeg' ? 'jpg' : f.mimetype.split('/')[1],
    accessType: 'authenticated'
  })) || []

  const orderSelector = /^[a-f\d]{24}$/i.test(String(orderId))
    ? { _id: orderId }
    : { orderNumber: String(orderId).trim().toUpperCase() }
  const order = await Order.findOne({ ...orderSelector, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (order.status !== 'Delivered' && order.status !== 'Picked-Up') {
    return res.status(409).json({ success: false, message: 'Order has not been delivered yet.' })
  }

  const deliveredEntry = order.statusHistory.findLast(h => h.status === 'Delivered' || h.status === 'Picked-Up')
  const deliveredAt = new Date(deliveredEntry?.time)
  if (!deliveredEntry || !Number.isFinite(deliveredAt.getTime())) {
    return res.status(409).json({ success: false, message: 'Delivery timestamp is unavailable for this order.' })
  }
  const hoursSinceDelivery = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceDelivery < 0 || hoursSinceDelivery > 24) {
    return res.status(400).json({ success: false, message: 'Complaint window is 24 hours after delivery. The window has passed.' })
  }
  const deliveredParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(deliveredAt)
  const deliveredDate = Object.fromEntries(deliveredParts.map(part => [part.type, part.value]))
  if (deliveryDate !== `${deliveredDate.year}-${deliveredDate.month}-${deliveredDate.day}`) {
    return res.status(400).json({ success: false, message: 'Delivery date does not match the order delivery record.' })
  }

  const complaint = await Complaint.create({
    orderId: order._id,
    userId:  req.user._id,
    phone:   req.user.phone,
    deliveryDate: deliveredAt,
    description,
    photos
  })

  await notifyComplaintReceived({ ...complaint.toObject(), orderId: order.orderNumber })
  res.status(201).json({ success: true, message: 'Complaint submitted. We will review within 24 hours.', complaintNumber: complaint.complaintNumber })
})

export const getMyComplaints = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const query = { userId: req.user._id }
  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(query),
    Complaint.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, complaints: complaints.map(complaintWithPhotoLinks) })
})
export const adminGetComplaints = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const [total, complaints] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.find().sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).populate('orderId', 'orderNumber')
  ])
  res.json({ success: true, total, page, complaints: complaints.map(complaintWithPhotoLinks) })
})
export const adminGetComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id).populate('orderId userId')
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' })
  res.json({ success: true, complaint: complaintWithPhotoLinks(complaint) })
})
export const adminUpdateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
  if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' })
  await audit('complaint_updated', { complaintId: req.params.id, adminId: req.user?._id, status: req.body.status })
  res.json({ success: true, complaint: complaintWithPhotoLinks(complaint) })
})

// ── BULK ENQUIRY ──────────────────────────────────────────
export const submitBulkEnquiry  = asyncHandler(async (req, res) => {
  const { name, phone, quantity, city } = req.body
  if (!name || !phone || !quantity || !city) return res.status(400).json({ success: false, message: 'Name, phone, quantity, and city are required.' })
  const enquiry = await BulkEnquiry.create(req.body)
  await notifyBulkEnquiry(enquiry)
  res.status(201).json({ success: true, message: 'Enquiry submitted! We will contact you within 24 hours.' })
})
export const adminGetBulkEnquiries = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const [total, enquiries] = await Promise.all([
    BulkEnquiry.countDocuments(),
    BulkEnquiry.find().sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, enquiries })
})
export const adminUpdateBulkEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await BulkEnquiry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
  if (!enquiry) return res.status(404).json({ success: false, message: 'Bulk enquiry not found.' })
  await audit('bulk_enquiry_updated', { enquiryId: req.params.id, adminId: req.user?._id, status: req.body.status })
  res.json({ success: true, enquiry })
})

// ── NOTIFY ME ─────────────────────────────────────────────
export const registerNotifyMe = asyncHandler(async (req, res) => {
  const { phone, productId } = req.body
  const product = await Product.findOne({ _id: productId, isActive: true })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  const subscriber = await NotifyMe.findOneAndUpdate(
    { phone, productId },
    { $set: { notified: false }, $setOnInsert: { phone, productId } },
    { upsert: true, new: true, runValidators: true }
  )
  res.status(200).json({ success: true, message: 'We will notify you when this product is available!', subscriberId: subscriber._id })
})

export const adminGetNotifySubscribers = asyncHandler(async (req, res) => {
  const { productId, page = 1, limit = 100 } = req.query
  const query = productId ? { productId, notified: false } : { notified: false }
  const [waitingCount, subscribers] = await Promise.all([
    NotifyMe.countDocuments(query),
    NotifyMe.find(query).populate('productId', 'name slug').sort({ createdAt: -1 })
      .limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
  ])
  res.json({ success: true, total: waitingCount, page: Number(page), subscribers, waitingCount })
})

export const adminSendNotifications = asyncHandler(async (req, res) => {
  const { productId } = req.body
  if (!productId) return res.status(400).json({ success: false, message: 'productId is required.' })
  const product = await Product.findById(productId)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  const notifyList = await NotifyMe.find({ productId, notified: false })
  if (!notifyList.length) return res.json({ success: true, message: 'No pending subscribers to notify.', sent: 0 })
  const outcomes = await Promise.allSettled(notifyList.map(({ phone }) => notifySeasonAvailable(phone, product.name)))
  const successfulIds = outcomes.flatMap((outcome, index) =>
    outcome.status === 'fulfilled' && outcome.value === true ? [notifyList[index]._id] : []
  )
  if (successfulIds.length) {
    await NotifyMe.updateMany({ _id: { $in: successfulIds }, notified: false }, { notified: true })
  }
  const failed = notifyList.length - successfulIds.length
  await audit('notify_sent', { productId, count: successfulIds.length, failed, adminId: req.user?._id })
  res.json({
    success: true,
    message: failed ? `Notified ${successfulIds.length} subscribers; ${failed} remain queued for retry.` : `Notified ${successfulIds.length} subscribers.`,
    sent: successfulIds.length,
    failed
  })
})

export const adminGetNotificationDeliveries = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query
  const query = {}
  if (status && !['pending', 'sending', 'delivered', 'failed', 'simulated'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid notification status.' })
  }
  if (status) {
    query.status = status
  }
  const pageNumber = Math.max(1, Number(page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 50))
  const [total, deliveries] = await Promise.all([
    NotificationDelivery.countDocuments(query),
    NotificationDelivery.find(query)
      .select('-params')
      .sort({ updatedAt: -1 })
      .limit(pageSize)
      .skip((pageNumber - 1) * pageSize)
  ])
  res.json({ success: true, total, page: pageNumber, deliveries })
})

export const adminRetryNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID.' })
  }
  const result = await retryWAMessage(req.params.id)
  if (!result) return res.status(404).json({ success: false, message: 'Notification not found.' })
  if (!result.sent) {
    const conflict = result.delivery.status !== 'failed'
    return res.status(conflict ? 409 : 502).json({ success: false, message: result.reason })
  }
  await audit('notification_retried', { notificationId: result.delivery._id, adminId: req.user?._id })
  res.json({ success: true, message: 'Notification delivered.', delivery: result.delivery })
})

export const adminGetAuditLogs = asyncHandler(async (req, res) => {
  const { action, page = 1, limit = 50 } = req.query
  const query = {}
  if (action) query.action = String(action).trim().slice(0, 100)
  const pageNumber = Math.max(1, Number(page) || 1)
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 50))
  const [total, logs] = await Promise.all([
    AdminAuditLog.countDocuments(query),
    AdminAuditLog.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize)
      .populate('actorId', 'name email')
  ])
  res.json({ success: true, total, page: pageNumber, logs })
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
  if (search) {
    const safeSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.$or = [{ name: { $regex: safeSearch, $options: 'i' } }, { phone: { $regex: safeSearch } }]
  }
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
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const query = { userId: req.params.id }
  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  const totalSpend = await Order.aggregate([
    { $match: { userId: customer._id, paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$total' } } }
  ])
  res.json({ success: true, customer, total, page, orders, totalSpend: totalSpend[0]?.total || 0 })
})

export const adminToggleBlock = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'customer' },
    { $set: { isBlocked: req.body.isBlocked } },
    { new: true, runValidators: true }
  ).select('-password')
  if (!user) return res.status(404).json({ success: false, message: 'Customer not found.' })
  await audit('customer_block_toggled', { customerId: user._id, blocked: user.isBlocked, adminId: req.user?._id })
  res.json({ success: true, message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}.`, user })
})

// ── CATEGORIES ───────────────────────────────────────────
export const adminGetCategories = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 100)
  const [total, categories] = await Promise.all([
    Category.countDocuments(),
    Category.find().sort({ sortOrder: 1, createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, categories })
})

export const adminCreateCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(req.body)
  await audit('category_created', { categoryId: category._id, adminId: req.user?._id })
  res.status(201).json({ success: true, category })
})

export const adminUpdateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' })
  await audit('category_updated', { categoryId: category._id, adminId: req.user?._id })
  res.json({ success: true, category })
})

export const adminDeleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id)
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' })
  await audit('category_deleted', { categoryId: req.params.id, adminId: req.user?._id })
  res.json({ success: true })
})

// ── BUSINESS HOURS ────────────────────────────────────────
export const adminGetBusinessHours = asyncHandler(async (_, res) => {
  res.json({ success: true, hours: await BusinessHours.find().sort({ day: 1 }) })
})

export const adminUpdateBusinessHours = asyncHandler(async (req, res) => {
  const hours = Array.isArray(req.body.hours) ? req.body.hours : []
  const updated = await Promise.all(hours.map(h => BusinessHours.findOneAndUpdate({ day: h.day }, h, { upsert: true, new: true })))
  await audit('business_hours_updated', { adminId: req.user?._id })
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

// ── REVIEWS (PUBLIC) ──────────────────────────────────────
export const getProductReviews = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  const reviews = await Review.find({ productId: product._id, isApproved: true })
    .select('name location rating title comment isVerifiedPurchase adminReply createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
  const stats = await Review.aggregate([
    { $match: { productId: product._id, isApproved: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ])
  res.json({ success: true, reviews, stats: stats[0] || { avg: 0, count: 0 } })
})

export const submitReview = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug })
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  const { name, location, rating, title, comment } = req.body
  if (!name || !rating || !comment) return res.status(400).json({ success: false, message: 'Name, rating and comment are required.' })
  if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: 'Rating must be 1-5.' })
  const review = await Review.create({ productId: product._id, name, location, rating: Number(rating), title, comment, isApproved: false })
  res.status(201).json({ success: true, message: 'Review submitted and is awaiting moderation. Thank you.', review })
})

// ── REVIEWS (ADMIN) ───────────────────────────────────────
export const adminGetReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, productId, approved } = req.query
  const query = {}
  if (productId) query.productId = productId
  if (approved !== undefined) query.isApproved = approved === 'true'
  const total = await Review.countDocuments(query)
  const reviews = await Review.find(query).populate('productId', 'name slug').sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
  res.json({ success: true, reviews, total })
})

export const adminUpdateReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true })
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' })
  res.json({ success: true, review })
})

export const adminDeleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id)
  if (!review) return res.status(404).json({ success: false, message: 'Review not found.' })
  res.json({ success: true, message: 'Review deleted.' })
})

export const adminCreateReview = asyncHandler(async (req, res) => {
  const { productId, name, rating, title, comment, isVerifiedPurchase } = req.body
  if (!productId || !name || !rating || !comment) return res.status(400).json({ success: false, message: 'All fields required.' })
  const review = await Review.create({ productId, name, rating: Number(rating), title, comment, isVerifiedPurchase: !!isVerifiedPurchase, isApproved: true })
  res.status(201).json({ success: true, review })
})
