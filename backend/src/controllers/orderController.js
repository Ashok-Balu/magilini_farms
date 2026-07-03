import Order   from '../models/Order.js'
import Product from '../models/Product.js'
import User    from '../models/User.js'
import { Coupon, StockLog, Pincode, NotifyMe, PaymentTransaction } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { notifyOrderPlaced, notifyStatusUpdate, notifyLowStock, notifySeasonAvailable } from '../services/notificationService.js'
import { generateInvoicePDF } from '../services/invoiceService.js'
import { logger } from '../utils/logger.js'

const PACKAGING_FEE = 50
const MIN_ORDER_KG  = Number(process.env.MIN_ORDER_KG || 3)

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  if (value === 'Pickup Ready') return 'Pickup-Ready'
  return value
}

const ALLOWED_ORDER_STATUSES = new Set([
  'New',
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Pickup-Ready',
  'Picked-Up',
  'Cancelled'
])

const appendStatusHistory = (order, status, note, admin) => {
  order.statusHistory.push({
    status,
    note,
    adminId: admin?._id,
    adminName: admin?.name,
    time: new Date()
  })
}

// ── STOCK HELPERS ─────────────────────────────────────────
const decreaseStock = async (items, orderId) => {
  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) continue
    const variant = product.variants.id(item.variantId)
    if (!variant) continue
    const before = variant.stock
    variant.stock = Math.max(0, variant.stock - item.qty)
    await product.save()
    await StockLog.create({
      productId: product._id, productName: product.name,
      variantWeight: variant.weight, changeType: 'order',
      quantityBefore: before, quantityChange: -item.qty,
      quantityAfter: variant.stock, orderId
    })
    if (variant.stock <= 10 && variant.stock > 0) {
      await notifyLowStock(product.name, variant.weight, variant.stock)
    }
  }
}

const restoreStock = async (items, orderId) => {
  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) continue
    const variant = product.variants.id(item.variantId)
    if (!variant) continue
    const before = variant.stock
    variant.stock += item.qty
    await product.save()
    await StockLog.create({
      productId: product._id, productName: product.name,
      variantWeight: variant.weight, changeType: 'cancellation',
      quantityBefore: before, quantityChange: item.qty,
      quantityAfter: variant.stock,
      orderId
    })

    if (before === 0 && variant.stock > 0) {
      const notifyList = await NotifyMe.find({ productId: product._id, notified: false })
      await Promise.all(notifyList.map(({ phone }) => notifySeasonAvailable(phone, product.name).catch(() => {})))
      await NotifyMe.updateMany({ productId: product._id, notified: false }, { notified: true })
    }
  }
}

// ── CUSTOMER ENDPOINTS ────────────────────────────────────

// POST /api/orders
export const placeOrder = asyncHandler(async (req, res) => {
  const {
    deliveryType, deliveryAddress, pickupDate,
    items, packaging, giftMessage, orderNotes,
    preferredDeliveryDate, couponCode, paymentMethod, paymentScreenshot
  } = req.body

  if (!items?.length) return res.status(400).json({ success: false, message: 'No items in order.' })
  if (!['home','pickup'].includes(deliveryType)) return res.status(400).json({ success: false, message: 'Invalid delivery type.' })

  const orderItems = []
  let totalKg  = 0
  let subtotal = 0

  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product || !product.isActive) {
      return res.status(400).json({ success: false, message: `Product not available.` })
    }
    if (product.seasonalStatus !== 'available') {
      return res.status(400).json({ success: false, message: `${product.name} is currently out of season.` })
    }
    const variant = product.variants.id(item.variantId)
    if (!variant) return res.status(400).json({ success: false, message: `Invalid variant selected.` })
    if (variant.stock < item.qty) {
      return res.status(400).json({ success: false, message: `Only ${variant.stock} units of ${product.name} (${variant.weight}) available.` })
    }
    const kgNum = parseFloat(variant.weight)
    totalKg    += kgNum * item.qty
    const itemSubtotal = variant.price * item.qty
    subtotal   += itemSubtotal
    orderItems.push({ productId: product._id, variantId: variant._id, name: product.name, weight: variant.weight, price: variant.price, qty: item.qty, subtotal: itemSubtotal })
  }

  if (totalKg < MIN_ORDER_KG) {
    return res.status(400).json({ success: false, message: `Minimum order is ${MIN_ORDER_KG}kg. Your cart has ${totalKg.toFixed(1)}kg. Add ${(MIN_ORDER_KG - totalKg).toFixed(1)}kg more.` })
  }

  // Delivery fee
  let deliveryFee  = 0
  let deliveryZone = ''
  if (deliveryType === 'home') {
    if (!deliveryAddress?.pincode) return res.status(400).json({ success: false, message: 'Delivery address and pincode are required.' })
    const pin = await Pincode.findOne({ pincode: deliveryAddress.pincode, isActive: true })
    if (!pin) return res.status(400).json({ success: false, message: 'We do not deliver to this pincode. Please choose Farm Pickup.' })
    deliveryFee  = pin.deliveryFee
    deliveryZone = pin.zone
  }

  const packagingFee = packaging === 'gift' ? PACKAGING_FEE : 0

  // Coupon validation
  let couponDiscount = 0
  let couponDoc
  if (couponCode?.trim()) {
    couponDoc = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true })
    if (couponDoc) {
      if (couponDoc.expiresAt && couponDoc.expiresAt < new Date()) {
        return res.status(400).json({ success: false, message: 'Coupon has expired.' })
      }
      if (couponDoc.usedCount >= couponDoc.usageLimit) {
        return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' })
      }
      if (subtotal < couponDoc.minOrderAmount) {
        return res.status(400).json({ success: false, message: `Minimum order ₹${couponDoc.minOrderAmount} required for this coupon.` })
      }
      const usedCountByUser = couponDoc.usedBy.filter(id => String(id) === String(req.user._id)).length
      if (usedCountByUser >= Number(couponDoc.perUserLimit || 1)) {
        return res.status(400).json({ success: false, message: 'You have reached the per-user limit for this coupon.' })
      }
      if (couponDoc.type === 'percent') {
        couponDiscount = Math.round(subtotal * couponDoc.value / 100)
        if (couponDoc.maxDiscount) couponDiscount = Math.min(couponDiscount, couponDoc.maxDiscount)
      } else if (couponDoc.type === 'flat') {
        couponDiscount = Math.min(couponDoc.value, subtotal)
      } else if (couponDoc.type === 'delivery') {
        couponDiscount = deliveryFee
      }
    }
  }

  const total = Math.max(0, subtotal - couponDiscount + deliveryFee + packagingFee)

  const order = await Order.create({
    userId:       req.user._id,
    customer:     { name: req.user.name, phone: req.user.phone, email: req.user.email },
    deliveryType, deliveryAddress, pickupDate,
    items: orderItems, totalKg,
    packaging: packaging || 'standard', giftMessage, packagingFee,
    orderNotes, preferredDeliveryDate,
    subtotal, couponCode: couponCode?.trim().toUpperCase() || undefined,
    couponDiscount, deliveryFee, deliveryZone, total,
    paymentMethod,
    paymentScreenshot,
    paymentStatus: 'pending',
    status: 'New',
    statusHistory: [{ status: 'New', note: 'Order placed by customer' }]
  })

  // Decrease stock
  await decreaseStock(orderItems, order._id)

  // Update coupon usage
  if (couponDoc) {
    couponDoc.usedCount += 1
    couponDoc.usedBy.push(req.user._id)
    await couponDoc.save()
  }

  await notifyOrderPlaced(order)

  logger.info('Order created', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    userId: req.user?._id,
    total: order.total,
    paymentMethod: order.paymentMethod
  })

  res.status(201).json({ success: true, message: 'Order placed successfully!', order })
})

// GET /api/orders/my
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 })
  res.json({ success: true, orders })
})

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  res.json({ success: true, order })
})

// GET /api/orders/track/:num  (public)
export const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.num.toUpperCase() })
    .select('orderNumber status statusHistory customer.name deliveryType createdAt courierName courierTracking pickupDate')
  if (!order) return res.status(404).json({ success: false, message: 'Order not found. Check your order number.' })
  res.json({ success: true, order })
})

// GET /api/orders/track/:num/invoice (public)
export const trackOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.num.toUpperCase() })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  const pdfBuffer = await generateInvoicePDF(order)
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="MagiliniFarms-${order.orderNumber}.pdf"` })
  res.send(pdfBuffer)
})

// GET /api/orders/:id/invoice
export const downloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  const pdfBuffer = await generateInvoicePDF(order)
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="MagiliniFarms-${order.orderNumber}.pdf"` })
  res.send(pdfBuffer)
})

// ── ADMIN ENDPOINTS ───────────────────────────────────────

// GET /api/admin/orders
export const adminGetOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, deliveryType, search, customerName, phone, orderNumber, dateFrom, dateTo, page = 1, limit = 20, format } = req.query
  const query = {}
  if (status)       query.status       = normalizeStatus(status)
  if (paymentStatus) query.paymentStatus = paymentStatus
  if (deliveryType) query.deliveryType = deliveryType
  const searchTerm = search || customerName || phone || orderNumber
  if (searchTerm) {
    query.$or = [
      { orderNumber:      { $regex: searchTerm, $options: 'i' } },
      { 'customer.phone': { $regex: phone || searchTerm } },
      { 'customer.name':  { $regex: customerName || searchTerm, $options: 'i' } }
    ]
  }
  if (dateFrom || dateTo) {
    query.createdAt = {}
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo)   query.createdAt.$lte = new Date(dateTo)
  }
  if (String(format || '').toLowerCase() === 'csv') {
    const ordersForCsv = await Order.find(query).sort({ createdAt: -1 }).populate('userId', 'name phone email')
    const esc = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const rows = [
      ['Order Number', 'Customer', 'Phone', 'Products', 'Quantity', 'Total', 'Payment', 'Status', 'Delivery Type', 'Date']
    ]

    ordersForCsv.forEach((order) => {
      rows.push([
        order.orderNumber,
        order.customer?.name,
        order.customer?.phone,
        order.items.map((item) => `${item.name} (${item.weight})`).join(' | '),
        order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0),
        order.total,
        order.paymentStatus,
        order.status,
        order.deliveryType,
        order.createdAt?.toISOString() || ''
      ])
    })

    const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"')
    return res.send(csv)
  }

  const total  = await Order.countDocuments(query)
  const orders = await Order.find(query).sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).populate('userId', 'name phone email')
  res.json({ success: true, total, orders })
})

// GET /api/admin/orders/:id
export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('userId', 'name phone email savedAddress')
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  res.json({ success: true, order })
})

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, courierName, courierTracking } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })

  const prevStatus = order.status
  const nextStatus = normalizeStatus(status)

  if (!ALLOWED_ORDER_STATUSES.has(nextStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid order status.' })
  }

  if (nextStatus === 'Shipped' && (!courierName || !courierTracking)) {
    return res.status(400).json({ success: false, message: 'Courier name and tracking number are required for shipped orders.' })
  }

  if (nextStatus === 'Cancelled' && !String(note || '').trim()) {
    return res.status(400).json({ success: false, message: 'Cancellation reason is required.' })
  }

  if (prevStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Cancelled orders cannot be updated.' })
  }

  order.status = nextStatus
  appendStatusHistory(order, nextStatus, note || `Status updated to ${nextStatus}`, req.user)
  if (courierName)     order.courierName = courierName
  if (courierTracking) order.courierTracking = courierTracking
  if (note) order.internalNote = note

  if (nextStatus === 'Cancelled' && prevStatus !== 'Cancelled') {
    order.cancelledBy  = 'admin'
    order.cancelReason = note || 'Cancelled by admin'
    await order.save()
    await restoreStock(order.items, order._id)
  } else {
    await order.save()
  }

  await notifyStatusUpdate(order)
  res.json({ success: true, message: `Order status updated to ${nextStatus}.`, order })
})

// PATCH /api/admin/orders/:id/payment
export const updateOrderPayment = asyncHandler(async (req, res) => {
  const { utrNumber, note } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })

  if (order.paymentMethod !== 'direct-upi' || order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Payment confirmation is only available for pending Direct UPI orders.' })
  }

  order.paymentStatus = 'paid'
  order.utrNumber = utrNumber || order.utrNumber
  order.paymentConfirmedAt = new Date()
  order.paymentConfirmedBy = req.user._id
  if (note) order.internalNote = note
  appendStatusHistory(order, order.status, `Payment confirmed${utrNumber ? `, UTR: ${utrNumber}` : ''}`, req.user)
  await order.save()

  await PaymentTransaction.create({
    orderId: order._id,
    orderNumber: order.orderNumber,
    provider: 'direct-upi',
    providerPaymentId: order.utrNumber || undefined,
    amount: order.total,
    currency: 'INR',
    status: 'paid',
    utrNumber: order.utrNumber,
    source: 'admin-confirm',
    confirmedBy: req.user._id,
    confirmedAt: new Date(),
    metadata: { note }
  }).catch(() => null)

  res.json({ success: true, message: 'Payment confirmed.', order })
})

// GET /api/admin/orders/:id/invoice
export const adminDownloadInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  const pdfBuffer = await generateInvoicePDF(order)
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="MagiliniFarms-${order.orderNumber}.pdf"` })
  res.send(pdfBuffer)
})

// GET /api/admin/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todayOrders, totalOrders, revenueResult, totalCustomers, lowStockProducts, recentOrders] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    User.countDocuments({ role: 'customer' }),
    Product.find({ 'variants.stock': { $lte: 10 } }).populate('category', 'name slug emoji').sort({ updatedAt: -1 }).limit(20),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('userId', 'name phone email')
  ])

  res.json({
    success: true,
    stats: {
      todayOrders,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      totalCustomers,
      pendingOrders: await Order.countDocuments({ status: { $in: ['New', 'Confirmed', 'Packed'] } })
    },
    lowStockProducts,
    recentOrders
  })
})

