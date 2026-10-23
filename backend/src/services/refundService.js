import Order from '../models/Order.js'
import { PaymentTransaction } from '../models/index.js'
import { createGatewayRefund, fetchGatewayRefund } from './razorpayService.js'
import { logger } from '../utils/logger.js'
import mongoose from 'mongoose'
import { HttpError } from '../utils/httpError.js'

const getRefundStatus = (refund, expectedAmountMinor) => {
  if (refund.status === 'failed') return 'failed'
  if (refund.status !== 'processed') return 'pending'
  return Number(refund.amount) === expectedAmountMinor ? 'refunded' : 'pending'
}

export const processOrderRefund = async (orderId) => {
  const order = await Order.findById(orderId)
  if (!order || !['refund_pending', 'refund_failed', 'paid'].includes(order.paymentStatus) || !order.refundRequired) {
    return { order, processed: false }
  }

  const transactions = await PaymentTransaction.find({
    orderId: order._id,
    provider: 'razorpay',
    status: 'paid',
    $or: [
      { refundStatus: 'failed' },
      { refundStatus: 'pending', refundId: { $exists: false } }
    ]
  })

  if (!transactions.length) {
    return { order, processed: false, manualActionRequired: ['direct-upi', 'pay-at-farm'].includes(order.paymentMethod) }
  }

  const outcomes = []
  for (const transaction of transactions) {
    const retryingFailedRefund = transaction.refundStatus === 'failed'
    const claimed = await PaymentTransaction.findOneAndUpdate({
      _id: transaction._id,
      refundStatus: transaction.refundStatus,
      ...(retryingFailedRefund ? {} : { refundId: { $exists: false } })
    }, {
      $set: { refundStatus: 'processing', refundRequestedAt: new Date() },
      ...(retryingFailedRefund ? { $unset: { refundId: 1, refundAmount: 1, refundedAt: 1 } } : {})
    }, { new: true })
    if (!claimed) continue

    try {
      const refund = await createGatewayRefund(claimed.providerPaymentId, {
        amount: Math.round(Number(claimed.amount) * 100),
        notes: { orderNumber: order.orderNumber, reason: order.cancelReason || 'Order cancelled' }
      })
      const refundStatus = getRefundStatus(refund, Math.round(Number(claimed.amount) * 100))
      await PaymentTransaction.updateOne({ _id: claimed._id, refundStatus: 'processing' }, {
        $set: {
          refundId: refund.id,
          refundAmount: Number(refund.amount || 0) / 100,
          refundStatus,
          ...(refundStatus === 'refunded' ? { refundedAt: new Date() } : {})
        },
        $push: { refundAttempts: {
          refundId: refund.id,
          status: refund.status === 'processed' ? 'refunded' : refundStatus,
          amount: Number(refund.amount || 0) / 100,
          updatedAt: new Date()
        } }
      })
      outcomes.push(refundStatus)
    } catch (error) {
      logger.error('Razorpay refund request outcome is unknown; reconcile before retrying', {
        orderId: order._id,
        paymentId: claimed.providerPaymentId,
        error: error.message
      })
      await PaymentTransaction.updateOne({ _id: claimed._id, refundStatus: 'processing' }, {
        $set: { refundStatus: 'unknown', metadata: { ...(claimed.metadata || {}), refundError: error.message } },
        $push: { refundAttempts: { status: 'unknown', amount: claimed.amount, updatedAt: new Date() } }
      })
      outcomes.push('unknown')
    }
  }

  const activeRefunds = await PaymentTransaction.countDocuments({
    orderId: order._id,
    provider: 'razorpay',
    status: 'paid',
    refundStatus: { $in: ['pending', 'processing', 'unknown'] }
  })
  const failedRefunds = await PaymentTransaction.countDocuments({
    orderId: order._id,
    provider: 'razorpay',
    status: 'paid',
    refundStatus: 'failed'
  })
  if (activeRefunds || failedRefunds) {
    if (failedRefunds && !activeRefunds && order.status === 'Cancelled') {
      await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
        $set: { paymentStatus: 'refund_failed', refundRequired: true }
      })
    }
    return { order: await Order.findById(order._id), processed: true, outcomes }
  }

  if (order.status === 'Cancelled') {
    await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
      $set: { paymentStatus: 'refunded', refundRequired: false }
    })
  } else {
    await Order.updateOne({ _id: order._id, paymentStatus: 'paid' }, { $set: { refundRequired: false } })
  }
  return { order: await Order.findById(order._id), processed: true, outcomes }
}

export const recordRefundWebhook = async (refund, event) => {
  if (!refund?.payment_id || !refund?.id) return
  const transaction = await PaymentTransaction.findOne({ provider: 'razorpay', providerPaymentId: refund.payment_id })
  if (!transaction) return

  if (transaction.refundStatus === 'refunded') return
  const priorAttempt = transaction.refundAttempts?.find(attempt => attempt.refundId === refund.id)
  if (event === 'refund.failed' && priorAttempt?.status === 'refunded') return

  const expectedAmountMinor = Math.round(Number(transaction.amount) * 100)
  if (event === 'refund.processed'
    && (!Number.isSafeInteger(Number(refund.amount)) || Number(refund.amount) <= 0 || Number(refund.amount) > expectedAmountMinor)) {
    throw new HttpError(409, 'Gateway refund amount is invalid for this payment transaction.')
  }
  const refundStatus = event === 'refund.failed'
    ? 'failed'
    : Number(refund.amount) === expectedAmountMinor ? 'refunded' : 'pending'
  transaction.refundId = refund.id
  transaction.refundAmount = Number(refund.amount || 0) / 100
  transaction.refundStatus = refundStatus
  if (refundStatus === 'refunded') transaction.refundedAt = new Date()
  if (!Array.isArray(transaction.refundAttempts)) transaction.refundAttempts = []
  const attemptStatus = event === 'refund.processed' ? 'refunded' : refundStatus
  if (priorAttempt) {
    priorAttempt.status = attemptStatus
    priorAttempt.amount = Number(refund.amount || 0) / 100
    priorAttempt.updatedAt = new Date()
  } else {
    transaction.refundAttempts.push({
      refundId: refund.id,
      status: attemptStatus,
      amount: Number(refund.amount || 0) / 100,
      updatedAt: new Date()
    })
  }
  await transaction.save()

  const order = await Order.findById(transaction.orderId)
  if (!order) return
  const outstanding = await PaymentTransaction.countDocuments({
    orderId: order._id,
    provider: 'razorpay',
    status: 'paid',
    refundStatus: { $in: ['pending', 'processing', 'unknown'] }
  })
  const failed = await PaymentTransaction.countDocuments({
    orderId: order._id,
    provider: 'razorpay',
    status: 'paid',
    refundStatus: 'failed'
  })
  if (!outstanding && !failed && order.status === 'Cancelled') {
    await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
      $set: { paymentStatus: 'refunded', refundRequired: false }
    })
  } else if (!outstanding && failed && order.status === 'Cancelled') {
    await Order.updateOne({ _id: order._id, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
      $set: { paymentStatus: 'refund_failed', refundRequired: true }
    })
  } else if (!outstanding && !failed && order.paymentStatus === 'paid') {
    await Order.updateOne({ _id: order._id, paymentStatus: 'paid' }, { $set: { refundRequired: false } })
  }
}

export const reconcileGatewayRefund = async (orderId, refundId, providerPaymentId) => {
  const transaction = await PaymentTransaction.findOne({
    orderId,
    provider: 'razorpay',
    ...(providerPaymentId ? { providerPaymentId } : {}),
    refundStatus: { $in: ['unknown', 'processing', 'pending', 'failed'] }
  })
  if (!transaction) throw new HttpError(404, 'No Razorpay refund is awaiting reconciliation for this order.')

  const refund = await fetchGatewayRefund(refundId)
  if (refund.payment_id !== transaction.providerPaymentId || Number(refund.amount) > Math.round(transaction.amount * 100)) {
    throw new HttpError(409, 'Gateway refund does not match this payment transaction.')
  }

  const expectedAmountMinor = Math.round(Number(transaction.amount) * 100)
  if (!Number.isSafeInteger(Number(refund.amount)) || Number(refund.amount) <= 0 || Number(refund.amount) > expectedAmountMinor) {
    throw new HttpError(409, 'Gateway refund amount is invalid for this payment transaction.')
  }
  const refundStatus = getRefundStatus(refund, expectedAmountMinor)
  transaction.refundId = refund.id
  transaction.refundAmount = Number(refund.amount || 0) / 100
  transaction.refundStatus = refundStatus
  if (refundStatus === 'refunded') transaction.refundedAt = new Date()
  if (!Array.isArray(transaction.refundAttempts)) transaction.refundAttempts = []
  const priorAttempt = transaction.refundAttempts.find(attempt => attempt.refundId === refund.id)
  if (priorAttempt) {
    priorAttempt.status = refundStatus
    priorAttempt.amount = Number(refund.amount || 0) / 100
    priorAttempt.updatedAt = new Date()
  } else {
    transaction.refundAttempts.push({ refundId: refund.id, status: refundStatus, amount: Number(refund.amount || 0) / 100, updatedAt: new Date() })
  }
  await transaction.save()

  const order = await Order.findById(orderId)
  if (!order) throw new HttpError(404, 'Order not found for this refund.')
  const [outstanding, failed] = await Promise.all([
    PaymentTransaction.countDocuments({ orderId, provider: 'razorpay', refundStatus: { $in: ['pending', 'processing', 'unknown'] } }),
    PaymentTransaction.countDocuments({ orderId, provider: 'razorpay', refundStatus: 'failed' })
  ])
  if (!outstanding && !failed) {
    if (order.status === 'Cancelled') {
      await Order.updateOne({ _id: orderId, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
        $set: { paymentStatus: 'refunded', refundRequired: false }
      })
    } else {
      await Order.updateOne({ _id: orderId, paymentStatus: 'paid' }, { $set: { refundRequired: false } })
    }
  } else if (!outstanding && failed && order.status === 'Cancelled') {
    await Order.updateOne({ _id: orderId, paymentStatus: { $in: ['refund_pending', 'refund_failed'] } }, {
      $set: { paymentStatus: 'refund_failed', refundRequired: true }
    })
  }

  return { order: await Order.findById(orderId), transaction: await PaymentTransaction.findById(transaction._id), refundStatus }
}

export const confirmManualRefund = async ({ orderId, admin, reference }) => {
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      const current = await Order.findOne({
        _id: orderId,
        paymentMethod: { $in: ['direct-upi', 'pay-at-farm'] },
        status: 'Cancelled',
        paymentStatus: { $in: ['refund_pending', 'refund_failed'] },
        refundRequired: true
      }).session(session)
      if (!current) throw new HttpError(409, 'No Direct UPI refund is awaiting reconciliation.')

      let transaction = await PaymentTransaction.findOne({
        orderId: current._id,
        provider: current.paymentMethod,
        status: 'paid'
      }).session(session)
      if (!transaction) {
        transaction = (await PaymentTransaction.create([{
          orderId: current._id,
          orderNumber: current.orderNumber,
          provider: current.paymentMethod,
          providerPaymentId: current.utrNumber || `UPI-DIRECT-${current.orderNumber}`,
          amount: current.total,
          currency: 'INR',
          status: 'paid',
          source: 'admin-confirm',
          confirmedBy: admin?._id,
          metadata: { legacyPaymentRecord: true }
        }], { session }))[0]
      }

      transaction.refundStatus = 'refunded'
      transaction.refundId = reference
      transaction.refundAmount = current.total
      transaction.refundedAt = new Date()
      transaction.metadata = { ...(transaction.metadata || {}), refundConfirmedBy: admin?._id }
      await transaction.save({ session })

      order = await Order.findOneAndUpdate({
        _id: current._id,
        status: 'Cancelled',
        paymentStatus: { $in: ['refund_pending', 'refund_failed'] },
        refundRequired: true
      }, { $set: { paymentStatus: 'refunded', refundRequired: false } }, { new: true, session })
      if (!order) throw new HttpError(409, 'Refund state changed; reload before confirming.')
    })
  } finally {
    await session.endSession()
  }
  return order
}
