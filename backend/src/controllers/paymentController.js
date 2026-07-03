import Razorpay from 'razorpay'
import crypto   from 'crypto'
import Order    from '../models/Order.js'
import { PaymentTransaction, PaymentWebhookEvent } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { notifyOrderPlaced, notifyStatusUpdate } from '../services/notificationService.js'
import { logger } from '../utils/logger.js'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

// POST /api/payment/create-order
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body
  const order = await Order.findOne({ _id: orderId, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Already paid.' })

  const rzpOrder = await razorpay.orders.create({
    amount:   order.total * 100, // paise
    currency: 'INR',
    receipt:  order.orderNumber,
    notes:    { orderNumber: order.orderNumber, customer: order.customer.phone }
  })

  order.razorpayOrderId = rzpOrder.id
  await order.save()

  res.json({
    success: true,
    razorpayOrderId: rzpOrder.id,
    amount:          rzpOrder.amount,
    currency:        rzpOrder.currency,
    keyId:           process.env.RAZORPAY_KEY_ID,
    customer:        order.customer
  })
})

// POST /api/payment/verify
export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ success: false, message: 'Incomplete payment payload.' })
  }

  // Verify signature
  const body      = razorpay_order_id + '|' + razorpay_payment_id
  const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex')
  const isValid   = expected === razorpay_signature

  if (!isValid) return res.status(400).json({ success: false, message: 'Invalid payment signature. Please contact support.' })

  const order = await Order.findOne({ _id: orderId, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (order.paymentStatus === 'paid') {
    return res.json({ success: true, message: 'Payment already verified.', orderNumber: order.orderNumber })
  }
  if (order.razorpayOrderId !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: 'Order mismatch during payment verification.' })
  }

  order.razorpayPaymentId = razorpay_payment_id
  order.razorpaySignature = razorpay_signature
  order.paymentStatus     = 'paid'
  order.status            = 'Confirmed'
  order.statusHistory.push({ status: 'Confirmed', note: 'Payment verified via Razorpay' })
  await order.save()

  await PaymentTransaction.findOneAndUpdate(
    {
      orderId: order._id,
      provider: 'razorpay',
      providerPaymentId: razorpay_payment_id
    },
    {
      $setOnInsert: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider: 'razorpay',
        providerPaymentId: razorpay_payment_id,
        providerOrderId: razorpay_order_id,
        amount: order.total,
        currency: 'INR',
        status: 'paid',
        source: 'verify-endpoint',
        confirmedAt: new Date(),
        metadata: { userId: req.user._id }
      }
    },
    { upsert: true, new: true }
  )

  await notifyStatusUpdate(order)

  logger.info('Payment verified', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    source: 'verify-endpoint'
  })

  res.json({ success: true, message: 'Payment verified. Order confirmed!', orderNumber: order.orderNumber })
})

// POST /api/payment/webhook  (Razorpay calls this)
export const paymentWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const body      = JSON.stringify(req.body)
  const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex')

  if (expected !== signature) return res.status(400).json({ success: false })

  const { event, payload } = req.body
  const paymentEntity = payload?.payment?.entity
  const eventId = String(req.body?.event_id || paymentEntity?.id || `${event}:${paymentEntity?.order_id || 'unknown'}`)

  try {
    await PaymentWebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: event,
      paymentId: paymentEntity?.id,
      payloadHash: crypto.createHash('sha1').update(body).digest('hex')
    })
  } catch (err) {
    if (err?.code === 11000) {
      return res.json({ success: true, duplicate: true })
    }
    throw err
  }

  if (event === 'payment.captured') {
    const payment = payload.payment.entity
    const order   = await Order.findOne({ razorpayOrderId: payment.order_id })
    if (!order) return res.json({ success: true, ignored: true, reason: 'order_not_found' })
    if (order.paymentStatus === 'paid') return res.json({ success: true, duplicate: true })

    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus     = 'paid'
      order.razorpayPaymentId = payment.id
      order.status            = 'Confirmed'
      order.statusHistory.push({ status: 'Confirmed', note: 'Payment captured via webhook' })
      await order.save()

      await PaymentTransaction.findOneAndUpdate(
        {
          orderId: order._id,
          provider: 'razorpay',
          providerPaymentId: payment.id
        },
        {
          $setOnInsert: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            provider: 'razorpay',
            providerPaymentId: payment.id,
            providerOrderId: payment.order_id,
            amount: order.total,
            currency: payment.currency || 'INR',
            status: 'paid',
            source: 'webhook',
            confirmedAt: new Date(),
            metadata: { event }
          }
        },
        { upsert: true, new: true }
      )

      await notifyStatusUpdate(order)

      logger.info('Payment webhook processed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentId: payment.id,
        source: 'webhook'
      })
    }
  }
  res.json({ success: true })
})

// POST /api/payment/confirm-upi  (admin confirms direct UPI payment)
export const confirmDirectUPI = asyncHandler(async (req, res) => {
  const { orderId, upiRef } = req.body
  const order = await Order.findById(orderId)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })

  if (order.paymentMethod !== 'direct-upi') {
    return res.status(400).json({ success: false, message: 'Only Direct UPI orders can be confirmed from this endpoint.' })
  }
  if (order.paymentStatus === 'paid') {
    return res.status(400).json({ success: false, message: 'Payment is already confirmed for this order.' })
  }

  order.paymentStatus     = 'paid'
  order.utrNumber         = upiRef || order.utrNumber
  order.razorpayPaymentId = upiRef || `UPI-DIRECT-${order.orderNumber}`
  order.status            = 'Confirmed'
  order.statusHistory.push({ status: 'Confirmed', note: `Direct UPI payment confirmed. Ref: ${upiRef}` })
  await order.save()

  await PaymentTransaction.findOneAndUpdate(
    {
      orderId: order._id,
      provider: 'direct-upi',
      providerPaymentId: order.utrNumber || undefined
    },
    {
      $setOnInsert: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider: 'direct-upi',
        providerPaymentId: order.utrNumber || undefined,
        amount: order.total,
        currency: 'INR',
        status: 'paid',
        utrNumber: order.utrNumber,
        source: 'admin-confirm',
        confirmedAt: new Date(),
        metadata: { endpoint: 'confirm-upi' }
      }
    },
    { upsert: true, new: true }
  )

  await notifyOrderPlaced(order)
  await notifyStatusUpdate(order)
  res.json({ success: true, message: 'UPI payment confirmed. Order is now confirmed.' })
})
