import mongoose from 'mongoose'
import Order from '../models/Order.js'
import { PaymentTransaction } from '../models/index.js'
import { HttpError } from '../utils/httpError.js'

export const confirmManualUpiPayment = async ({ orderId, admin, upiRef, note, paymentMethod }) => {
  const session = await mongoose.startSession()
  let order
  try {
    await session.withTransaction(async () => {
      const method = paymentMethod || 'direct-upi'
      const current = await Order.findOne({
        _id: orderId,
        paymentMethod: method,
        status: method === 'pay-at-farm' ? { $in: ['New', 'Confirmed', 'Packed', 'Pickup-Ready', 'Picked-Up'] } : 'New',
        paymentStatus: 'pending',
        inventoryStatus: { $in: ['reserved', 'committed'] }
      }).session(session)
      if (!current) throw new HttpError(409, 'Order is not awaiting manual payment confirmation.')
      if (current.inventoryExpiresAt && current.inventoryExpiresAt <= new Date()) {
        throw new HttpError(409, 'The inventory reservation expired. Reconcile the late payment instead of confirming this order.')
      }

      const reference = String(upiRef || '').trim()
      const paymentId = reference || `${method.toUpperCase()}-${current.orderNumber}`
      const nextStatus = current.status === 'New' ? 'Confirmed' : current.status
      order = await Order.findOneAndUpdate({
        _id: current._id,
        status: current.status,
        paymentStatus: 'pending',
        inventoryStatus: current.inventoryStatus
      }, {
        $set: {
          paymentStatus: 'paid',
          status: nextStatus,
          inventoryStatus: 'committed',
          inventoryExpiresAt: null,
          paymentConfirmedAt: new Date(),
          paymentConfirmedBy: admin?._id,
          utrNumber: reference || current.utrNumber
        },
        $push: { statusHistory: {
          status: nextStatus,
          note: `${method === 'pay-at-farm' ? 'Pay-at-farm payment collected' : 'Direct UPI payment confirmed'}. Ref: ${reference || 'not supplied'}${note ? `; ${note}` : ''}`,
          adminId: admin?._id,
          adminName: admin?.name,
          time: new Date()
        } }
      }, { new: true, session })
      if (!order) throw new HttpError(409, 'Order payment state changed; reload before confirming.')

      await PaymentTransaction.create([{
        orderId: current._id,
        orderNumber: current.orderNumber,
        provider: method,
        providerPaymentId: paymentId,
        amount: current.total,
        currency: 'INR',
        status: 'paid',
        source: 'admin-confirm',
        confirmedBy: admin?._id,
        confirmedAt: new Date(),
        metadata: { note }
      }], { session })
    })
  } finally {
    await session.endSession()
  }
  return order
}
