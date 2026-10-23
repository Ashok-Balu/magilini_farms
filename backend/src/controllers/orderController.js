import crypto from 'crypto'
import mongoose from 'mongoose'
import Order   from '../models/Order.js'
import Product from '../models/Product.js'
import User    from '../models/User.js'
import { Coupon, StockLog, Pincode, NotifyMe, PaymentAttempt, PaymentTransaction, BusinessHours } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { notifyOrderPlaced, notifyStatusUpdate, notifyLowStock } from '../services/notificationService.js'
import { generateInvoicePDF } from '../services/invoiceService.js'
import { logger } from '../utils/logger.js'
import { calculateDeliveryFee, getDeliveryByPincode } from '../services/deliveryService.js'
import { weightToKg } from '../utils/weight.js'
import { isDirectUpiAvailable } from '../utils/paymentPolicy.js'
import { reserveInventory, releaseInventory, mergeInventoryItems } from '../services/inventoryService.js'
import { processOrderRefund } from '../services/refundService.js'
import { confirmManualUpiPayment } from '../services/manualPaymentService.js'
import { releaseCouponRedemption } from '../services/couponService.js'
import { HttpError } from '../utils/httpError.js'

const PACKAGING_FEE = 50
const MIN_ORDER_KG  = Number(process.env.MIN_ORDER_KG || 3)
const FREE_DELIVERY_MIN = Number(process.env.FREE_DELIVERY_MIN || 0)
const RESERVATION_MINUTES = Number(process.env.PAYMENT_RESERVATION_MINUTES || 30)

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  if (value === 'Pickup Ready') return 'Pickup-Ready'
  return value
}
const dateBoundary = (value, endOfDay = false) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = endOfDay ? '23:59:59.999' : '00:00:00.000'
    return new Date(`${value}T${time}+05:30`)
  }
  return new Date(value)
}
const indiaDateString = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const ORDER_TRANSITIONS = {
  New: new Set(['Confirmed', 'Cancelled']),
  Confirmed: new Set(['Packed', 'Cancelled']),
  Packed: new Set(['Shipped', 'Pickup-Ready']),
  Shipped: new Set(['Delivered']),
  'Pickup-Ready': new Set(['Picked-Up']),
  Delivered: new Set(),
  'Picked-Up': new Set(),
  Cancelled: new Set()
}

const appendStatusHistory = (order, status, note, admin) => {
  order.statusHistory.push({
    status,
    note,
    adminId: admin?._id,
    adminName: admin?.name,
    time: new Date()
  })
}

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
  }
  return value
}

const getRequestHash = (body) => crypto.createHash('sha256').update(JSON.stringify(stableValue(body))).digest('hex')

const existingIdempotentOrder = async (userId, idempotencyKey, requestHash, session) => {
  const query = Order.findOne({ userId, idempotencyKey })
  if (session) query.session(session)
  const order = await query
  if (!order) return null
  if (order.requestHash !== requestHash) {
    const error = new Error('This idempotency key was already used for a different order request.')
    error.status = 409
    throw error
  }
  return order
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
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim()
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ success: false, message: 'A valid Idempotency-Key header is required.' })
  }
  if (!['razorpay-upi', 'razorpay-card', 'razorpay-nb', 'direct-upi', 'pay-at-farm'].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Invalid payment method.' })
  }
  if (paymentMethod === 'pay-at-farm' && deliveryType !== 'pickup') {
    return res.status(400).json({ success: false, message: 'Pay at farm is available only for farm pickup.' })
  }
  const requestHash = getRequestHash(req.body)
  const previousOrder = await existingIdempotentOrder(req.user._id, idempotencyKey, requestHash)
  if (previousOrder) {
    return res.status(200).json({ success: true, message: 'Order request already processed.', order: previousOrder })
  }

  const todayInIndia = indiaDateString()
  if (deliveryType === 'pickup') {
    if (!pickupDate || pickupDate < todayInIndia) {
      return res.status(400).json({ success: false, message: 'A valid current or future pickup date is required.' })
    }
    const pickupWeekday = new Date(`${pickupDate}T12:00:00Z`)
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
      .toLowerCase()
    const schedule = await BusinessHours.findOne({ day: pickupWeekday })
    if (!schedule?.isOpen) {
      return res.status(400).json({ success: false, message: 'Farm pickup is unavailable on the selected date.' })
    }
  }

  const requestedItems = new Map()
  for (const item of items) {
    const productId = String(item.productId || '')
    const variantId = String(item.variantId || '')
    const qty = Number(item.qty)
    if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId) || !Number.isSafeInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'Each order item must have valid product, variant and quantity values.' })
    }
    const key = `${productId}:${variantId}`
    const existing = requestedItems.get(key)
    const totalQty = qty + (existing?.qty || 0)
    if (!Number.isSafeInteger(totalQty) || totalQty > 10000) {
      return res.status(400).json({ success: false, message: 'Combined quantity for a product variant cannot exceed 10000.' })
    }
    requestedItems.set(key, { productId, variantId, qty: totalQty })
  }

  const orderItems = []
  let totalKg  = 0
  let subtotal = 0

  for (const item of requestedItems.values()) {
    const product = await Product.findById(item.productId)
    if (!product || !product.isActive) {
      return res.status(400).json({ success: false, message: `Product not available.` })
    }
    if (product.seasonalStatus !== 'available') {
      return res.status(400).json({ success: false, message: `${product.name} is currently out of season.` })
    }
    const variant = product.variants.id(item.variantId)
    if (!variant || !variant.isAvailable) return res.status(400).json({ success: false, message: `Invalid or unavailable variant selected.` })
    if (!Number.isFinite(variant.price) || variant.price <= 0
      || !Number.isSafeInteger(variant.stock) || variant.stock < 0) {
      throw new HttpError(422, `Product ${product.name} has invalid price or stock configuration.`)
    }
    if (variant.stock < item.qty) {
      return res.status(400).json({ success: false, message: `Only ${variant.stock} units of ${product.name} (${variant.weight}) available.` })
    }
    const kgNum = weightToKg(variant.weight)
    if (!Number.isFinite(kgNum) || kgNum <= 0) {
      throw new HttpError(422, `Product ${product.name} has an invalid weight configuration.`)
    }
    totalKg    += kgNum * item.qty
    const itemSubtotal = variant.price * item.qty
    subtotal   += itemSubtotal
    orderItems.push({ productId: product._id, variantId: variant._id, name: product.name, weight: variant.weight, price: variant.price, qty: item.qty, subtotal: itemSubtotal })
  }

  if (!Number.isFinite(totalKg) || !Number.isFinite(subtotal) || !Number.isSafeInteger(Math.round(subtotal * 100))) {
    throw new HttpError(422, 'Order quantities or prices exceed supported limits.')
  }

  if (totalKg < MIN_ORDER_KG) {
    return res.status(400).json({ success: false, message: `Minimum order is ${MIN_ORDER_KG}kg. Your cart has ${totalKg.toFixed(1)}kg. Add ${(MIN_ORDER_KG - totalKg).toFixed(1)}kg more.` })
  }

  // Delivery fee
  let deliveryFee  = 0
  let deliveryZone = ''
  if (deliveryType === 'home') {
    if (!deliveryAddress?.pincode) return res.status(400).json({ success: false, message: 'Delivery address and pincode are required.' })
    const delivery = await getDeliveryByPincode(deliveryAddress.pincode)
    if (!delivery.serviceable) {
      return res.status(400).json({ success: false, message: 'We do not deliver to this pincode. Please choose Farm Pickup.' })
    }
    deliveryFee  = calculateDeliveryFee(delivery.deliveryFee, subtotal, FREE_DELIVERY_MIN)
    deliveryZone = delivery.zone
  }

  const packagingFee = packaging === 'gift' ? PACKAGING_FEE : 0

  // Coupon validation
  let couponDiscount = 0
  let couponDoc
  if (couponCode?.trim()) {
    couponDoc = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true })
    if (!couponDoc) return res.status(400).json({ success: false, message: 'Coupon is invalid or inactive.' })
    const now = new Date()
    if (couponDoc.validFrom && couponDoc.validFrom > now) {
      return res.status(400).json({ success: false, message: 'Coupon is not active yet.' })
    }
    if (couponDoc.expiresAt && couponDoc.expiresAt <= now) {
      return res.status(400).json({ success: false, message: 'Coupon has expired.' })
    }
    if (couponDoc.usedCount >= couponDoc.usageLimit) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' })
    }
    if (subtotal < couponDoc.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order ₹${couponDoc.minOrderAmount} required for this coupon.` })
    }
    const usedCountByUser = (couponDoc.usedBy || []).filter(id => String(id) === String(req.user._id)).length
    if (usedCountByUser >= Number(couponDoc.perUserLimit || 1)) {
      return res.status(400).json({ success: false, message: 'You have reached the per-user limit for this coupon.' })
    }
    if (couponDoc.type === 'percent') {
      couponDiscount = Math.round(subtotal * couponDoc.value / 100)
      if (couponDoc.maxDiscount) couponDiscount = Math.min(couponDiscount, couponDoc.maxDiscount)
    } else if (couponDoc.type === 'flat') {
      couponDiscount = Math.min(couponDoc.value, subtotal)
    } else if (couponDoc.type === 'delivery') {
      couponDiscount = Math.min(deliveryFee, Number(couponDoc.value || 0))
    }
  }

  const total = Math.max(0, subtotal - couponDiscount + deliveryFee + packagingFee)
  if (!Number.isFinite(total) || !Number.isSafeInteger(Math.round(total * 100))) {
    throw new HttpError(422, 'Order total exceeds supported payment limits.')
  }

  if (paymentMethod === 'direct-upi' && !isDirectUpiAvailable(subtotal, process.env.UPI_ID)) {
    return res.status(400).json({ success: false, message: 'Direct UPI is available only for orders above ₹2,000 when the farm UPI ID is configured.' })
  }

  const session = await mongoose.startSession()
  let order
  let isReplay = false
  let lowStock = []
  try {
    await session.withTransaction(async () => {
      const duplicate = await existingIdempotentOrder(req.user._id, idempotencyKey, requestHash, session)
      if (duplicate) {
        order = duplicate
        isReplay = true
        return
      }

      const now = new Date()
      const reservationExpiry = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000)
      if (paymentMethod === 'pay-at-farm') {
        reservationExpiry.setTime(dateBoundary(pickupDate, true).getTime() + 24 * 60 * 60 * 1000)
      }
      order = new Order({
        userId: req.user._id,
        idempotencyKey,
        requestHash,
        customer: { name: req.user.name, phone: req.user.phone, email: req.user.email },
        deliveryType, deliveryAddress, pickupDate,
        items: orderItems, totalKg,
        packaging: packaging || 'standard', giftMessage, packagingFee,
        orderNotes, preferredDeliveryDate,
        subtotal, couponCode: couponCode?.trim().toUpperCase() || undefined,
        couponDiscount, deliveryFee, deliveryZone, total,
        paymentMethod,
        paymentScreenshot,
        paymentStatus: 'pending',
        inventoryStatus: 'reserved',
        inventoryExpiresAt: reservationExpiry,
        status: 'New',
        statusHistory: [{ status: 'New', note: 'Order placed by customer' }]
      })

      await order.save({ session })
      lowStock = await reserveInventory(orderItems, order._id, session)

      if (couponDoc) {
        const validCoupon = await Coupon.updateOne({
          _id: couponDoc._id,
          isActive: true,
          usedCount: { $lt: couponDoc.usageLimit },
          minOrderAmount: { $lte: subtotal },
          validFrom: { $lte: now },
          $and: [
            { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
            { $expr: { $lt: [
              { $size: { $filter: {
                input: { $ifNull: ['$usedBy', []] },
                as: 'userId',
                cond: { $eq: ['$$userId', req.user._id] }
              } } },
              Number(couponDoc.perUserLimit || 1)
            ] } }
          ]
        }, { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } }, { session })

        if (!validCoupon.modifiedCount) {
          const error = new Error('Coupon usage limit or eligibility changed. Please apply the coupon again.')
          error.status = 409
          throw error
        }
      }
    })
  } catch (err) {
    if (err?.code === 11000) {
      const duplicate = await existingIdempotentOrder(req.user._id, idempotencyKey, requestHash)
      if (duplicate) {
        return res.status(200).json({ success: true, message: 'Order request already processed.', order: duplicate })
      }
    }
    throw err
  } finally {
    await session.endSession()
  }

  if (!isReplay) {
    await Promise.all(lowStock.map(item => notifyLowStock(item.name, item.weight, item.stock)))
    await notifyOrderPlaced(order)
  }

  logger.info('Order created', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    userId: req.user?._id,
    total: order.total,
    paymentMethod: order.paymentMethod
  })

  res.status(isReplay ? 200 : 201).json({ success: true, message: 'Order placed successfully!', order })
})

// GET /api/orders/my
export const getMyOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1)
  const limit = Number(req.query.limit || 20)
  const query = { userId: req.user._id }
  const [total, orders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit)
  ])
  res.json({ success: true, total, page, orders })
})

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  res.json({ success: true, order })
})

// GET /api/orders/track/:num  (authenticated customer; order owner only)
export const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.num.toUpperCase(), userId: req.user._id })
    .select('orderNumber status statusHistory.status statusHistory.time deliveryType createdAt courierName courierTracking pickupDate')
  if (!order) return res.status(404).json({ success: false, message: 'Order not found. Check your order number.' })
  res.json({ success: true, order })
})

// GET /api/orders/track/:num/invoice
export const trackOrderInvoice = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.num.toUpperCase(), userId: req.user._id })
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

const cancelOrder = async ({ orderId, userId, admin, note }) => {
  const session = await mongoose.startSession()
  let order
  let refundRequired = false
  try {
    await session.withTransaction(async () => {
      const query = { _id: orderId }
      if (userId) query.userId = userId
      const current = await Order.findOne(query).session(session)
      if (!current) throw new HttpError(404, 'Order not found.')
      if (!ORDER_TRANSITIONS[current.status]?.has('Cancelled')) {
        throw new HttpError(409, 'This order can no longer be cancelled.')
      }
      if (!['reserved', 'committed', undefined].includes(current.inventoryStatus)) {
        throw new HttpError(409, 'Order inventory has already been released.')
      }

      const now = new Date()
      refundRequired = current.paymentStatus === 'paid'
        || (current.paymentMethod === 'direct-upi' && Boolean(current.utrNumber))
      const nextPaymentStatus = refundRequired ? 'refund_pending' : 'failed'
      order = await Order.findOneAndUpdate({
        _id: current._id,
        status: current.status,
        paymentStatus: current.paymentStatus,
        $or: [
          { inventoryStatus: current.inventoryStatus ?? null },
          { inventoryStatus: { $exists: false } }
        ]
      }, {
        $set: {
          status: 'Cancelled',
          paymentStatus: nextPaymentStatus,
          inventoryStatus: 'released',
          inventoryExpiresAt: null,
          refundRequired,
          cancelledBy: admin ? 'admin' : 'customer',
          cancelReason: note
        },
        $push: { statusHistory: {
          status: 'Cancelled', note, adminId: admin?._id, adminName: admin?.name, time: now
        } }
      }, { new: true, session })

      if (!order) throw new HttpError(409, 'Order changed while cancellation was being processed.')
      const inventoryItems = mergeInventoryItems(current.items)
      if (current.inventoryStatus !== 'released') {
        await releaseInventory(inventoryItems, current._id, session, 'cancellation')
      }
      if (current.couponCode) {
        await releaseCouponRedemption(current.couponCode, current.userId, session)
      }
      if (refundRequired && ['razorpay-upi', 'razorpay-card', 'razorpay-nb'].includes(current.paymentMethod)) {
        await PaymentTransaction.updateMany({
          orderId: current._id,
          provider: 'razorpay',
          status: 'paid',
          refundStatus: 'not_requested'
        }, { $set: { refundStatus: 'pending', refundType: 'full', refundRequestedAt: now } }, { session })
      }
    })
  } finally {
    await session.endSession()
  }

  if (refundRequired) await processOrderRefund(order._id)
  await notifyStatusUpdate(order)
  return order
}

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason || 'Cancelled by customer').trim().slice(0, 200)
  const order = await cancelOrder({ orderId: req.params.id, userId: req.user._id, note: reason })
  res.json({ success: true, message: order.paymentStatus === 'refund_pending' ? 'Order cancelled. Refund processing has started.' : 'Order cancelled.', order })
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
    if (dateFrom) query.createdAt.$gte = dateBoundary(dateFrom)
    if (dateTo)   query.createdAt.$lte = dateBoundary(dateTo, true)
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
  const order = await Order.findById(req.params.id).populate('userId', 'name phone email addresses')
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  const [paymentTransactions, paymentAttempts] = await Promise.all([
    PaymentTransaction.find({ orderId: order._id }).sort({ createdAt: -1 }),
    PaymentAttempt.find({ orderId: order._id }).sort({ attemptNumber: -1 })
  ])
  res.json({ success: true, order: { ...order.toObject(), paymentTransactions, paymentAttempts } })
})

// PATCH /api/admin/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note, courierName, courierTracking } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })

  const prevStatus = order.status
  const nextStatus = normalizeStatus(status)

  if (!Object.hasOwn(ORDER_TRANSITIONS, nextStatus)) return res.status(400).json({ success: false, message: 'Invalid order status.' })

  if (nextStatus === 'Shipped' && (!courierName || !courierTracking)) {
    return res.status(400).json({ success: false, message: 'Courier name and tracking number are required for shipped orders.' })
  }

  if (nextStatus === 'Cancelled') {
    if (!String(note || '').trim()) return res.status(400).json({ success: false, message: 'Cancellation reason is required.' })
    const cancelled = await cancelOrder({ orderId: order._id, admin: req.user, note: String(note).trim() })
    return res.json({ success: true, message: 'Order cancelled.', order: cancelled })
  }

  if (!ORDER_TRANSITIONS[prevStatus]?.has(nextStatus)) {
    return res.status(409).json({ success: false, message: `Cannot transition order from ${prevStatus} to ${nextStatus}.` })
  }
  if (nextStatus === 'Confirmed' && order.paymentMethod !== 'pay-at-farm' && order.paymentStatus !== 'paid') {
    return res.status(409).json({ success: false, message: 'Payment must be confirmed before the order can be confirmed.' })
  }

  const statusUpdates = {
      status: nextStatus,
      ...(courierName ? { courierName } : {}),
      ...(courierTracking ? { courierTracking } : {}),
      ...(note ? { internalNote: note } : {})
  }
  if (nextStatus === 'Confirmed') {
    statusUpdates.inventoryStatus = 'committed'
    statusUpdates.inventoryExpiresAt = null
  }
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: prevStatus }, {
    $set: statusUpdates,
    $push: { statusHistory: {
      status: nextStatus,
      note: note || `Status updated to ${nextStatus}`,
      adminId: req.user?._id,
      adminName: req.user?.name,
      time: new Date()
    } }
  }, { new: true })
  if (!updated) return res.status(409).json({ success: false, message: 'Order status changed; reload before updating.' })

  await notifyStatusUpdate(updated)
  res.json({ success: true, message: `Order status updated to ${nextStatus}.`, order: updated })
})

// PATCH /api/admin/orders/:id/payment
export const updateOrderPayment = asyncHandler(async (req, res) => {
  const { utrNumber, note } = req.body
  const existing = await Order.findById(req.params.id)
  if (!existing) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (!['direct-upi', 'pay-at-farm'].includes(existing.paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Only manual payment methods can be confirmed here.' })
  }
  const order = await confirmManualUpiPayment({
    orderId: req.params.id,
    admin: req.user,
    upiRef: utrNumber,
    note,
    paymentMethod: existing.paymentMethod
  })
  await notifyStatusUpdate(order)
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
  const today = dateBoundary(indiaDateString())

  const [todayOrders, totalOrders, revenueResult, todayRevenueResult, totalCustomers, lowStockProducts, recentOrders] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: today } }),
    Order.countDocuments(),
    Order.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    User.countDocuments({ role: 'customer' }),
    Product.find({ 'variants.stock': { $lte: 10 } }).populate('category', 'name slug emoji').sort({ updatedAt: -1 }).limit(20),
    Order.find().sort({ createdAt: -1 }).limit(8).populate('userId', 'name phone email')
  ])

  res.json({
    success: true,
    stats: {
      todayOrders,
      todayRevenue: todayRevenueResult[0]?.total || 0,
      totalOrders,
      totalRevenue: revenueResult[0]?.total || 0,
      totalCustomers,
      pendingOrders: await Order.countDocuments({ status: { $in: ['New', 'Confirmed', 'Packed'] } })
    },
    lowStockProducts,
    recentOrders
  })
})
