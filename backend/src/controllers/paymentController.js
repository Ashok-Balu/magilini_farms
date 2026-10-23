import crypto   from 'crypto'
import mongoose from 'mongoose'
import Order    from '../models/Order.js'
import { PaymentAttempt, PaymentTransaction, PaymentWebhookEvent } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { notifyOrderPlaced, notifyStatusUpdate } from '../services/notificationService.js'
import { logger } from '../utils/logger.js'
import { createGatewayOrder, fetchGatewayPayment, isDefinitiveGatewayRejection, verifyPaymentSignature, verifyWebhookSignature } from '../services/razorpayService.js'
import { releaseInventory } from '../services/inventoryService.js'
import { confirmManualRefund, processOrderRefund, recordRefundWebhook, reconcileGatewayRefund } from '../services/refundService.js'
import { confirmManualUpiPayment } from '../services/manualPaymentService.js'
import { HttpError } from '../utils/httpError.js'

const PAYMENT_RESERVATION_MINUTES = Number(process.env.PAYMENT_RESERVATION_MINUTES || 30)

const ensureReservationActive = (order) => {
  if (order.status !== 'New' || order.paymentStatus !== 'pending' || order.inventoryStatus !== 'reserved') {
    throw new HttpError(409, 'This order is no longer awaiting payment.')
  }
  if (order.inventoryExpiresAt && order.inventoryExpiresAt <= new Date()) {
    throw new HttpError(409, 'The payment reservation expired. Please create a new order.')
  }
}

const paymentMatchesOrder = (payment, order, attempt) =>
  payment.order_id === attempt.providerOrderId
  && payment.amount === attempt.amountMinor
  && payment.currency === attempt.currency
  && payment.status === 'captured'
  && payment.amount === Math.round(Number(order.total) * 100)
  && payment.currency === 'INR'

const applyCapturedPayment = async ({ attemptId, payment, source, signature }) => {
  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      const attempt = await PaymentAttempt.findById(attemptId).session(session)
      if (!attempt || attempt.providerOrderId !== payment.order_id) {
        throw new HttpError(409, 'Payment does not match a stored gateway order.')
      }
      const order = await Order.findById(attempt.orderId).session(session)
      if (!order) throw new HttpError(404, 'Order not found for this payment.')
      if (!paymentMatchesOrder(payment, order, attempt)) {
        throw new HttpError(409, 'Captured payment amount, currency, status or gateway order does not match the order.')
      }

      const existingPayment = await PaymentTransaction.findOne({
        provider: 'razorpay', providerPaymentId: payment.id
      }).session(session)
      if (existingPayment) {
        if (String(existingPayment.orderId) !== String(order._id)
          || existingPayment.providerOrderId !== payment.order_id) {
          throw new HttpError(409, 'Razorpay payment ID is already associated with a different order.')
        }
        result = { order, transaction: existingPayment, duplicate: true, refundRequired: existingPayment.refundStatus === 'pending' }
        return
      }

      await PaymentAttempt.updateOne({ _id: attempt._id }, {
        $set: { status: 'captured' },
        $addToSet: { paymentIds: payment.id },
        $push: { paymentEvents: { paymentId: payment.id, status: 'captured', occurredAt: new Date() } }
      }, { session })
      const now = new Date()
      let refundRequired = false
      let refundType = 'full'

      if (order.paymentStatus === 'pending' && order.status === 'New' && order.inventoryStatus === 'reserved'
        && (!order.inventoryExpiresAt || order.inventoryExpiresAt > now)) {
        const updated = await Order.findOneAndUpdate({
          _id: order._id,
          status: 'New',
          paymentStatus: 'pending',
          inventoryStatus: 'reserved',
          $or: [{ inventoryExpiresAt: null }, { inventoryExpiresAt: { $gt: now } }]
        }, {
          $set: {
            paymentStatus: 'paid',
            status: 'Confirmed',
            inventoryStatus: 'committed',
            refundRequired: false,
            razorpayPaymentId: payment.id,
            ...(signature ? { razorpaySignature: signature } : {})
          },
          $push: { statusHistory: { status: 'Confirmed', note: `Payment captured via ${source}`, time: now } }
        }, { new: true, session })

        if (updated) {
          result = { order: updated, refundRequired: false, duplicate: false }
        } else {
          refundRequired = true
        }
      } else {
        refundRequired = true
        refundType = order.paymentStatus === 'paid' ? 'duplicate' : 'full'
      }

      if (refundRequired) {
        const latestOrder = await Order.findById(order._id).session(session)
        if (latestOrder.paymentStatus === 'pending' && latestOrder.inventoryStatus === 'reserved') {
          const expiredOrder = await Order.findOneAndUpdate({
            _id: latestOrder._id,
            status: 'New', paymentStatus: 'pending', inventoryStatus: 'reserved'
          }, {
            $set: { status: 'Cancelled', paymentStatus: 'refund_pending', inventoryStatus: 'released', refundRequired: true, cancelledBy: 'system', cancelReason: 'Payment captured after inventory reservation expired' },
            $push: { statusHistory: { status: 'Cancelled', note: 'Payment captured after reservation expiry; refund required', time: now } }
          }, { new: true, session })
          if (expiredOrder) await releaseInventory(expiredOrder.items, expiredOrder._id, session, 'cancellation')
        } else if (latestOrder.paymentStatus !== 'paid') {
          await Order.updateOne({ _id: latestOrder._id }, {
            $set: { paymentStatus: 'refund_pending', refundRequired: true },
            $push: { statusHistory: { status: latestOrder.status, note: 'Late payment captured; refund required', time: now } }
          }, { session })
        } else {
          await Order.updateOne({ _id: latestOrder._id }, { $set: { refundRequired: true } }, { session })
        }
      }

      const transaction = (await PaymentTransaction.create([{
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider: 'razorpay',
        providerPaymentId: payment.id,
        providerOrderId: payment.order_id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: 'paid',
        refundStatus: refundRequired ? 'pending' : 'not_requested',
        refundType: refundRequired ? refundType : undefined,
        source,
        confirmedAt: now,
        metadata: { signatureVerified: Boolean(signature) }
      }], { session }))[0]

      result = { ...(result || {}), order: result?.order || await Order.findById(order._id).session(session), transaction, duplicate: false, refundRequired }
    })
  } finally {
    await session.endSession()
  }
  return result
}

const handleUnmatchedCapturedPayment = async ({ attemptId, payment, source }) => {
  if (payment.status !== 'captured') throw new HttpError(409, 'Payment has not been captured.')
  const session = await mongoose.startSession()
  let result
  try {
    await session.withTransaction(async () => {
      const attempt = await PaymentAttempt.findById(attemptId).session(session)
      if (!attempt || attempt.providerOrderId !== payment.order_id) {
        throw new HttpError(409, 'Captured payment does not match a stored Razorpay order.')
      }
      const order = await Order.findById(attempt.orderId).session(session)
      if (!order) throw new HttpError(404, 'Order not found for captured payment.')

      const existing = await PaymentTransaction.findOne({ provider: 'razorpay', providerPaymentId: payment.id }).session(session)
      if (existing) {
        if (String(existing.orderId) !== String(order._id) || existing.providerOrderId !== payment.order_id) {
          throw new HttpError(409, 'Razorpay payment ID is already associated with a different order.')
        }
        result = { order, transaction: existing, duplicate: true }
        return
      }

      const now = new Date()
      const refundType = order.paymentStatus === 'paid' ? 'duplicate' : 'full'
      const shouldRelease = order.inventoryStatus === 'reserved' && order.status === 'New'
      if (shouldRelease) {
        const cancelled = await Order.findOneAndUpdate({
          _id: order._id,
          status: 'New',
          paymentStatus: 'pending',
          inventoryStatus: 'reserved'
        }, {
          $set: {
            status: 'Cancelled',
            paymentStatus: 'refund_pending',
            inventoryStatus: 'released',
            inventoryExpiresAt: null,
            refundRequired: true,
            cancelledBy: 'system',
            cancelReason: 'Captured payment did not match the order total or currency'
          },
          $push: { statusHistory: { status: 'Cancelled', note: 'Captured payment mismatch; refund required', time: now } }
        }, { new: true, session })
        if (!cancelled) throw new HttpError(409, 'Order state changed while reconciling the captured payment.')
        await releaseInventory(cancelled.items, cancelled._id, session, 'cancellation')
      } else if (order.paymentStatus !== 'paid') {
        await Order.updateOne({ _id: order._id }, {
          $set: { paymentStatus: 'refund_pending', refundRequired: true },
          $push: { statusHistory: { status: order.status, note: 'Captured payment mismatch; refund required', time: now } }
        }, { session })
      } else {
        await Order.updateOne({ _id: order._id }, { $set: { refundRequired: true } }, { session })
      }

      await PaymentAttempt.updateOne({ _id: attempt._id }, {
        $addToSet: { paymentIds: payment.id },
        $push: { paymentEvents: { paymentId: payment.id, status: 'captured-mismatch', occurredAt: now } }
      }, { session })

      const transaction = (await PaymentTransaction.create([{
        orderId: order._id,
        orderNumber: order.orderNumber,
        provider: 'razorpay',
        providerPaymentId: payment.id,
        providerOrderId: payment.order_id,
        amount: Number(payment.amount) / 100,
        currency: payment.currency || 'UNKNOWN',
        status: 'paid',
        refundStatus: 'pending',
        refundType,
        source,
        confirmedAt: now,
        metadata: { reconciliationRequired: true, expectedAmountMinor: attempt.amountMinor, expectedCurrency: attempt.currency }
      }], { session }))[0]
      result = { order: await Order.findById(order._id).session(session), transaction, duplicate: false }
    })
  } finally {
    await session.endSession()
  }
  return result
}

export const getPaymentOptions = (_req, res) => {
  const upiId = String(process.env.UPI_ID || '').trim()
  res.json({
    success: true,
    directUpi: {
      enabled: Boolean(upiId),
      upiId,
      upiName: String(process.env.UPI_NAME || 'Magilini Farms').trim()
    }
  })
}

export const submitDirectUpiReference = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.body.orderId, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (order.paymentMethod !== 'direct-upi') {
    return res.status(400).json({ success: false, message: 'This order does not use Direct UPI.' })
  }
  const upiRef = String(req.body?.upiRef ?? '').trim()
  if (order.utrNumber) {
    if (order.utrNumber === upiRef) {
      return res.json({ success: true, message: 'UPI reference already submitted.' })
    }
    return res.status(409).json({ success: false, message: 'A UPI reference has already been submitted for this order.' })
  }
  if (order.status !== 'New' || order.paymentStatus !== 'pending' || order.inventoryStatus !== 'reserved') {
    return res.status(409).json({ success: false, message: 'This order is no longer awaiting UPI payment.' })
  }
  if (order.inventoryExpiresAt && order.inventoryExpiresAt <= new Date()) {
    return res.status(409).json({ success: false, message: 'The payment reservation expired. Please contact support.' })
  }
  if (!/^[a-zA-Z0-9-]{6,50}$/.test(upiRef)) {
    return res.status(400).json({ success: false, message: 'Enter a valid UPI reference of 6–50 letters or numbers.' })
  }
  if (!process.env.UPI_ID) {
    return res.status(503).json({ success: false, message: 'Direct UPI is not configured.' })
  }

  const updatedOrder = await Order.findOneAndUpdate({
    _id: order._id,
    userId: req.user._id,
    paymentMethod: 'direct-upi',
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: { $gt: new Date() },
    $or: [
      { utrNumber: { $exists: false } },
      { utrNumber: null },
      { utrNumber: '' }
    ]
  }, {
    $set: { utrNumber: upiRef },
    $push: { statusHistory: { status: 'New', note: 'Customer submitted UPI reference for verification', time: new Date() } }
  }, { new: true })
  if (!updatedOrder) {
    const latestOrder = await Order.findOne({ _id: order._id, userId: req.user._id })
    if (latestOrder?.utrNumber === upiRef) {
      return res.json({ success: true, message: 'UPI reference already submitted.' })
    }
    return res.status(409).json({ success: false, message: 'Payment state changed. Refresh the order and try again.' })
  }

  res.json({ success: true, message: 'UPI reference submitted. Payment is pending farm verification.' })
})

// POST /api/payment/create-order
export const createPaymentOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.body
  const idempotencyKey = String(req.get('Idempotency-Key') || '').trim()
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return res.status(400).json({ success: false, message: 'A valid Idempotency-Key header is required.' })
  }
  const order = await Order.findOne({ _id: orderId, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (!['razorpay-upi', 'razorpay-card', 'razorpay-nb'].includes(order.paymentMethod)) {
    return res.status(400).json({ success: false, message: 'This order does not use Razorpay.' })
  }
  ensureReservationActive(order)

  const amountMinor = Math.round(Number(order.total) * 100)
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 100) {
    throw new HttpError(400, 'Order amount is invalid for Razorpay.')
  }

  let attempt = await PaymentAttempt.findOne({ orderId: order._id, idempotencyKey })
  if (attempt?.status === 'created') {
    if (attempt.amountMinor !== amountMinor || attempt.currency !== 'INR') {
      throw new HttpError(409, 'The stored Razorpay order no longer matches this order total.')
    }
    return res.json({
      success: true,
      razorpayOrderId: attempt.providerOrderId,
      amount: attempt.amountMinor,
      currency: attempt.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      customer: order.customer
    })
  }
  if (attempt?.status === 'creating' || attempt?.status === 'unknown') {
    throw new HttpError(409, 'Payment order creation is being reconciled. Please refresh the order before retrying.')
  }

  const activeAttempt = await PaymentAttempt.findOne({
    orderId: order._id,
    status: { $in: ['creating', 'created', 'unknown'] }
  }).sort({ attemptNumber: -1 })
  if (activeAttempt) {
    if (activeAttempt.status === 'created'
      && activeAttempt.amountMinor === amountMinor
      && activeAttempt.currency === 'INR') {
      return res.json({
        success: true,
        razorpayOrderId: activeAttempt.providerOrderId,
        amount: activeAttempt.amountMinor,
        currency: activeAttempt.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        customer: order.customer
      })
    }
    throw new HttpError(409, 'A previous payment attempt is still being reconciled. Please refresh the order before retrying.')
  }

  if (!attempt) {
    const sequencedOrder = await Order.findOneAndUpdate({
      _id: order._id,
      userId: req.user._id,
      status: 'New',
      paymentStatus: 'pending',
      inventoryStatus: 'reserved',
      inventoryExpiresAt: { $gt: new Date() }
    }, { $inc: { paymentAttemptSequence: 1 } }, { new: true })
    if (!sequencedOrder) throw new HttpError(409, 'Order is no longer eligible for payment.')
    try {
      attempt = await PaymentAttempt.create({
        orderId: order._id,
        idempotencyKey,
        attemptNumber: sequencedOrder.paymentAttemptSequence,
        amountMinor,
        currency: 'INR',
        status: 'creating'
      })
    } catch (err) {
      if (err?.code !== 11000) throw err
      attempt = await PaymentAttempt.findOne({ orderId: order._id, idempotencyKey })
      if (!attempt) throw err
      if (attempt.status === 'created') {
        return res.json({ success: true, razorpayOrderId: attempt.providerOrderId, amount: attempt.amountMinor, currency: attempt.currency, keyId: process.env.RAZORPAY_KEY_ID, customer: order.customer })
      }
      throw new HttpError(409, 'Payment order creation is already in progress.')
    }
  } else {
    attempt.status = 'creating'
    attempt.failureMessage = undefined
    await attempt.save()
  }

  let rzpOrder
  try {
    rzpOrder = await createGatewayOrder({
      amount: amountMinor,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderNumber: order.orderNumber, customer: order.customer.phone }
    })
  } catch (err) {
    const definitiveRejection = isDefinitiveGatewayRejection(err)
    attempt.status = definitiveRejection ? 'failed' : 'unknown'
    attempt.failureMessage = err?.message || 'Razorpay order creation failed.'
    await attempt.save()
    logger.error('Razorpay order creation failed', {
      orderId: order._id,
      attemptId: attempt._id,
      outcome: attempt.status,
      error: attempt.failureMessage
    })
    throw new HttpError(503, definitiveRejection
      ? 'Razorpay rejected the payment session. Please retry from your order.'
      : 'Razorpay did not confirm whether the payment session was created. Do not retry yet; the attempt requires reconciliation.')
  }

  if (!rzpOrder?.id || rzpOrder.amount !== amountMinor || rzpOrder.currency !== 'INR') {
    attempt.status = 'unknown'
    attempt.providerOrderId = rzpOrder?.id
    attempt.failureMessage = 'Razorpay returned an order that does not match the expected amount and currency.'
    await attempt.save()
    logger.error('Razorpay order response did not match the requested payment session', {
      orderId: order._id,
      attemptId: attempt._id,
      providerOrderId: rzpOrder?.id,
      expectedAmountMinor: amountMinor,
      returnedAmountMinor: rzpOrder?.amount,
      returnedCurrency: rzpOrder?.currency
    })
    throw new HttpError(503, 'Razorpay returned an unmatched payment session. This attempt requires reconciliation before retrying.')
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      const current = await Order.findOneAndUpdate({
        _id: order._id,
        userId: req.user._id,
        status: 'New',
        paymentStatus: 'pending',
        inventoryStatus: 'reserved',
        total: order.total,
        inventoryExpiresAt: { $gt: new Date() }
      }, { $set: { razorpayOrderId: rzpOrder.id } }, { new: true, session })
      if (!current) throw new HttpError(409, 'Order changed while creating the payment session.')
      await PaymentAttempt.updateOne({ _id: attempt._id, status: 'creating' }, {
        $set: { providerOrderId: rzpOrder.id, status: 'created', amountMinor, currency: 'INR' }
      }, { session })
    })
  } catch (err) {
    await PaymentAttempt.updateOne({ _id: attempt._id, status: 'creating' }, {
      $set: {
        status: 'unknown',
        providerOrderId: rzpOrder.id,
        amountMinor,
        currency: 'INR',
        failureMessage: `Razorpay order ${rzpOrder.id} was created but could not be fully recorded: ${err.message}`
      }
    })
    logger.error('Razorpay order was created but database reconciliation failed', {
      orderId: order._id,
      attemptId: attempt._id,
      providerOrderId: rzpOrder.id,
      error: err.message
    })
    throw err
  } finally {
    await session.endSession()
  }

  res.json({
    success: true,
    razorpayOrderId: rzpOrder.id,
    amount:          amountMinor,
    currency:        'INR',
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
  const isValid = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
    secret: process.env.RAZORPAY_KEY_SECRET
  })

  if (!isValid) return res.status(400).json({ success: false, message: 'Invalid payment signature. Please contact support.' })

  const order = await Order.findOne({ _id: orderId, userId: req.user._id })
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  const attempt = await PaymentAttempt.findOne({ orderId: order._id, providerOrderId: razorpay_order_id })
  if (!attempt) {
    return res.status(400).json({ success: false, message: 'Order mismatch during payment verification.' })
  }

  let gatewayPayment
  try {
    gatewayPayment = await fetchGatewayPayment(razorpay_payment_id)
  } catch (err) {
    logger.error('Razorpay payment lookup failed', { orderId: order._id, paymentId: razorpay_payment_id, error: err.message })
    throw new HttpError(503, 'Payment status could not be confirmed with Razorpay. Please check your order again shortly.')
  }

  if (!paymentMatchesOrder(gatewayPayment, order, attempt)) {
    if (gatewayPayment?.status === 'captured' && gatewayPayment.order_id === attempt.providerOrderId) {
      const unmatched = await handleUnmatchedCapturedPayment({ attemptId: attempt._id, payment: gatewayPayment, source: 'verify-endpoint' })
      if (!unmatched.duplicate) await processOrderRefund(unmatched.order._id)
    }
    throw new HttpError(409, 'Razorpay payment is not captured for the expected order amount and currency.')
  }

  const result = await applyCapturedPayment({ attemptId: attempt._id, payment: gatewayPayment, source: 'verify-endpoint', signature: razorpay_signature })
  if (result.refundRequired) await processOrderRefund(result.order._id)
  if (!result.duplicate && !result.refundRequired) await notifyStatusUpdate(result.order)

  logger.info('Payment verified', {
    orderId: result.order._id,
    orderNumber: result.order.orderNumber,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    source: 'verify-endpoint'
  })

  res.json({
    success: true,
    message: result.refundRequired ? 'Payment was received after the order could be fulfilled. A refund is being processed.' : 'Payment verified. Order confirmed!',
    orderNumber: result.order.orderNumber,
    paymentStatus: result.order.paymentStatus
  })
})

// POST /api/payment/webhook  (Razorpay calls this)
export const paymentWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const rawBody = req.rawBody
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new HttpError(503, 'Razorpay webhook secret is not configured.')
  }
  if (!verifyWebhookSignature({ rawBody, signature, secret: process.env.RAZORPAY_WEBHOOK_SECRET })) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' })
  }

  const { event, payload } = req.body
  if (typeof event !== 'string' || !payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid webhook event payload.' })
  }
  const paymentEntity = payload?.payment?.entity
  const refundEntity = payload?.refund?.entity
  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex')
  const eventId = String(req.headers['x-razorpay-event-id'] || payloadHash)
  const now = new Date()
  let webhookEvent
  try {
    webhookEvent = await PaymentWebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: event,
      paymentId: paymentEntity?.id,
      providerOrderId: paymentEntity?.order_id,
      paymentAmountMinor: paymentEntity?.amount,
      paymentCurrency: paymentEntity?.currency,
      gatewayPaymentStatus: paymentEntity?.status,
      payloadHash,
      status: 'processing',
      processingLeaseUntil: new Date(now.getTime() + 60_000)
    })
  } catch (err) {
    if (err?.code === 11000) {
      webhookEvent = await PaymentWebhookEvent.findOne({ eventId })
      if (!webhookEvent) {
        return res.status(503).json({ success: false, message: 'Webhook event could not be loaded for deduplication.' })
      }
      if (webhookEvent.payloadHash !== payloadHash || webhookEvent.eventType !== event) {
        logger.error('Razorpay webhook event ID was reused with a different payload', { eventId, eventType: event })
        return res.status(409).json({ success: false, message: 'Webhook event ID conflicts with a previously received event.' })
      }
      if (webhookEvent?.status === 'processed') return res.json({ success: true, duplicate: true })
      if (webhookEvent?.status === 'processing' && webhookEvent.processingLeaseUntil > now) {
        return res.status(503).json({ success: false, message: 'Webhook event is already being processed.' })
      }
      webhookEvent = await PaymentWebhookEvent.findOneAndUpdate({
        _id: webhookEvent?._id,
        $or: [
          { status: { $in: ['pending', 'failed'] } },
          { status: 'processing', processingLeaseUntil: { $lte: now } }
        ]
      }, { $set: { status: 'processing', processingLeaseUntil: new Date(now.getTime() + 60_000) } }, { new: true })
      if (!webhookEvent) return res.status(503).json({ success: false, message: 'Webhook event could not be claimed.' })
    } else {
      throw err
    }
  }

  try {
    if (event === 'payment.captured') {
      const payment = paymentEntity
      const attempt = payment && await PaymentAttempt.findOne({ providerOrderId: payment.order_id })
      if (!attempt) {
        logger.error('Captured Razorpay payment has no matching stored payment attempt', {
          eventId,
          paymentId: payment?.id,
          providerOrderId: payment?.order_id
        })
        throw new HttpError(503, 'Captured payment has no matching stored attempt and requires reconciliation.')
      }
      const order = await Order.findById(attempt.orderId)
      if (!order) {
        throw new HttpError(503, 'Captured payment order is unavailable and requires reconciliation.')
      }
      await PaymentWebhookEvent.updateOne({ _id: webhookEvent._id }, { $set: { orderId: order._id } })
      if (!paymentMatchesOrder(payment, order, attempt)) {
        if (payment.status !== 'captured' || payment.order_id !== attempt.providerOrderId) {
          throw new HttpError(409, 'Webhook payment does not match expected amount, currency, status or gateway order.')
        }
        const unmatched = await handleUnmatchedCapturedPayment({ attemptId: attempt._id, payment, source: 'webhook' })
        if (!unmatched.duplicate) await processOrderRefund(unmatched.order._id)
      } else {
        const result = await applyCapturedPayment({ attemptId: attempt._id, payment, source: 'webhook' })
        if (result.refundRequired) await processOrderRefund(result.order._id)
        else if (!result.duplicate) await notifyStatusUpdate(result.order)
        logger.info('Payment webhook processed', { orderId: result.order._id, paymentId: payment.id })
      }
    } else if (event === 'payment.failed') {
      if (paymentEntity?.id && paymentEntity?.order_id) {
        await PaymentAttempt.updateOne({ providerOrderId: paymentEntity.order_id }, {
          $addToSet: { paymentIds: paymentEntity.id },
          $push: { paymentEvents: {
            paymentId: paymentEntity.id,
            status: 'failed',
            errorCode: paymentEntity.error_code,
            errorDescription: paymentEntity.error_description,
            occurredAt: new Date()
          } }
        })
      }
    } else if (event === 'refund.processed' || event === 'refund.failed') {
      await recordRefundWebhook(refundEntity, event)
    }
    await PaymentWebhookEvent.updateOne({ _id: webhookEvent._id }, {
      $set: { status: 'processed', processedAt: new Date() }, $unset: { processingLeaseUntil: 1 }
    })
  } catch (err) {
    await PaymentWebhookEvent.updateOne({ _id: webhookEvent._id }, {
      $set: { status: 'failed' }, $unset: { processingLeaseUntil: 1 }
    })
    throw err
  }

  res.json({ success: true })
})

// POST /api/payment/confirm-upi  (admin confirms direct UPI payment)
export const confirmDirectUPI = asyncHandler(async (req, res) => {
  const { orderId, upiRef } = req.body
  const order = await confirmManualUpiPayment({ orderId, admin: req.user, upiRef })
  await notifyStatusUpdate(order)
  res.json({ success: true, message: 'UPI payment confirmed. Order is now confirmed.' })
})

export const processOrderRefundAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
  if (!order.refundRequired) return res.status(409).json({ success: false, message: 'This order has no outstanding refund.' })

  const refundId = String(req.body?.refundId || '').trim()
  if (refundId) {
    const result = await reconcileGatewayRefund(order._id, refundId, String(req.body?.providerPaymentId || '').trim())
    return res.json({ success: true, message: `Gateway refund reconciled as ${result.refundStatus}.`, order: result.order })
  }

  if (order.paymentMethod === 'direct-upi') {
    const reference = String(req.body?.refundReference || '').trim()
    if (!reference) return res.status(400).json({ success: false, message: 'Enter the manual refund reference to reconcile this refund.' })
    const updated = await confirmManualRefund({ orderId: order._id, admin: req.user, reference })
    return res.json({ success: true, message: 'Manual refund recorded.', order: updated })
  }

  const result = await processOrderRefund(order._id)
  const updatedOrder = result.order || await Order.findById(order._id)
  res.json({
    success: true,
    message: result.manualActionRequired ? 'Refund requires manual reconciliation.' : 'Refund processing state refreshed.',
    order: updatedOrder,
    outcomes: result.outcomes || []
  })
})

export const getPaymentReconciliation = asyncHandler(async (_req, res) => {
  const cutoff = new Date(Date.now() - PAYMENT_RESERVATION_MINUTES * 60 * 1000)
  const orders = await Order.find({
    $or: [
      { refundRequired: true },
      { paymentStatus: 'pending', paymentMethod: { $in: ['razorpay-upi', 'razorpay-card', 'razorpay-nb'] }, createdAt: { $lte: cutoff } }
    ]
  }).sort({ updatedAt: 1 }).limit(200)
  const [transactions, attempts, webhookEvents] = await Promise.all([PaymentTransaction.find({
    $or: [
      { refundStatus: { $in: ['pending', 'processing', 'failed', 'unknown'] } },
      { status: 'failed' }
    ]
  }).sort({ updatedAt: -1 }).limit(200), PaymentAttempt.find({ status: { $in: ['creating', 'failed', 'unknown'] } }).sort({ updatedAt: -1 }).limit(200),
  PaymentWebhookEvent.find({ status: { $in: ['failed', 'processing'] } }).sort({ updatedAt: -1 }).limit(200)])
  res.json({ success: true, orders, transactions, attempts, webhookEvents })
})
