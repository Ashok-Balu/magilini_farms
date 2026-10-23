import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addressSchema,
  adminCouponSchema,
  adminLoginSchema,
  adminPincodeSchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminProductStockSchema,
  authForgotPasswordSchema,
  authLoginSchema,
  authRegisterSchema,
  authResetPasswordSchema,
  couponApplySchema,
  customerProfileUpdateSchema,
  paymentConfirmUpiSchema,
  paymentCreateOrderSchema,
  paymentSubmitUpiReferenceSchema,
  paymentVerifySchema,
  pincodeCheckSchema,
  idParamsSchema,
  orderCreateSchema,
  paginationQuerySchema,
  adminOrderListQuerySchema
} from '../../src/validators/apiValidators.js'

test('registration accepts valid details and an omitted or empty optional phone', () => {
  for (const phone of [undefined, '']) {
    const body = { name: '  Customer  ', email: 'customer@example.com', password: 'password123', confirmPassword: 'password123' }
    if (phone !== undefined) Object.assign(body, { phone })
    assert.equal(authRegisterSchema.safeParse({ body }).success, true)
  }
})

test('registration rejects blank names, malformed emails, short passwords, and malformed phones', () => {
  const valid = { name: 'Customer', email: 'customer@example.com', password: 'password123', confirmPassword: 'password123' }
  for (const body of [
    { ...valid, name: '   ' },
    { ...valid, email: 'not-an-email' },
    { ...valid, password: 'short' },
    { ...valid, phone: '12345' }
  ]) {
    assert.equal(authRegisterSchema.safeParse({ body }).success, false)
  }
})

test('login and forgot-password require valid email addresses', () => {
  assert.equal(authLoginSchema.safeParse({ body: { email: 'customer@example.com', password: 'secret' } }).success, true)
  assert.equal(authLoginSchema.safeParse({ body: { email: 'invalid', password: 'secret' } }).success, false)
  assert.equal(authLoginSchema.safeParse({ body: { email: 'customer@example.com', password: '' } }).success, false)
  assert.equal(authForgotPasswordSchema.safeParse({ body: { email: 'customer@example.com' } }).success, true)
  assert.equal(authForgotPasswordSchema.safeParse({ body: { email: '' } }).success, false)
})

test('password reset requires a token and a password of at least eight characters', () => {
  assert.equal(authResetPasswordSchema.safeParse({ body: { token: 'reset-token', password: 'password123' } }).success, true)
  assert.equal(authResetPasswordSchema.safeParse({ body: { token: '', password: 'password123' } }).success, false)
  assert.equal(authResetPasswordSchema.safeParse({ body: { token: 'reset-token', password: 'short' } }).success, false)
})

test('profile updates accept optional valid fields and reject invalid email or phone', () => {
  assert.equal(customerProfileUpdateSchema.safeParse({ body: {} }).success, true)
  assert.equal(customerProfileUpdateSchema.safeParse({ body: { name: ' Customer ', phone: '' } }).success, true)
  assert.equal(customerProfileUpdateSchema.safeParse({ body: { email: 'invalid' } }).success, false)
  assert.equal(customerProfileUpdateSchema.safeParse({ body: { phone: '123' } }).success, false)
})

test('addresses require valid contact, location, and six-digit pincode fields', () => {
  const body = {
    fullName: 'Customer',
    phone: '9876543210',
    line1: '1 Farm Road',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600001',
    type: 'home'
  }
  assert.equal(addressSchema.safeParse({ body }).success, true)
  for (const invalid of [
    { ...body, phone: '98765' },
    { ...body, line1: ' ' },
    { ...body, pincode: '60001' },
    { ...body, type: 'warehouse' }
  ]) {
    assert.equal(addressSchema.safeParse({ body: invalid }).success, false)
  }
})

test('admin login validates the email and minimum password length', () => {
  assert.equal(adminLoginSchema.safeParse({ body: { email: 'admin@example.com', password: 'password123' } }).success, true)
  assert.equal(adminLoginSchema.safeParse({ body: { email: 'invalid', password: 'password123' } }).success, false)
  assert.equal(adminLoginSchema.safeParse({ body: { email: 'admin@example.com', password: 'short' } }).success, false)
})

test('payment order creation requires an order id', () => {
  assert.equal(paymentCreateOrderSchema.safeParse({ body: { orderId: '507f1f77bcf86cd799439011' } }).success, true)
  assert.equal(paymentCreateOrderSchema.safeParse({ body: { orderId: '' } }).success, false)
})

test('payment verification requires all Razorpay identifiers and signatures', () => {
  const body = {
    razorpay_order_id: 'provider-order',
    razorpay_payment_id: 'provider-payment',
    razorpay_signature: 'signature',
    orderId: '507f1f77bcf86cd799439011'
  }
  assert.equal(paymentVerifySchema.safeParse({ body }).success, true)
  for (const field of Object.keys(body)) {
    assert.equal(paymentVerifySchema.safeParse({ body: { ...body, [field]: '' } }).success, false)
  }
})

test('UPI confirmation permits an omitted reference but requires an order id', () => {
  assert.equal(paymentConfirmUpiSchema.safeParse({ body: { orderId: '507f1f77bcf86cd799439011' } }).success, true)
  assert.equal(paymentConfirmUpiSchema.safeParse({ body: { orderId: '507f1f77bcf86cd799439011', upiRef: 'ref-1' } }).success, true)
  assert.equal(paymentConfirmUpiSchema.safeParse({ body: { orderId: '' } }).success, false)
})

test('UPI reference submission enforces length and allowed characters', () => {
  const valid = { orderId: '507f1f77bcf86cd799439011', upiRef: 'ABC12345' }
  assert.equal(paymentSubmitUpiReferenceSchema.safeParse({ body: valid }).success, true)
  assert.equal(paymentSubmitUpiReferenceSchema.safeParse({ body: { ...valid, orderId: 'not-an-object-id' } }).success, false)
  for (const upiRef of ['12345', 'has spaces', 'invalid@ref', 'a'.repeat(51)]) {
    assert.equal(paymentSubmitUpiReferenceSchema.safeParse({ body: { ...valid, upiRef } }).success, false)
  }
})

test('coupon application trims codes and requires a non-negative numeric subtotal', () => {
  assert.equal(couponApplySchema.safeParse({ body: { code: ' SAVE10 ', subtotal: '100' } }).success, true)
  assert.equal(couponApplySchema.safeParse({ body: { code: ' ', subtotal: 100 } }).success, false)
  assert.equal(couponApplySchema.safeParse({ body: { code: 'SAVE10', subtotal: '-1' } }).success, false)
  assert.equal(couponApplySchema.safeParse({ body: { code: 'SAVE10', subtotal: 'invalid' } }).success, false)
})

test('pincode checks accept only valid six-digit Indian PINs', () => {
  assert.equal(pincodeCheckSchema.safeParse({ params: { pin: '600001' } }).success, true)
  for (const pin of ['12345', '1234567', '12A456', '012345']) {
    assert.equal(pincodeCheckSchema.safeParse({ params: { pin } }).success, false)
  }
})

test('admin product creation parses valid variants and rejects malformed or invalid variants', () => {
  const body = {
    name: 'Mango',
    category: '507f1f77bcf86cd799439012',
    description: 'Fresh mangoes',
    variants: JSON.stringify([{ weight: '1 kg', price: '200', mrp: 250, stock: 5 }])
  }
  const parsed = adminProductCreateSchema.safeParse({ body })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.body.variants[0].price, 200)
    assert.equal(parsed.data.body.variants[0].stock, 5)
  }

  for (const variants of [
    'not-json',
    '[]',
    JSON.stringify([{ weight: '1 kg', price: 0, mrp: 250, stock: 5 }]),
    JSON.stringify([{ weight: '1 kg', price: 200, mrp: 250, stock: -1 }])
  ]) {
    assert.equal(adminProductCreateSchema.safeParse({ body: { ...body, variants } }).success, false)
  }
})

test('admin stock adjustments permit zero but reject negative stock or a missing variant id', () => {
  assert.equal(adminProductStockSchema.safeParse({ body: { variantId: '507f1f77bcf86cd799439013', stock: 0 } }).success, true)
  assert.equal(adminProductStockSchema.safeParse({ body: { variantId: '', stock: 1 } }).success, false)
  assert.equal(adminProductStockSchema.safeParse({ body: { variantId: '507f1f77bcf86cd799439013', stock: -1 } }).success, false)
})

test('admin pincode rules validate serviceability, zone, fee, and estimated delivery', () => {
  const body = {
    pincode: '600001',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zone: 'tamil-nadu',
    deliveryFee: 0,
    estimatedDays: '2-3 days'
  }
  assert.equal(adminPincodeSchema.safeParse({ body }).success, true)
  for (const invalid of [
    { ...body, pincode: '60001' },
    { ...body, pincode: '012345' },
    { ...body, zone: 'unknown' },
    { ...body, deliveryFee: -1 },
    { ...body, estimatedDays: ' ' }
  ]) {
    assert.equal(adminPincodeSchema.safeParse({ body: invalid }).success, false)
  }
})

test('admin coupons validate type, value, and positive usage limits', () => {
  const body = { code: 'SAVE10', type: 'percent', value: 10, usageLimit: 5, perUserLimit: 1 }
  assert.equal(adminCouponSchema.safeParse({ body }).success, true)
  for (const invalid of [
    { ...body, type: 'unknown' },
    { ...body, value: -1 },
    { ...body, usageLimit: 0 },
    { ...body, perUserLimit: -1 }
  ]) {
    assert.equal(adminCouponSchema.safeParse({ body: invalid }).success, false)
  }
})

test('order requests validate IDs, whole quantities, and discard client-calculated amounts', () => {
  const body = {
    deliveryType: 'pickup',
    pickupDate: '2030-01-01',
    paymentMethod: 'pay-at-farm',
    items: [{ productId: '507f1f77bcf86cd799439011', variantId: '507f1f77bcf86cd799439012', qty: '2' }],
    subtotal: 0,
    total: 0,
    deliveryFee: 0,
    couponDiscount: 999999,
    status: 'Delivered'
  }
  const parsed = orderCreateSchema.safeParse({ body })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.body.items[0].qty, 2)
    assert.equal('total' in parsed.data.body, false)
    assert.equal('status' in parsed.data.body, false)
  }

  for (const qty of [0, -1, 1.5, 'NaN', 'Infinity', 10001]) {
    assert.equal(orderCreateSchema.safeParse({ body: { ...body, items: [{ ...body.items[0], qty }] } }).success, false)
  }
  assert.equal(orderCreateSchema.safeParse({
    body: { ...body, items: [{ ...body.items[0], productId: 'invalid-id' }] }
  }).success, false)
})

test('home-delivery order snapshots require recipient details and pay-at-farm is pickup-only', () => {
  const body = {
    deliveryType: 'home',
    deliveryAddress: {
      fullName: 'Recipient',
      phone: '9876543210',
      line1: '1 Farm Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001'
    },
    paymentMethod: 'razorpay-upi',
    items: [{ productId: '507f1f77bcf86cd799439011', variantId: '507f1f77bcf86cd799439012', qty: 1 }]
  }

  assert.equal(orderCreateSchema.safeParse({ body }).success, true)
  assert.equal(orderCreateSchema.safeParse({
    body: { ...body, paymentMethod: 'pay-at-farm' }
  }).success, false)
  assert.equal(orderCreateSchema.safeParse({
    body: { ...body, deliveryAddress: { ...body.deliveryAddress, fullName: undefined } }
  }).success, false)
})

test('admin product updates strip mass-assignment fields and validate weight and prices', () => {
  const body = { name: 'Mango', isActive: 'false', role: 'admin', variants: JSON.stringify([
    { weight: '250 g', price: '125', mrp: '150', stock: '4' }
  ]) }
  const parsed = adminProductUpdateSchema.safeParse({ body })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.body.isActive, false)
    assert.equal('role' in parsed.data.body, false)
    assert.equal(parsed.data.body.variants?.[0].stock, 4)
  }
  for (const invalidWeight of ['250 kg-ish', '250 g 1 kg', '0 g', 'piece']) {
    assert.equal(adminProductUpdateSchema.safeParse({
      body: { variants: JSON.stringify([{ weight: invalidWeight, price: 125, mrp: 150, stock: 4 }]) }
    }).success, false)
  }
  assert.equal(adminProductUpdateSchema.safeParse({
    body: { variants: JSON.stringify([{ weight: '250 g', price: 150, mrp: 125, stock: 4 }]) }
  }).success, false)
  assert.equal(adminProductUpdateSchema.safeParse({ body: { isAdmin: true } }).success, false)
})

test('route IDs, dates, and pagination are bounded and reject malformed values', () => {
  assert.equal(idParamsSchema.safeParse({ params: { id: '507f1f77bcf86cd799439011' } }).success, true)
  assert.equal(idParamsSchema.safeParse({ params: { id: 'not-an-object-id' } }).success, false)
  assert.equal(paginationQuerySchema.safeParse({ query: { page: '2', limit: '100' } }).success, true)
  assert.equal(paginationQuerySchema.safeParse({ query: { page: '-2', limit: '5000' } }).success, false)
  assert.equal(adminOrderListQuerySchema.safeParse({ query: { dateFrom: '2026-02-30' } }).success, false)
  assert.equal(adminOrderListQuerySchema.safeParse({ query: { dateFrom: '2026-10-23', dateTo: '2026-10-20' } }).success, false)
})

test('coupon validation rejects out-of-range percentages and inconsistent dates', () => {
  const base = { code: 'SAVE20', type: 'percent', value: 20 }
  assert.equal(adminCouponSchema.safeParse({ body: base }).success, true)
  assert.equal(adminCouponSchema.safeParse({ body: { ...base, value: 101 } }).success, false)
  assert.equal(adminCouponSchema.safeParse({
    body: { ...base, validFrom: '2026-10-25', expiresAt: '2026-10-24' }
  }).success, false)
})
