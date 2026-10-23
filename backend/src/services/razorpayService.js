import crypto from 'crypto'
import Razorpay from 'razorpay'
import { HttpError } from '../utils/httpError.js'

const GATEWAY_REQUEST_TIMEOUT_MS = 15000
let razorpayClient

export const applyGatewayRequestTimeout = (client) => {
  if (!client?.api?.rq?.defaults) {
    throw new Error('Razorpay SDK HTTP client does not expose request timeout configuration.')
  }
  client.api.rq.defaults.timeout = GATEWAY_REQUEST_TIMEOUT_MS
  return client
}

const getClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(503, 'Razorpay is not configured.')
  }
  if (!razorpayClient) {
    const client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
    razorpayClient = applyGatewayRequestTimeout(client)
  }
  return razorpayClient
}

const safeHexEqual = (expected, actual) => {
  if (typeof actual !== 'string' || !/^[a-f0-9]+$/i.test(actual)) return false
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(actual, 'hex')
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer)
}

export const verifyPaymentSignature = ({ orderId, paymentId, signature, secret }) => {
  if (!secret || !orderId || !paymentId) return false
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  return safeHexEqual(expected, signature)
}

export const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!Buffer.isBuffer(rawBody) || !secret || typeof signature !== 'string') return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeHexEqual(expected, signature)
}

export const isDefinitiveGatewayRejection = (error) => {
  const status = Number(error?.statusCode ?? error?.response?.status)
  return Number.isInteger(status) && status >= 400 && status < 500 && status !== 408
}

export const createGatewayOrder = (options) => getClient().orders.create(options)
export const fetchGatewayPayment = (paymentId) => getClient().payments.fetch(paymentId)
export const fetchGatewayRefund = (refundId) => getClient().refunds.fetch(refundId)
export const createGatewayRefund = (paymentId, options) => getClient().payments.refund(paymentId, options)
