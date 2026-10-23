import assert from 'node:assert/strict'
import test from 'node:test'
import { Coupon } from '../../src/models/index.js'
import { releaseCouponRedemption } from '../../src/services/couponService.js'

test('cancelling one order releases only one redemption for a repeat customer', async () => {
  const originalFindOne = Coupon.findOne
  const originalUpdateOne = Coupon.updateOne
  const userId = '507f1f77bcf86cd799439011'
  const coupon = {
    _id: '507f191e810c19729de860ea',
    usedCount: 3,
    usedBy: [userId, userId, '507f191e810c19729de860eb']
  }
  let update: any
  Coupon.findOne = (() => ({ session: async () => coupon })) as any
  Coupon.updateOne = (async (filter: any, changes: any, options: any) => {
    update = { filter, changes, options }
    return { modifiedCount: 1 }
  }) as any
  const session = { id: 'transaction' }

  try {
    assert.equal(await releaseCouponRedemption('SAVE10', userId, session), true)
    assert.deepEqual(update.changes.$set.usedBy, [userId, '507f191e810c19729de860eb'])
    assert.equal(update.changes.$inc.usedCount, -1)
    assert.equal(update.filter.usedCount, 3)
    assert.equal(update.options.session, session)
  } finally {
    Coupon.findOne = originalFindOne
    Coupon.updateOne = originalUpdateOne
  }
})
