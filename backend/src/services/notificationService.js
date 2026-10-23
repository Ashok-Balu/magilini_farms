import axios from 'axios'
import { NotificationDelivery } from '../models/index.js'

export const sendSMS = async (phone, message) => {
  console.log('SMS simulated.')
  return true
}

const notificationError = (error) => {
  const status = Number(error?.response?.status)
  return Number.isInteger(status) ? `WhatsApp provider returned HTTP ${status}.` : 'WhatsApp provider request failed.'
}

const dispatchWAMessage = async (delivery) => {
  const claimed = await NotificationDelivery.findOneAndUpdate(
    { _id: delivery._id, status: { $in: ['pending', 'failed'] } },
    { $set: { status: 'sending', lastError: null }, $inc: { attempts: 1 } },
    { new: true }
  )
  if (!claimed) return false

  const simulate = process.env.NODE_ENV !== 'production' && process.env.ENABLE_REAL_NOTIFICATIONS !== 'true'
  if (simulate) {
    await NotificationDelivery.updateOne(
      { _id: claimed._id, status: 'sending' },
      { $set: { status: 'simulated', sentAt: new Date(), lastError: null } }
    )
    console.log(`WhatsApp simulated -> ${claimed.templateName}`)
    return true
  }

  if (!process.env.WA_API_KEY || !process.env.WA_API_URL) {
    await NotificationDelivery.updateOne(
      { _id: claimed._id, status: 'sending' },
      { $set: { status: 'failed', lastError: 'WhatsApp provider is not configured.', sentAt: null } }
    )
    console.error('WhatsApp not sent: WA_API_KEY and WA_API_URL are required.')
    return false
  }

  try {
    await axios.post(process.env.WA_API_URL, {
      countryCode: '+91',
      phoneNumber: claimed.recipient,
      callbackData: 'order-update',
      type: 'Template',
      template: { name: claimed.templateName, languageCode: 'en', bodyValues: claimed.params }
    }, {
      headers: { Authorization: `Basic ${process.env.WA_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 10000
    })
    await NotificationDelivery.updateOne(
      { _id: claimed._id, status: 'sending' },
      { $set: { status: 'delivered', sentAt: new Date(), lastError: null } }
    )
    return true
  } catch (error) {
    const message = notificationError(error)
    await NotificationDelivery.updateOne(
      { _id: claimed._id, status: 'sending' },
      { $set: { status: 'failed', lastError: message, sentAt: null } }
    )
    console.error(`WhatsApp delivery failed: ${message}`)
    return false
  }
}

export const sendWAMessage = async (phone, templateName, params = [], { orderNumber } = {}) => {
  const delivery = await NotificationDelivery.create({
    channel: 'whatsapp',
    recipient: String(phone || ''),
    templateName,
    params: params.map(String),
    orderNumber
  })
  return dispatchWAMessage(delivery)
}

export const retryWAMessage = async (deliveryId) => {
  const delivery = await NotificationDelivery.findById(deliveryId)
  if (!delivery) return null
  if (delivery.status !== 'failed') return { delivery, sent: false, reason: 'Only failed notifications can be retried.' }
  const sent = await dispatchWAMessage(delivery)
  const updated = await NotificationDelivery.findById(delivery._id)
  return { delivery: updated, sent, reason: sent ? undefined : 'Notification delivery failed.' }
}

export const notifyOrderPlaced = async (order) => {
  const customerSent = await sendWAMessage(
    order.customer.phone,
    'order_received',
    [order.orderNumber, String(order.total)],
    { orderNumber: order.orderNumber }
  )

  const adminMsg = `New Order!\n${order.orderNumber}\n${order.customer.name} — ${order.customer.phone}\nTotal: ₹${order.total}\nType: ${order.deliveryType}\nPayment: ${order.paymentMethod}`
  await sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), adminMsg)
  return customerSent
}

export const notifyStatusUpdate = async (order) => {
  const messages = {
    Confirmed: 'Your order is confirmed and being prepared.',
    Packed: 'Your order is packed and ready for dispatch.',
    Shipped: `Your order is on the way.${order.courierTracking ? ` Track: ${order.courierName} #${order.courierTracking}` : ''}`,
    Delivered: 'Your order has been delivered. Enjoy!',
    'Pickup-Ready': 'Your order is ready for pickup.',
    'Picked-Up': 'Your order has been picked up. Thank you!',
    Cancelled: 'Your order has been cancelled. Contact support for assistance.'
  }
  if (!messages[order.status]) return false
  return sendWAMessage(
    order.customer.phone,
    `status_${order.status.toLowerCase()}`,
    [order.orderNumber],
    { orderNumber: order.orderNumber }
  )
}

export const notifyLowStock = async (productName, weight, stock) => {
  const msg = `Low Stock Alert!\n${productName} (${weight}): only ${stock} units left.`
  return sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifyComplaintReceived = async (complaint) => {
  const msg = `New Damage Complaint!\n${complaint.complaintNumber}\nOrder: ${complaint.orderId}\nPhone: ${complaint.phone}`
  return sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifyBulkEnquiry = async (enquiry) => {
  const msg = `New Bulk Enquiry!\n${enquiry.name} — ${enquiry.phone}\nVariety: ${enquiry.variety}\nQty: ${enquiry.quantity}\nCity: ${enquiry.city}`
  return sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifySeasonAvailable = async (phone, productName) =>
  sendWAMessage(phone, 'season_available', [productName])
