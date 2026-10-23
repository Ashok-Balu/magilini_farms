import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import Order from '../../src/models/Order.js'
import { PaymentTransaction } from '../../src/models/index.js'
import {
  confirmManualRefund,
  processOrderRefund,
  recordRefundWebhook
} from '../../src/services/refundService.js'

const replaceMethod = (target: any, method: string, value: unknown) => {
  Object.defineProperty(target, method, { configurable: true, writable: true, value })
}

const session = () => ({
  withTransaction: async (callback: () => Promise<void>) => callback(),
  endSession: async () => {}
})

test('refund processing is a no-op when order is missing, ineligible, or has no refund request', async () => {
  const originalFindById = Order.findById
  const originalFind = PaymentTransaction.find
  Order.findById = (async () => null) as any
  PaymentTransaction.find = (async () => { throw new Error('should not query transactions') }) as any

  try {
    assert.deepEqual(await processOrderRefund('unknown'), { order: null, processed: false })

    Order.findById = (async () => ({
      paymentStatus: 'pending',
      refundRequired: false
    })) as any
    assert.deepEqual(await processOrderRefund('order-1'), {
      order: { paymentStatus: 'pending', refundRequired: false },
      processed: false
    })
  } finally {
    replaceMethod(Order, 'findById', originalFindById)
    replaceMethod(PaymentTransaction, 'find', originalFind)
  }
})

test('manual-payment refunds without a Razorpay transaction are flagged for reconciliation', async () => {
  const originalFindById = Order.findById
  const originalFind = PaymentTransaction.find
  const manualOrder = {
    _id: 'order-1',
    paymentStatus: 'refund_pending',
    refundRequired: true,
    paymentMethod: 'direct-upi'
  }
  Order.findById = (async () => manualOrder) as any
  PaymentTransaction.find = (async () => []) as any

  try {
    assert.deepEqual(await processOrderRefund('order-1'), {
      order: manualOrder,
      processed: false,
      manualActionRequired: true
    })
  } finally {
    replaceMethod(Order, 'findById', originalFindById)
    replaceMethod(PaymentTransaction, 'find', originalFind)
  }
})

test('refund webhooks ignore incomplete or unknown payment references', async () => {
  const originalFindOne = PaymentTransaction.findOne
  let lookups = 0
  PaymentTransaction.findOne = (async () => { lookups += 1; return null }) as any

  try {
    await recordRefundWebhook({}, 'refund.processed')
    await recordRefundWebhook({ payment_id: 'unknown-payment', id: 'refund-1' }, 'refund.processed')
    assert.equal(lookups, 1)
  } finally {
    replaceMethod(PaymentTransaction, 'findOne', originalFindOne)
  }
})

test('processed refund webhook records amount and completes cancelled order refund', async () => {
  const originals = {
    findOne: PaymentTransaction.findOne,
    countDocuments: PaymentTransaction.countDocuments,
    findById: Order.findById,
    updateOne: Order.updateOne
  }
  const transaction: any = {
    orderId: 'order-1',
    amount: 123.45,
    refundStatus: 'pending',
    save: async () => { transaction.saved = true }
  }
  let orderUpdate: any
  PaymentTransaction.findOne = (async () => transaction) as any
  PaymentTransaction.countDocuments = (async () => 0) as any
  Order.findById = (async () => ({ _id: 'order-1', status: 'Cancelled', paymentStatus: 'refund_pending' })) as any
  Order.updateOne = (async (...args: any[]) => { orderUpdate = args }) as any

  try {
    await recordRefundWebhook({ payment_id: 'pay-1', id: 'rfnd-1', amount: 12345 }, 'refund.processed')
    assert.equal(transaction.refundStatus, 'refunded')
    assert.equal(transaction.refundId, 'rfnd-1')
    assert.equal(transaction.refundAmount, 123.45)
    assert.equal(transaction.saved, true)
    assert.deepEqual(orderUpdate, [
      { _id: 'order-1', paymentStatus: { $in: ['refund_pending', 'refund_failed'] } },
      { $set: { paymentStatus: 'refunded', refundRequired: false } }
    ])
  } finally {
    replaceMethod(PaymentTransaction, 'findOne', originals.findOne)
    replaceMethod(PaymentTransaction, 'countDocuments', originals.countDocuments)
    replaceMethod(Order, 'findById', originals.findById)
    replaceMethod(Order, 'updateOne', originals.updateOne)
  }
})

test('partial refund webhooks stay pending and a late failure cannot undo a processed refund', async () => {
  const originals = {
    findOne: PaymentTransaction.findOne,
    countDocuments: PaymentTransaction.countDocuments,
    findById: Order.findById,
    updateOne: Order.updateOne
  }
  const transaction: any = {
    orderId: 'order-1',
    amount: 500,
    refundStatus: 'pending',
    refundAttempts: [],
    save: async () => { transaction.saved = true }
  }
  let orderUpdates = 0
  PaymentTransaction.findOne = (async () => transaction) as any
  PaymentTransaction.countDocuments = (async (filter: any) => {
    return filter.refundStatus?.$in ? Number(transaction.refundStatus === 'pending') : 0
  }) as any
  Order.findById = (async () => ({ _id: 'order-1', status: 'Cancelled', paymentStatus: 'refund_pending' })) as any
  Order.updateOne = (async () => { orderUpdates += 1 }) as any

  try {
    await recordRefundWebhook({
      payment_id: 'pay-1', id: 'rfnd-partial', amount: 25000, status: 'processed'
    }, 'refund.processed')
    assert.equal(transaction.refundStatus, 'pending')
    assert.equal(transaction.refundAttempts[0].status, 'refunded')
    assert.equal(orderUpdates, 0)

    await recordRefundWebhook({
      payment_id: 'pay-1', id: 'rfnd-partial', amount: 25000, status: 'failed'
    }, 'refund.failed')
    assert.equal(transaction.refundStatus, 'pending')
    assert.equal(transaction.refundAttempts[0].status, 'refunded')
    assert.equal(orderUpdates, 0)
  } finally {
    replaceMethod(PaymentTransaction, 'findOne', originals.findOne)
    replaceMethod(PaymentTransaction, 'countDocuments', originals.countDocuments)
    replaceMethod(Order, 'findById', originals.findById)
    replaceMethod(Order, 'updateOne', originals.updateOne)
  }
})

test('manual refund confirmation updates the transaction and order in one session', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Order.findOne,
    transactionFindOne: PaymentTransaction.findOne,
    findOneAndUpdate: Order.findOneAndUpdate
  }
  const txSession = session()
  const current = {
    _id: 'order-1',
    orderNumber: 'NM-000101',
    total: 500,
    paymentMethod: 'direct-upi',
    utrNumber: 'UTR123',
    status: 'Cancelled',
    paymentStatus: 'refund_pending',
    refundRequired: true
  }
  const transaction: any = {
    refundStatus: 'pending',
    metadata: { note: 'cancelled' },
    save: async ({ session: savedSession }: any) => { transaction.savedSession = savedSession }
  }
  const updatedOrder = { ...current, paymentStatus: 'refunded', refundRequired: false }
  mongoose.startSession = (async () => txSession) as any
  Order.findOne = (() => ({ session: async () => current })) as any
  PaymentTransaction.findOne = (() => ({ session: async () => transaction })) as any
  Order.findOneAndUpdate = (async (_filter: any, _update: any, options: any) => {
    assert.equal(options.session, txSession)
    return updatedOrder
  }) as any

  try {
    const result = await confirmManualRefund({
      orderId: 'order-1',
      admin: { _id: 'admin-1' },
      reference: 'REFUND-123'
    })
    assert.equal(result, updatedOrder)
    assert.equal(transaction.refundStatus, 'refunded')
    assert.equal(transaction.refundId, 'REFUND-123')
    assert.equal(transaction.refundAmount, 500)
    assert.equal(transaction.metadata.refundConfirmedBy, 'admin-1')
    assert.equal(transaction.savedSession, txSession)
  } finally {
    replaceMethod(mongoose, 'startSession', originals.startSession)
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(PaymentTransaction, 'findOne', originals.transactionFindOne)
    replaceMethod(Order, 'findOneAndUpdate', originals.findOneAndUpdate)
  }
})
