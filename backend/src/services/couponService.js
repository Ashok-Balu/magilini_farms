import { Coupon } from '../models/index.js'
import { logger } from '../utils/logger.js'
import { HttpError } from '../utils/httpError.js'

export const releaseCouponRedemption = async (couponCode, userId, session) => {
  const coupon = await Coupon.findOne({ code: couponCode }).session(session)
  if (!coupon) {
    logger.warn('Coupon redemption could not be released because the coupon no longer exists.', {
      couponCode, userId
    })
    return false
  }

  const usedBy = [...(coupon.usedBy || [])]
  const redemptionIndex = usedBy.findIndex(id => String(id) === String(userId))
  if (redemptionIndex === -1 || coupon.usedCount <= 0) {
    logger.warn('Coupon redemption could not be released because coupon usage data is inconsistent.', {
      couponCode, userId, usedCount: coupon.usedCount
    })
    return false
  }

  usedBy.splice(redemptionIndex, 1)
  const result = await Coupon.updateOne({
    _id: coupon._id,
    usedCount: coupon.usedCount,
    usedBy: coupon.usedBy
  }, {
    $set: { usedBy },
    $inc: { usedCount: -1 }
  }, { session })

  if (!result.modifiedCount) {
    throw new HttpError(409, 'Coupon redemption changed while cancellation was being processed.')
  }

  return true
}
