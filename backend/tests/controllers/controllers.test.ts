import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import mongoose from 'mongoose'
import User from '../../src/models/User.js'
import Order from '../../src/models/Order.js'
import Product from '../../src/models/Product.js'
import { cloudinary } from '../../src/config/cloudinary.js'
import { AdminAuditLog, BusinessHours, Complaint, Coupon, NotificationDelivery, NotifyMe, Review } from '../../src/models/index.js'

const { forgotPassword } = await import('../../src/controllers/authController.js')
const { createProduct } = await import('../../src/controllers/productController.js')
const { placeOrder, cancelMyOrder } = await import('../../src/controllers/orderController.js')
const { trackOrder, trackOrderInvoice } = await import('../../src/controllers/orderController.js')
const { getPaymentOptions } = await import('../../src/controllers/paymentController.js')
const {
  adminGetNotificationDeliveries,
  adminGetAuditLogs,
  adminRetryNotification,
  adminSendNotifications,
  applyCoupon,
  getProductReviews,
  getMyComplaints
} = await import('../../src/controllers/miscController.js')

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

const invoke = async (handler: any, req: any, res: any) => {
  let failure: unknown
  await handler(req, res, (err: unknown) => { failure = err })
  if (failure) throw failure
}

test('authController forgot-password normalizes the lookup and keeps unknown accounts generic', async () => {
  const originalFindOne = User.findOne
  let query: unknown
  User.findOne = (async (filter: unknown) => { query = filter; return null }) as any
  const res = response()

  try {
    await invoke(forgotPassword, { body: { email: '  MISSING@Example.com ' }, ip: '127.0.0.1' }, res)
    assert.deepEqual(query, { email: 'missing@example.com', role: 'customer' })
    assert.deepEqual(res.body, {
      success: true,
      message: 'If an account exists for this email, a password reset link has been sent.'
    })
  } finally {
    User.findOne = originalFindOne
  }
})

test('productController rejects invalid variant payloads before creating a product', async () => {
  const originalCreate = (await import('../../src/models/Product.js')).default.create
  let createCalls = 0
  const Product = (await import('../../src/models/Product.js')).default
  Product.create = (async () => { createCalls += 1 }) as any
  const res = response()

  try {
    await invoke(createProduct, {
      body: {
        name: 'Mango', category: 'category-id', description: 'Fresh mango',
        variants: JSON.stringify([{ weight: '1 kg', price: -1, mrp: 100, stock: 2 }])
      },
      files: []
    }, res)
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, { success: false, message: 'Variant price must be greater than zero.' })
    assert.equal(createCalls, 0)
  } finally {
    Product.create = originalCreate
  }
})

test('orderController requires a valid idempotency key before database access', async () => {
  const res = response()
  await invoke(placeOrder, {
    body: {
      deliveryType: 'pickup',
      items: [{ productId: 'not-read', variantId: 'not-read', qty: 1 }],
      paymentMethod: 'pay-at-farm'
    },
    user: { _id: 'user-1' },
    get: () => 'bad'
  }, res)

  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, {
    success: false,
    message: 'A valid Idempotency-Key header is required.'
  })
})

test('orderController rejects pay-at-farm for home delivery before database access', async () => {
  const res = response()
  await invoke(placeOrder, {
    body: {
      deliveryType: 'home',
      deliveryAddress: { pincode: '600001' },
      items: [{ productId: 'not-read', variantId: 'not-read', qty: 1 }],
      paymentMethod: 'pay-at-farm'
    },
    user: { _id: 'user-1' },
    get: () => 'order-key-123'
  }, res)

  assert.equal(res.statusCode, 400)
  assert.match(res.body.message, /only for farm pickup/)
})

test('orderController refuses farm pickup on a closed or unconfigured weekday', async () => {
  const originalFindOne = BusinessHours.findOne
  const originalOrderFindOne = Order.findOne
  const schedules = [null, { isOpen: false }]
  Order.findOne = (async () => null) as any

  try {
    for (const schedule of schedules) {
      BusinessHours.findOne = (async () => schedule) as any
      const res = response()
      await invoke(placeOrder, {
        body: {
          deliveryType: 'pickup',
          pickupDate: '2030-01-01',
          items: [{ productId: 'not-read', variantId: 'not-read', qty: 1 }],
          paymentMethod: 'pay-at-farm'
        },
        user: { _id: '507f1f77bcf86cd799439011' },
        get: () => 'order-key-123'
      }, res)

      assert.equal(res.statusCode, 400)
      assert.equal(res.body.message, 'Farm pickup is unavailable on the selected date.')
    }
  } finally {
    BusinessHours.findOne = originalFindOne
    Order.findOne = originalOrderFindOne
  }
})

test('orderController replays an identical idempotent order request', async () => {
  const originalFindOne = Order.findOne
  const previousOrder = { _id: 'order-1', requestHash: undefined }
  const body = {
    deliveryType: 'pickup',
    pickupDate: '2030-01-01',
    items: [{ productId: 'not-read', variantId: 'not-read', qty: 1 }],
    paymentMethod: 'pay-at-farm'
  }
  previousOrder.requestHash = crypto.createHash('sha256').update(JSON.stringify({
    deliveryType: 'pickup',
    items: [{ productId: 'not-read', qty: 1, variantId: 'not-read' }],
    paymentMethod: 'pay-at-farm',
    pickupDate: '2030-01-01'
  })).digest('hex')
  Order.findOne = (async () => previousOrder) as any
  const res = response()

  try {
    await invoke(placeOrder, {
      body,
      user: { _id: 'user-1' },
      get: () => 'order-key-123'
    }, res)

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body, {
      success: true,
      message: 'Order request already processed.',
      order: previousOrder
    })
  } finally {
    Order.findOne = originalFindOne
  }
})

test('orderController rejects reuse of an idempotency key for a different request', async () => {
  const originalFindOne = Order.findOne
  Order.findOne = (async () => ({ requestHash: 'different-request-hash' })) as any

  try {
    await assert.rejects(
      invoke(placeOrder, {
        body: {
          deliveryType: 'pickup',
          pickupDate: '2030-01-01',
          items: [{ productId: 'not-read', variantId: 'not-read', qty: 1 }],
          paymentMethod: 'pay-at-farm'
        },
        user: { _id: 'user-1' },
        get: () => 'order-key-123'
      }, response()),
      { status: 409, message: 'This idempotency key was already used for a different order request.' }
    )
  } finally {
    Order.findOne = originalFindOne
  }
})

test('order cancellation releases the coupon redemption within its transaction', async () => {
  const originalStartSession = mongoose.startSession
  const originalOrderFindOne = Order.findOne
  const originalOrderFindOneAndUpdate = Order.findOneAndUpdate
  const originalCouponFindOne = Coupon.findOne
  const originalCouponUpdateOne = Coupon.updateOne
  const originalNotificationCreate = NotificationDelivery.create
  const originalNotificationFindOneAndUpdate = NotificationDelivery.findOneAndUpdate
  const userId = '507f1f77bcf86cd799439011'
  const session = {
    withTransaction: async (callback: () => Promise<void>) => callback(),
    endSession: async () => {}
  }
  const coupon = {
    _id: '507f191e810c19729de860ea',
    usedCount: 2,
    usedBy: [userId, userId]
  }
  let releasedUsage: any
  mongoose.startSession = (async () => session) as any
  Order.findOne = (() => ({ session: async () => ({
    _id: '507f191e810c19729de860eb',
    userId,
    status: 'New',
    paymentStatus: 'pending',
    paymentMethod: 'pay-at-farm',
    inventoryStatus: 'reserved',
    items: [],
    couponCode: 'SAVE10'
  }) })) as any
  Order.findOneAndUpdate = (async () => ({
    _id: '507f191e810c19729de860eb',
    status: 'Cancelled',
    paymentStatus: 'failed',
    customer: { phone: '5555555555' },
    orderNumber: 'ORD-1'
  })) as any
  Coupon.findOne = (() => ({ session: async () => coupon })) as any
  Coupon.updateOne = (async (_filter: any, update: any, options: any) => {
    releasedUsage = { update, options }
    return { modifiedCount: 1 }
  }) as any
  NotificationDelivery.create = (async () => ({ _id: 'notification-1' })) as any
  NotificationDelivery.findOneAndUpdate = (async () => null) as any
  const res = response()

  try {
    await invoke(cancelMyOrder, {
      params: { id: '507f191e810c19729de860eb' },
      body: {},
      user: { _id: userId }
    }, res)
    assert.equal(res.statusCode, 200)
    assert.equal(releasedUsage.update.$inc.usedCount, -1)
    assert.deepEqual(releasedUsage.update.$set.usedBy, [userId])
    assert.equal(releasedUsage.options.session, session)
  } finally {
    mongoose.startSession = originalStartSession
    Order.findOne = originalOrderFindOne
    Order.findOneAndUpdate = originalOrderFindOneAndUpdate
    Coupon.findOne = originalCouponFindOne
    Coupon.updateOne = originalCouponUpdateOne
    NotificationDelivery.create = originalNotificationCreate
    NotificationDelivery.findOneAndUpdate = originalNotificationFindOneAndUpdate
  }
})

test('orderController public tracking projects only customer-safe status fields', async () => {
  const originalFindOne = Order.findOne
  let selectedFields = ''
  let query: unknown
  const order = {
    orderNumber: 'NM-000001',
    status: 'Shipped',
    statusHistory: [{ status: 'Shipped', time: new Date('2026-01-01T00:00:00Z') }],
    deliveryType: 'home'
  }
  Order.findOne = ((filter: unknown) => {
    query = filter
    return {
    select(fields: string) {
      selectedFields = fields
      return Promise.resolve(order)
    }
    }
  }) as any
  const res = response()

  try {
    await invoke(trackOrder, { params: { num: 'nm-000001' }, user: { _id: 'customer-1' } }, res)
    assert.equal(selectedFields.includes('customer'), false)
    assert.equal(selectedFields.includes('statusHistory.note'), false)
    assert.deepEqual(query, { orderNumber: 'NM-000001', userId: 'customer-1' })
    assert.deepEqual(res.body, { success: true, order })
  } finally {
    Order.findOne = originalFindOne
  }
})

test('orderController invoice lookup is scoped to the authenticated customer', async () => {
  const originalFindOne = Order.findOne
  let query: unknown
  Order.findOne = (async (filter: unknown) => { query = filter; return null }) as any
  const res = response()

  try {
    await invoke(trackOrderInvoice, {
      params: { num: 'nm-000001' },
      user: { _id: 'customer-1' }
    }, res)
    assert.deepEqual(query, { orderNumber: 'NM-000001', userId: 'customer-1' })
    assert.equal(res.statusCode, 404)
    assert.deepEqual(res.body, { success: false, message: 'Order not found.' })
  } finally {
    Order.findOne = originalFindOne
  }
})

test('public product reviews omit internal customer identifiers and contact fields', async () => {
  const originalProductFindOne = Product.findOne
  const originalReviewFind = Review.find
  const originalReviewAggregate = Review.aggregate
  let selectedFields = ''
  const reviews = [{ name: 'Customer', rating: 5, comment: 'Fresh', phone: undefined, userId: undefined }]
  Product.findOne = (async () => ({ _id: 'product-1' })) as any
  Review.find = (() => ({
    select(fields: string) {
      selectedFields = fields
      return {
        sort: () => ({
          limit: async () => reviews
        })
      }
    }
  })) as any
  Review.aggregate = (async () => [{ avg: 5, count: 1 }]) as any
  const res = response()

  try {
    await invoke(getProductReviews, { params: { slug: 'mango' } }, res)
    assert.equal(selectedFields.includes('phone'), false)
    assert.equal(selectedFields.includes('userId'), false)
    assert.deepEqual(res.body.reviews, reviews)
    assert.deepEqual(res.body.stats, { avg: 5, count: 1 })
  } finally {
    Product.findOne = originalProductFindOne
    Review.find = originalReviewFind
    Review.aggregate = originalReviewAggregate
  }
})

test('customer complaint responses issue short-lived authenticated photo URLs', async () => {
  const originalFind = Complaint.find
  const originalCountDocuments = Complaint.countDocuments
  const originalPrivateDownloadUrl = cloudinary.utils.private_download_url
  let query: unknown
  let signedOptions: Record<string, unknown> | undefined
  const complaint = {
    toObject: () => ({
      _id: 'complaint-1',
      photos: [{
        url: 'https://res.cloudinary.com/example/image/authenticated/farm/complaint.jpg',
        publicId: 'farm/complaint',
        format: 'jpg',
        accessType: 'authenticated'
      }]
    })
  }
  Complaint.find = ((filter: unknown) => {
    query = filter
    return { sort: () => ({ limit: () => ({ skip: async () => [complaint] }) }) }
  }) as any
  Complaint.countDocuments = (async () => 1) as any
  cloudinary.utils.private_download_url = ((_publicId: string, _format: string, options: Record<string, unknown>) => {
    signedOptions = options
    return 'https://api.cloudinary.com/signed-download'
  }) as any
  const res = response()

  try {
    await invoke(getMyComplaints, { user: { _id: 'customer-1' }, query: { page: 1, limit: 100 } }, res)
    assert.deepEqual(query, { userId: 'customer-1' })
    assert.deepEqual(res.body.complaints[0].photos, [{ url: 'https://api.cloudinary.com/signed-download' }])
    assert.equal(signedOptions?.type, 'authenticated')
    assert.equal(signedOptions?.resource_type, 'image')
    assert.equal(signedOptions?.attachment, false)
    assert.equal(Number(signedOptions?.expires_at) > Math.floor(Date.now() / 1000), true)
  } finally {
    Complaint.find = originalFind
    Complaint.countDocuments = originalCountDocuments
    cloudinary.utils.private_download_url = originalPrivateDownloadUrl
  }
})

test('paymentController returns configured direct-UPI options without provider calls', () => {
  const oldUpiId = process.env.UPI_ID
  const oldUpiName = process.env.UPI_NAME
  process.env.UPI_ID = 'farm@example'
  process.env.UPI_NAME = ' Farm Shop '
  const res = response()

  try {
    getPaymentOptions({}, res)
    assert.deepEqual(res.body, {
      success: true,
      directUpi: { enabled: true, upiId: 'farm@example', upiName: 'Farm Shop' }
    })
  } finally {
    if (oldUpiId === undefined) delete process.env.UPI_ID
    else process.env.UPI_ID = oldUpiId
    if (oldUpiName === undefined) delete process.env.UPI_NAME
    else process.env.UPI_NAME = oldUpiName
  }
})

test('miscController leaves failed subscriber notifications pending for retry', async () => {
  const Product = (await import('../../src/models/Product.js')).default
  const originalFindById = Product.findById
  const originalFind = NotifyMe.find
  const originalUpdateMany = NotifyMe.updateMany
  const originalDeliveryCreate = NotificationDelivery.create
  const originalDeliveryFindOneAndUpdate = NotificationDelivery.findOneAndUpdate
  const originalDeliveryUpdateOne = NotificationDelivery.updateOne
  const originalDeliveryFindById = NotificationDelivery.findById
  const originalAuditCreate = AdminAuditLog.create
  const originalNodeEnv = process.env.NODE_ENV
  const originalWaKey = process.env.WA_API_KEY
  const originalWaUrl = process.env.WA_API_URL
  let updateQuery: unknown
  process.env.NODE_ENV = 'production'
  delete process.env.WA_API_KEY
  delete process.env.WA_API_URL
  Product.findById = (async () => ({ name: 'Mango' })) as any
  NotifyMe.find = (async () => [{ _id: 'subscriber-1', phone: '9876543210' }]) as any
  NotifyMe.updateMany = (async (query: unknown) => { updateQuery = query }) as any
  NotificationDelivery.create = (async (data: any) => ({ ...data, _id: 'delivery-1' })) as any
  NotificationDelivery.findOneAndUpdate = (async () => ({ _id: 'delivery-1', status: 'sending' })) as any
  NotificationDelivery.updateOne = (async () => ({ modifiedCount: 1 })) as any
  NotificationDelivery.findById = (async () => ({ _id: 'delivery-1', status: 'failed' })) as any
  AdminAuditLog.create = (async () => ({})) as any
  const res = response()

  try {
    await invoke(adminSendNotifications, {
      body: { productId: 'product-1' },
      user: { _id: '507f1f77bcf86cd799439011' }
    }, res)
    assert.equal(updateQuery, undefined)
    assert.deepEqual(res.body, {
      success: true,
      message: 'Notified 0 subscribers; 1 remain queued for retry.',
      sent: 0,
      failed: 1
    })
  } finally {
    Product.findById = originalFindById
    NotifyMe.find = originalFind
    NotifyMe.updateMany = originalUpdateMany
    NotificationDelivery.create = originalDeliveryCreate
    NotificationDelivery.findOneAndUpdate = originalDeliveryFindOneAndUpdate
    NotificationDelivery.updateOne = originalDeliveryUpdateOne
    NotificationDelivery.findById = originalDeliveryFindById
    AdminAuditLog.create = originalAuditCreate
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalWaKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWaKey
    if (originalWaUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWaUrl
  }
})

test('miscController lists notification deliveries without exposing retry payloads', async () => {
  const originalCount = NotificationDelivery.countDocuments
  const originalFind = NotificationDelivery.find
  let query: unknown
  let projection = ''
  NotificationDelivery.countDocuments = (async (filter: unknown) => { query = filter; return 1 }) as any
  NotificationDelivery.find = ((filter: unknown) => {
    query = filter
    return {
      select(value: string) {
        projection = value
        return this
      },
      sort() { return this },
      limit() { return this },
      skip() { return Promise.resolve([{ _id: 'delivery-1', status: 'failed' }]) }
    }
  }) as any
  const res = response()

  try {
    await invoke(adminGetNotificationDeliveries, { query: { status: 'failed', page: '2', limit: '25' } }, res)
    assert.deepEqual(query, { status: 'failed' })
    assert.equal(projection, '-params')
    assert.deepEqual(res.body, {
      success: true,
      total: 1,
      page: 2,
      deliveries: [{ _id: 'delivery-1', status: 'failed' }]
    })
  } finally {
    NotificationDelivery.countDocuments = originalCount
    NotificationDelivery.find = originalFind
  }
})

test('miscController validates notification retry IDs before lookup', async () => {
  const res = response()
  await invoke(adminRetryNotification, { params: { id: 'not-an-id' } }, res)
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { success: false, message: 'Invalid notification ID.' })
})

test('miscController returns paginated audit history filtered by action', async () => {
  const originalCount = AdminAuditLog.countDocuments
  const originalFind = AdminAuditLog.find
  let query: unknown
  let sort: unknown
  AdminAuditLog.countDocuments = (async (filter: unknown) => { query = filter; return 12 }) as any
  AdminAuditLog.find = ((filter: unknown) => {
    query = filter
    return {
      sort(value: unknown) {
        sort = value
        return this
      },
      skip() { return this },
      limit() { return this },
      populate() { return Promise.resolve([{ action: 'coupon_created' }]) }
    }
  }) as any
  const res = response()

  try {
    await invoke(adminGetAuditLogs, { query: { action: 'coupon_created', page: '2', limit: '5' } }, res)
    assert.deepEqual(query, { action: 'coupon_created' })
    assert.deepEqual(sort, { createdAt: -1, _id: -1 })
    assert.deepEqual(res.body, {
      success: true,
      total: 12,
      page: 2,
      logs: [{ action: 'coupon_created' }]
    })
  } finally {
    AdminAuditLog.countDocuments = originalCount
    AdminAuditLog.find = originalFind
  }
})

test('miscController normalizes coupon codes and caps percentage discounts', async () => {
  const originalFindOne = Coupon.findOne
  let query: unknown
  Coupon.findOne = (async (filter: unknown) => {
    query = filter
    return {
      type: 'percent',
      value: 15,
      maxDiscount: 250,
      minOrderAmount: 100,
      validFrom: null,
      expiresAt: null,
      usedCount: 0,
      usageLimit: 20,
      perUserLimit: 1,
      usedBy: []
    }
  }) as any
  const res = response()

  try {
    await invoke(applyCoupon, {
      body: { code: '  save15 ', subtotal: 2500 },
      user: { _id: 'user-1' }
    }, res)
    assert.deepEqual(query, { code: 'SAVE15', isActive: true })
    assert.deepEqual(res.body, {
      success: true,
      discount: 250,
      description: '15% off (max ₹250)',
      couponType: 'percent',
      code: 'SAVE15',
      minOrderAmount: 100,
      maxDiscount: 250
    })
  } finally {
    Coupon.findOne = originalFindOne
  }
})

test('miscController rejects unavailable coupons with specific reasons', async () => {
  const originalFindOne = Coupon.findOne
  const cases = [
    {
      coupon: null,
      message: 'Coupon "SAVE15" is not valid.'
    },
    {
      coupon: { validFrom: new Date(Date.now() + 60_000), expiresAt: null, usedCount: 0, usageLimit: 10 },
      message: 'This coupon is not active yet.'
    },
    {
      coupon: { validFrom: null, expiresAt: new Date(Date.now() - 60_000), usedCount: 0, usageLimit: 10 },
      message: 'This coupon has expired.'
    },
    {
      coupon: { validFrom: null, expiresAt: null, usedCount: 10, usageLimit: 10 },
      message: 'This coupon has reached its maximum usage limit.'
    }
  ]

  try {
    for (const { coupon, message } of cases) {
      Coupon.findOne = (async () => coupon) as any
      const res = response()
      await invoke(applyCoupon, { body: { code: ' save15 ', subtotal: 500 } }, res)

      assert.equal(res.statusCode, 400)
      assert.deepEqual(res.body, { success: false, message })
    }
  } finally {
    Coupon.findOne = originalFindOne
  }
})

test('miscController enforces minimum order and per-customer coupon limits', async () => {
  const originalFindOne = Coupon.findOne
  Coupon.findOne = (async () => ({
    type: 'flat',
    value: 100,
    minOrderAmount: 500,
    validFrom: null,
    expiresAt: null,
    usedCount: 0,
    usageLimit: 10,
    perUserLimit: 1,
    usedBy: ['user-1']
  })) as any

  try {
    const belowMinimum = response()
    await invoke(applyCoupon, {
      body: { code: 'SAVE15', subtotal: 499 },
      user: { _id: 'user-2' }
    }, belowMinimum)
    assert.equal(belowMinimum.statusCode, 400)
    assert.match(belowMinimum.body.message, /Minimum order of ₹500 required/)

    const alreadyUsed = response()
    await invoke(applyCoupon, {
      body: { code: 'SAVE15', subtotal: 500 },
      user: { _id: 'user-1' }
    }, alreadyUsed)
    assert.equal(alreadyUsed.statusCode, 400)
    assert.equal(alreadyUsed.body.message, 'You have already used this coupon the maximum number of times.')
  } finally {
    Coupon.findOne = originalFindOne
  }
})
