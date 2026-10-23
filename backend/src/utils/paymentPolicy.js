const PENDING_ONLINE_PAYMENT_METHODS = [
  'direct-upi',
  'razorpay-upi',
  'razorpay-card',
  'razorpay-nb'
]

export const isDirectUpiAvailable = (subtotal, upiId) =>
  Number(subtotal) > 2000 && Boolean(String(upiId || '').trim())

export const getPendingPaymentExpiryFilter = (now, legacyExpiry = now) => ({
  paymentMethod: { $in: PENDING_ONLINE_PAYMENT_METHODS },
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

export const getExpiredPickupReservationFilter = (now) => ({
  paymentMethod: 'pay-at-farm',
  paymentStatus: 'pending',
  status: 'New',
  inventoryStatus: 'reserved',
  inventoryExpiresAt: { $lte: now }
})