import test from 'node:test'
import assert from 'node:assert/strict'
import { getExpiredPickupReservationFilter, getPendingPaymentExpiryFilter, isDirectUpiAvailable } from '../../src/utils/paymentPolicy.js'

test('direct UPI requires a configured VPA and subtotal above 2000', () => {
  assert.equal(isDirectUpiAvailable(2000, 'farm@upi'), false)
  assert.equal(isDirectUpiAvailable(2000.01, 'farm@upi'), true)
  assert.equal(isDirectUpiAvailable(2500, ''), false)
})

test('expires online reservations at their deadline and supports legacy orders', () => {
  const now = new Date('2026-10-09T00:00:00.000Z')
  const legacyExpiry = new Date('2026-10-08T00:00:00.000Z')
  const filter = getPendingPaymentExpiryFilter(now, legacyExpiry)

  assert.deepEqual(filter, {
    paymentMethod: { $in: ['direct-upi', 'razorpay-upi', 'razorpay-card', 'razorpay-nb'] },
    paymentStatus: 'pending',
    status: 'New',
    $and: [
      { $or: [{ inventoryStatus: 'reserved' }, { inventoryStatus: { $exists: false } }] },
      { $or: [
        { inventoryExpiresAt: { $lte: now } },
        { inventoryExpiresAt: { $exists: false }, createdAt: { $lte: legacyExpiry } }
      ] }
    ]
  })
  assert.equal(filter.paymentMethod.$in.includes('pay-at-farm'), false)
})

test('expires no-show pickup reservations independently from online payments', () => {
  const now = new Date('2026-10-09T00:00:00.000Z')
  assert.deepEqual(getExpiredPickupReservationFilter(now), {
    paymentMethod: 'pay-at-farm',
    paymentStatus: 'pending',
    status: 'New',
    inventoryStatus: 'reserved',
    inventoryExpiresAt: { $lte: now }
  })
})