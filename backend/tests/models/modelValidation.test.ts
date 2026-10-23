import assert from 'node:assert/strict'
import test from 'node:test'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import Category from '../../src/models/Category.js'
import Order from '../../src/models/Order.js'
import Product from '../../src/models/Product.js'
import User from '../../src/models/User.js'
import { Coupon } from '../../src/models/index.js'

test('user schema normalizes email and applies customer defaults', () => {
  const user = new User({ name: '  Sam  ', email: ' SAM@EXAMPLE.COM ', password: 'password123' })
  assert.equal(user.name, 'Sam')
  assert.equal(user.email, 'sam@example.com')
  assert.equal(user.role, 'customer')
  assert.equal(user.isBlocked, false)
  assert.equal(user.authVersion, 0)
  assert.equal(user.password, 'password123')
})

test('user validation rejects missing required fields and invalid role', async () => {
  const missing = new User()
  await assert.rejects(missing.validate(), (err: any) => {
    assert.equal(err.name, 'ValidationError')
    assert.ok(err.errors.name)
    assert.ok(err.errors.email)
    assert.ok(err.errors.password)
    return true
  })

  const invalid = new User({ name: 'Sam', email: 'sam@example.com', password: 'password123', role: 'owner' })
  await assert.rejects(invalid.validate(), (err: any) => Boolean(err.errors.role))
})

test('user password helpers hash credentials and persist only a password-reset digest', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4)
  const user: any = new User({
    name: 'Sam',
    email: 'sam@example.com',
    password: passwordHash
  })
  assert.equal(await user.comparePassword('correct-password'), true)
  assert.equal(await user.comparePassword('incorrect-password'), false)

  const rawToken = user.createPasswordResetToken()
  const expectedDigest = crypto.createHash('sha256').update(rawToken).digest('hex')
  assert.match(rawToken, /^[a-f0-9]{64}$/)
  assert.equal(user.passwordResetToken, expectedDigest)
  assert.notEqual(user.passwordResetToken, rawToken)
  assert.ok(user.passwordResetExpires instanceof Date)
  assert.ok(user.passwordResetExpires.getTime() > Date.now())
  assert.ok(user.passwordResetExpires.getTime() <= Date.now() + 30 * 60 * 1000)
})

test('category defaults and required field validation work without database access', async () => {
  const category = new Category({ name: '  Fruit  ', slug: 'FRUIT' })
  assert.equal(category.name, 'Fruit')
  assert.equal(category.slug, 'fruit')
  assert.equal(category.emoji, '🥭')
  assert.equal(category.isActive, true)
  assert.equal(category.sortOrder, 0)

  await assert.rejects(new Category().validate(), (err: any) => {
    assert.ok(err.errors.name)
    assert.ok(err.errors.slug)
    return true
  })
})

test('order schema applies payment and fulfillment defaults and validates enums', async () => {
  const order = new Order({
    customer: { name: 'Sam', phone: '1234567890' },
    deliveryType: 'pickup',
    totalKg: 3,
    subtotal: 100,
    total: 100,
    paymentMethod: 'pay-at-farm'
  })
  assert.equal(order.paymentStatus, 'pending')
  assert.equal(order.status, 'New')
  assert.equal(order.packaging, 'standard')
  assert.equal(order.packagingFee, 0)
  await order.validate()

  order.set('paymentMethod', 'cash')
  await assert.rejects(order.validate(), (err: any) => Boolean(err.errors.paymentMethod))
})

test('order delivery address snapshots require an Indian recipient phone and PIN', async () => {
  const order = new Order({
    customer: { name: 'Sam', phone: '1234567890' },
    deliveryType: 'home',
    deliveryAddress: {
      fullName: 'Recipient',
      phone: '9876543210',
      line1: '1 Farm Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001'
    },
    totalKg: 3,
    subtotal: 100,
    total: 100,
    paymentMethod: 'razorpay-upi'
  })
  await order.validate()

  order.deliveryAddress.phone = '1234567890'
  order.deliveryAddress.pincode = '012345'
  await assert.rejects(order.validate(), (err: any) => {
    assert.ok(err.errors['deliveryAddress.phone'])
    assert.ok(err.errors['deliveryAddress.pincode'])
    return true
  })
})

test('product schema validates required fields, seasonal enum, images, and non-negative stock', async () => {
  const product = new Product()
  await assert.rejects(product.validate(), (err: any) => {
    assert.ok(err.errors.name)
    assert.ok(err.errors.slug)
    assert.ok(err.errors.category)
    assert.ok(err.errors.description)
    return true
  })

  const invalid = new Product({
    name: 'Mango',
    slug: 'MANGO',
    category: '507f1f77bcf86cd799439011',
    description: 'Fresh mangoes',
    seasonalStatus: 'winter-only',
    variants: [{ weight: '1 kg', price: 100, mrp: 120, stock: -1 }],
    images: [{ url: '', publicId: '' }]
  })
  await assert.rejects(invalid.validate(), (err: any) => {
    assert.ok(err.errors.seasonalStatus)
    assert.ok(err.errors['variants.0.stock'])
    assert.ok(err.errors['images.0.url'])
    assert.ok(err.errors['images.0.publicId'])
    return true
  })
})

test('coupon schema applies defaults, normalizes codes, and rejects invalid type', async () => {
  const coupon = new Coupon({ code: 'save15', type: 'percent', value: 15 })
  assert.equal(coupon.code, 'SAVE15')
  assert.equal(coupon.isActive, true)
  assert.equal(coupon.minOrderAmount, 0)
  assert.equal(coupon.usageLimit, 1000)
  assert.equal(coupon.perUserLimit, 1)
  await coupon.validate()

  const invalid = new Coupon({ code: 'SAVE15', type: 'bogus', value: 15 })
  await assert.rejects(invalid.validate(), (err: any) => Boolean(err.errors.type))
  assert.ok(Coupon.schema.indexes().some(([keys, options]) =>
    keys.code === 1 && options.unique === true
  ))
})

test('order schema requires item snapshots and declares a partial idempotency index', async () => {
  const order = new Order({
    customer: { name: 'Sam', phone: '1234567890' },
    deliveryType: 'home',
    totalKg: 1,
    subtotal: 100,
    total: 100,
    paymentMethod: 'pay-at-farm',
    items: [{ qty: 1 }]
  })
  await assert.rejects(order.validate(), (err: any) => {
    assert.ok(err.errors['items.0.name'])
    assert.ok(err.errors['items.0.weight'])
    assert.ok(err.errors['items.0.price'])
    assert.ok(err.errors['items.0.subtotal'])
    return true
  })

  assert.ok(Order.schema.indexes().some(([keys, options]) =>
    keys.userId === 1 &&
    keys.idempotencyKey === 1 &&
    options.unique === true &&
    options.partialFilterExpression?.idempotencyKey?.$type === 'string'
  ))
})
