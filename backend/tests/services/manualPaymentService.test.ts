import assert from 'node:assert/strict'
import test from 'node:test'
import mongoose from 'mongoose'
import Order from '../../src/models/Order.js'
import { PaymentTransaction } from '../../src/models/index.js'
import { confirmManualUpiPayment } from '../../src/services/manualPaymentService.js'

const replaceMethod = (target: any, method: string, value: unknown) => {
  Object.defineProperty(target, method, { configurable: true, writable: true, value })
}

const session = () => {
  let ended = false
  return {
    get ended() { return ended },
    withTransaction: async (callback: () => Promise<void>) => callback(),
    endSession: async () => { ended = true }
  }
}

test('manual UPI confirmation marks the order paid, commits inventory, and records the transaction', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Order.findOne,
    findOneAndUpdate: Order.findOneAndUpdate,
    create: PaymentTransaction.create
  }
  const transactionSession = session()
  const current = {
    _id: 'order-1',
    orderNumber: 'NM-000101',
    total: 500,
    utrNumber: undefined,
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved'
  }
  const updated = { ...current, status: 'Confirmed', paymentStatus: 'paid', inventoryStatus: 'committed' }
  let update: any
  let transaction: any
  mongoose.startSession = (async () => transactionSession) as any
  Order.findOne = ((filter: any) => {
    assert.deepEqual(filter, {
      _id: 'order-1',
      paymentMethod: 'direct-upi',
      status: 'New',
      paymentStatus: 'pending',
      inventoryStatus: { $in: ['reserved', 'committed'] }
    })
    return { session: async (received: unknown) => {
      assert.equal(received, transactionSession)
      return current
    } }
  }) as any
  Order.findOneAndUpdate = ((filter: any, changes: any, options: any) => {
    update = { filter, changes, options }
    return updated
  }) as any
  PaymentTransaction.create = (async (records: any[], options: any) => {
    transaction = { records, options }
    return records
  }) as any

  try {
    const result = await confirmManualUpiPayment({
      orderId: 'order-1',
      admin: { _id: 'admin-1', name: 'Admin' },
      upiRef: '  UTR123456  ',
      note: 'Checked bank statement'
    })
    assert.equal(result, updated)
    assert.equal(update.changes.$set.paymentStatus, 'paid')
    assert.equal(update.changes.$set.status, 'Confirmed')
    assert.equal(update.changes.$set.inventoryStatus, 'committed')
    assert.equal(update.changes.$set.utrNumber, 'UTR123456')
    assert.match(update.changes.$push.statusHistory.note, /Checked bank statement/)
    assert.equal(transaction.records[0].providerPaymentId, 'UTR123456')
    assert.equal(transaction.records[0].amount, 500)
    assert.equal(transaction.records[0].source, 'admin-confirm')
    assert.equal(transaction.options.session, transactionSession)
    assert.equal(transactionSession.ended, true)
  } finally {
    replaceMethod(mongoose, 'startSession', originals.startSession)
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(Order, 'findOneAndUpdate', originals.findOneAndUpdate)
    replaceMethod(PaymentTransaction, 'create', originals.create)
  }
})

test('manual UPI confirmation rejects orders that are not awaiting payment and closes its session', async () => {
  const originals = { startSession: mongoose.startSession, findOne: Order.findOne }
  const transactionSession = session()
  mongoose.startSession = (async () => transactionSession) as any
  Order.findOne = (() => ({ session: async () => null })) as any

  try {
    await assert.rejects(
      confirmManualUpiPayment({ orderId: 'order-1', admin: { _id: 'admin-1' } }),
      (error: any) => error.statusCode === 409 && /not awaiting manual payment/.test(error.message)
    )
    assert.equal(transactionSession.ended, true)
  } finally {
    replaceMethod(mongoose, 'startSession', originals.startSession)
    replaceMethod(Order, 'findOne', originals.findOne)
  }
})

test('pay-at-farm confirmation accepts an in-progress fulfillment order without changing its status', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Order.findOne,
    findOneAndUpdate: Order.findOneAndUpdate,
    create: PaymentTransaction.create
  }
  const transactionSession = session()
  const current = {
    _id: 'order-2',
    orderNumber: 'NM-000102',
    total: 750,
    status: 'Packed',
    paymentMethod: 'pay-at-farm',
    paymentStatus: 'pending',
    inventoryStatus: 'committed'
  }
  let update: any
  let transaction: any
  mongoose.startSession = (async () => transactionSession) as any
  Order.findOne = ((filter: any) => {
    assert.deepEqual(filter, {
      _id: 'order-2',
      paymentMethod: 'pay-at-farm',
      status: { $in: ['New', 'Confirmed', 'Packed', 'Pickup-Ready', 'Picked-Up'] },
      paymentStatus: 'pending',
      inventoryStatus: { $in: ['reserved', 'committed'] }
    })
    return { session: async () => current }
  }) as any
  Order.findOneAndUpdate = ((filter: any, changes: any) => {
    update = { filter, changes }
    return { ...current, paymentStatus: 'paid' }
  }) as any
  PaymentTransaction.create = (async (records: any[]) => {
    transaction = records[0]
    return records
  }) as any

  try {
    await confirmManualUpiPayment({
      orderId: 'order-2',
      admin: { _id: 'admin-1', name: 'Admin' },
      paymentMethod: 'pay-at-farm',
      note: 'Cash collected'
    })
    assert.equal(update.changes.$set.status, 'Packed')
    assert.equal(update.changes.$set.inventoryStatus, 'committed')
    assert.match(update.changes.$push.statusHistory.note, /Pay-at-farm payment collected/)
    assert.equal(transaction.provider, 'pay-at-farm')
    assert.equal(transaction.providerPaymentId, 'PAY-AT-FARM-NM-000102')
    assert.equal(transaction.amount, 750)
  } finally {
    replaceMethod(mongoose, 'startSession', originals.startSession)
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(Order, 'findOneAndUpdate', originals.findOneAndUpdate)
    replaceMethod(PaymentTransaction, 'create', originals.create)
  }
})

test('manual UPI confirmation rejects an expired reservation without recording payment', async () => {
  const originals = {
    startSession: mongoose.startSession,
    findOne: Order.findOne,
    findOneAndUpdate: Order.findOneAndUpdate,
    create: PaymentTransaction.create
  }
  const transactionSession = session()
  mongoose.startSession = (async () => transactionSession) as any
  Order.findOne = (() => ({
    session: async () => ({
      _id: 'order-1',
      inventoryExpiresAt: new Date(Date.now() - 1000)
    })
  })) as any
  let writes = 0
  Order.findOneAndUpdate = (async () => { writes += 1 }) as any
  PaymentTransaction.create = (async () => { writes += 1 }) as any

  try {
    await assert.rejects(
      confirmManualUpiPayment({ orderId: 'order-1', admin: { _id: 'admin-1' } }),
      (error: any) => error.statusCode === 409 && /reservation expired/.test(error.message)
    )
    assert.equal(writes, 0)
    assert.equal(transactionSession.ended, true)
  } finally {
    replaceMethod(mongoose, 'startSession', originals.startSession)
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(Order, 'findOneAndUpdate', originals.findOneAndUpdate)
    replaceMethod(PaymentTransaction, 'create', originals.create)
  }
})
