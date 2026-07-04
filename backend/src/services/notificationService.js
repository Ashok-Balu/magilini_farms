import twilio from 'twilio'
import axios from 'axios'
import { otpConfig } from '../config/otp.js'

const hasTwilioConfig = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER)

const getTwilioClient = () => {
  if (!hasTwilioConfig()) return null
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
}

// ── SMS via Twilio (Phase 1 OTP) ──────────────────────────
export const sendSMS = async (phone, message) => {
  const twilioClient = getTwilioClient()
  if (!twilioClient) {
    console.log(`OTP for ${phone}: ${message.match(/\d{4}/)?.[0] || '1234'}`)
    return true
  }

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   `+91${phone}`
    })
    console.log(`✅ SMS sent to ${phone}`)
    return true
  } catch (err) {
    console.error(`❌ SMS failed: ${err.message}`)
    return false
  }
}

// ── WhatsApp Business API (Phase 2) ───────────────────────
export const sendWAMessage = async (phone, templateName, params = []) => {
  // Phase 1: Skip if API key not configured
  if (!process.env.WA_API_KEY) {
    console.log(`📱 WA (Phase1 — manual): ${phone} → ${templateName}`)
    return true
  }
  try {
    await axios.post(process.env.WA_API_URL, {
      countryCode: '+91',
      phoneNumber: phone,
      callbackData: 'order-update',
      type: 'Template',
      template: { name: templateName, languageCode: 'en', bodyValues: params }
    }, {
      headers: { Authorization: `Basic ${process.env.WA_API_KEY}`, 'Content-Type': 'application/json' }
    })
    console.log(`✅ WA sent to ${phone}`)
    return true
  } catch (err) {
    console.error(`❌ WA failed: ${err.message}`)
    return false
  }
}

// ── Send OTP ──────────────────────────────────────────────
export const sendOTP = async (phone, otp) => {
  if (otpConfig.isDevelopment) {
    console.log(`🔐 DEV OTP: ${phone} → ${otp}`)
    return true
  }

  if (!hasTwilioConfig()) {
    console.log(`📱 OTP (fallback to console): ${phone} → ${otp}`)
    return true
  }

  const message = `Your MagiliniFarms OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`
  return sendSMS(phone, message)
}

// ── Order Notifications ───────────────────────────────────
export const notifyOrderPlaced = async (order) => {
  const items = order.items.map(i => `• ${i.name} ${i.weight} × ${i.qty}`).join('\n')
  const msg   = `✅ Order Confirmed!\nOrder ID: ${order.orderNumber}\n\n${items}\n\nTotal: ₹${order.total}\nPayment: ${order.paymentMethod}\n\nThank you for ordering from MagiliniFarms! 🥭`

  // Notify customer
  await sendWAMessage(order.customer.phone, 'order_confirmed', [order.orderNumber, String(order.total)])

  // Notify admin
  const adminMsg = `🛒 New Order!\n${order.orderNumber}\n${order.customer.name} — ${order.customer.phone}\nTotal: ₹${order.total}\nType: ${order.deliveryType}\nPayment: ${order.paymentMethod}`
  await sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), adminMsg)

  return true
}

export const notifyStatusUpdate = async (order) => {
  const messages = {
    Confirmed:     `✅ Your MagiliniFarms order ${order.orderNumber} is confirmed! We are preparing your fresh mangoes. 🥭`,
    Packed:        `📦 Your order ${order.orderNumber} is packed and ready for dispatch!`,
    Shipped:       `🚚 Your order ${order.orderNumber} is on the way!${order.courierTracking ? ` Track: ${order.courierName} #${order.courierTracking}` : ''}`,
    Delivered:     `🎉 Your order ${order.orderNumber} has been delivered! Enjoy your fresh mangoes! 🥭`,
    'Pickup-Ready':  `🏪 Your order ${order.orderNumber} is ready for pickup! Come to our farm between 7am–6pm. Bring your Order ID.`,
    'Picked-Up':     `✅ Order ${order.orderNumber} picked up. Thank you! Enjoy your mangoes 🥭`,
    Cancelled:     `❌ Your order ${order.orderNumber} has been cancelled. Contact us on WhatsApp for assistance.`
  }
  const msg = messages[order.status]
  if (msg) await sendWAMessage(order.customer.phone, `status_${order.status.toLowerCase()}`, [order.orderNumber])
}

export const notifyLowStock = async (productName, weight, stock) => {
  const msg = `⚠️ Low Stock Alert!\n${productName} (${weight}): only ${stock} units left.\nUpdate stock in admin panel.`
  await sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifyComplaintReceived = async (complaint) => {
  const msg = `📸 New Damage Complaint!\n${complaint.complaintNumber}\nOrder: ${complaint.orderId}\nPhone: ${complaint.phone}\nCheck admin panel.`
  await sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifyBulkEnquiry = async (enquiry) => {
  const msg = `📋 New Bulk Enquiry!\n${enquiry.name} — ${enquiry.phone}\nVariety: ${enquiry.variety}\nQty: ${enquiry.quantity}\nCity: ${enquiry.city}`
  await sendSMS(process.env.ADMIN_WA_NUMBER?.replace('91', ''), msg)
}

export const notifySeasonAvailable = async (phone, productName) => {
  await sendWAMessage(phone, 'season_available', [productName])
}

