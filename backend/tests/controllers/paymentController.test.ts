import assert from 'node:assert/strict'
import test from 'node:test'
import Order from '../../src/models/Order.js'
import { PaymentAttempt } from '../../src/models/index.js'
import {
  createPaymentOrder,
  paymentWebhook,
  submitDirectUpiReference,
  verifyPayment
} from '../../src/controllers/paymentController.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

const invoke = async (handler: any, req: any, res: any) => {
  let failure: unknown
  await handler(req, res, (error: unknown) => { failure = error })
  if (failure) throw failure
}

const replaceMethod = (target: any, method: string, value: unknown) => {
  Object.defineProperty(target, method, { configurable: true, writable: true, value })
}

test('Direct UPI reference submission trims and stores the reference for the order owner', async () => {
  const originalFindOne = Order.findOne
  const originalFindOneAndUpdate = Order.findOneAndUpdate
  const originalUpi = process.env.UPI_ID
  const order: any = {
    paymentMethod: 'direct-upi',
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: new Date(Date.now() + 60000)
  }
  let lookupQuery: any
  let updateQuery: any
  let update: any
  process.env.UPI_ID = 'farm@example'
  Order.findOne = (async (filter: any) => { lookupQuery = filter; return order }) as any
  Order.findOneAndUpdate = (async (filter: any, value: any) => {
    updateQuery = filter
    update = value
    return order
  }) as any

  try {
    const res = response()
    await invoke(submitDirectUpiReference, {
      body: { orderId: 'order-1', upiRef: '  UTR123456  ' },
      user: { _id: 'user-1' }
    }, res)
    assert.deepEqual(lookupQuery, { _id: 'order-1', userId: 'user-1' })
    assert.equal(update.$set.utrNumber, 'UTR123456')
    assert.equal(update.$push.statusHistory.status, 'New')
    assert.equal(updateQuery.inventoryStatus, 'reserved')
    assert.equal(updateQuery.$or.length, 3)
    assert.equal(res.body.success, true)
  } finally {
    replaceMethod(Order, 'findOne', originalFindOne)
    replaceMethod(Order, 'findOneAndUpdate', originalFindOneAndUpdate)
    if (originalUpi === undefined) delete process.env.UPI_ID
    else process.env.UPI_ID = originalUpi
  }
})

test('Direct UPI reference retries are idempotent and cannot replace a submitted reference', async () => {
  const originalFindOne = Order.findOne
  const originalFindOneAndUpdate = Order.findOneAndUpdate
  const originalUpi = process.env.UPI_ID
  let updateCalls = 0
  process.env.UPI_ID = 'farm@example'
  Order.findOne = (async () => ({
    paymentMethod: 'direct-upi',
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: new Date(Date.now() + 60000),
    utrNumber: 'UTR123456'
  })) as any
  Order.findOneAndUpdate = (async () => { updateCalls += 1; return null }) as any

  try {
    const repeated = response()
    await invoke(submitDirectUpiReference, {
      body: { orderId: 'order-1', upiRef: 'UTR123456' },
      user: { _id: 'user-1' }
    }, repeated)
    assert.equal(repeated.statusCode, 200)
    assert.equal(updateCalls, 0)

    const replacement = response()
    await invoke(submitDirectUpiReference, {
      body: { orderId: 'order-1', upiRef: 'UTR654321' },
      user: { _id: 'user-1' }
    }, replacement)
    assert.equal(replacement.statusCode, 409)
    assert.equal(updateCalls, 0)
  } finally {
    replaceMethod(Order, 'findOne', originalFindOne)
    replaceMethod(Order, 'findOneAndUpdate', originalFindOneAndUpdate)
    if (originalUpi === undefined) delete process.env.UPI_ID
    else process.env.UPI_ID = originalUpi
  }
})

test('Direct UPI reference submission rejects missing, wrong-method, closed, and unconfigured orders', async () => {
  const originalFindOne = Order.findOne
  const originalUpi = process.env.UPI_ID
  let order: any = null
  let saves = 0
  Order.findOne = (async () => order) as any

  try {
    const missing = response()
    await invoke(submitDirectUpiReference, { body: { orderId: 'missing', upiRef: 'UTR123456' }, user: { _id: 'user-1' } }, missing)
    assert.equal(missing.statusCode, 404)

    order = { paymentMethod: 'razorpay-upi' }
    const wrongMethod = response()
    await invoke(submitDirectUpiReference, { body: { orderId: 'order-1', upiRef: 'UTR123456' }, user: { _id: 'user-1' } }, wrongMethod)
    assert.equal(wrongMethod.statusCode, 400)

    order = { paymentMethod: 'direct-upi', status: 'Confirmed', paymentStatus: 'paid' }
    const closed = response()
    await invoke(submitDirectUpiReference, { body: { orderId: 'order-1', upiRef: 'UTR123456' }, user: { _id: 'user-1' } }, closed)
    assert.equal(closed.statusCode, 409)

    order = {
      paymentMethod: 'direct-upi', status: 'New', paymentStatus: 'pending',
      inventoryStatus: 'reserved', inventoryExpiresAt: new Date(Date.now() + 60000)
    }
    delete process.env.UPI_ID
    const unconfigured = response()
    await invoke(submitDirectUpiReference, { body: { orderId: 'order-1', upiRef: 'UTR123456' }, user: { _id: 'user-1' } }, unconfigured)
    assert.equal(unconfigured.statusCode, 503)
    assert.equal(saves, 0)
  } finally {
    replaceMethod(Order, 'findOne', originalFindOne)
    if (originalUpi === undefined) delete process.env.UPI_ID
    else process.env.UPI_ID = originalUpi
  }
})

test('Razorpay order and verify endpoints reject invalid requests before provider/database calls', async () => {
  const originalFindOne = Order.findOne
  let lookups = 0
  Order.findOne = (async () => { lookups += 1; return null }) as any

  try {
    const noIdempotencyKey = response()
    await invoke(createPaymentOrder, {
      body: { orderId: 'order-1' },
      user: { _id: 'user-1' },
      get: () => 'bad'
    }, noIdempotencyKey)
    assert.equal(noIdempotencyKey.statusCode, 400)

    const incomplete = response()
    await invoke(verifyPayment, { body: { orderId: 'order-1' }, user: { _id: 'user-1' } }, incomplete)
    assert.equal(incomplete.statusCode, 400)
    assert.equal(incomplete.body.message, 'Incomplete payment payload.')
    assert.equal(lookups, 0)
  } finally {
    replaceMethod(Order, 'findOne', originalFindOne)
  }
})

test('Razorpay checkout reuses an active gateway order instead of creating another attempt', async () => {
  const originals = { findOne: Order.findOne, attemptFindOne: PaymentAttempt.findOne }
  const order: any = {
    _id: 'order-1',
    userId: 'user-1',
    orderNumber: 'NM-000001',
    total: 123,
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: new Date(Date.now() + 60_000),
    paymentMethod: 'razorpay-upi',
    customer: { name: 'Buyer' }
  }
  const activeAttempt = {
    providerOrderId: 'rzp_order_existing',
    amountMinor: 12300,
    currency: 'INR',
    status: 'created'
  }
  let attemptLookups = 0
  Order.findOne = (async () => order) as any
  PaymentAttempt.findOne = ((filter: any) => {
    attemptLookups += 1
    if (attemptLookups === 1) return Promise.resolve(null)
    assert.deepEqual(filter.status, { $in: ['creating', 'created', 'unknown'] })
    return { sort: async (sort: any) => {
      assert.deepEqual(sort, { attemptNumber: -1 })
      return activeAttempt
    } }
  }) as any

  try {
    const res = response()
    await invoke(createPaymentOrder, {
      body: { orderId: order._id },
      user: { _id: 'user-1' },
      get: () => 'new-attempt-key-123'
    }, res)
    assert.equal(res.body.razorpayOrderId, activeAttempt.providerOrderId)
    assert.equal(res.body.amount, 12300)
    assert.equal(attemptLookups, 2)
  } finally {
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(PaymentAttempt, 'findOne', originals.attemptFindOne)
  }
})

test('Razorpay checkout blocks a new attempt while a prior result is unknown', async () => {
  const originals = { findOne: Order.findOne, attemptFindOne: PaymentAttempt.findOne }
  const order: any = {
    _id: 'order-1',
    userId: 'user-1',
    total: 123,
    status: 'New',
    paymentStatus: 'pending',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: new Date(Date.now() + 60_000),
    paymentMethod: 'razorpay-upi'
  }
  let attemptLookups = 0
  Order.findOne = (async () => order) as any
  PaymentAttempt.findOne = ((filter: any) => {
    attemptLookups += 1
    if (attemptLookups === 1) return Promise.resolve(null)
    return { sort: async () => ({
      status: 'unknown',
      amountMinor: 12300,
      currency: 'INR'
    }) }
  }) as any

  try {
    await assert.rejects(invoke(createPaymentOrder, {
      body: { orderId: order._id },
      user: { _id: 'user-1' },
      get: () => 'new-attempt-key-456'
    }, response()), (error: any) => error.statusCode === 409 && /reconciled/.test(error.message))
    assert.equal(attemptLookups, 2)
  } finally {
    replaceMethod(Order, 'findOne', originals.findOne)
    replaceMethod(PaymentAttempt, 'findOne', originals.attemptFindOne)
  }
})

test('Razorpay webhook fails explicitly when its signing secret is missing', async () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  delete process.env.RAZORPAY_WEBHOOK_SECRET

  try {
    await assert.rejects(
      invoke(paymentWebhook, {
        headers: {},
        rawBody: Buffer.from('{}'),
        body: {}
      }, response()),
      (error: any) => error.statusCode === 503 && /secret is not configured/.test(error.message)
    )
  } finally {
    if (originalSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET
    else process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret
  }
})
