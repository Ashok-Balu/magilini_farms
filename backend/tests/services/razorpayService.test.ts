import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import {
  applyGatewayRequestTimeout,
  isDefinitiveGatewayRejection,
  verifyPaymentSignature,
  verifyWebhookSignature
} from '../../src/services/razorpayService.js'

const secret = 'test-webhook-secret'

test('webhook verification uses the exact original bytes', () => {
  const rawBody = Buffer.from('{ "event" : "payment.captured", "payload": {} }')
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  assert.equal(verifyWebhookSignature({ rawBody, signature, secret }), true)
  assert.equal(verifyWebhookSignature({ rawBody: Buffer.from(JSON.stringify(JSON.parse(rawBody.toString('utf8')))), signature, secret }), false)
})

test('payment signature verification compares the Razorpay order and payment IDs', () => {
  const orderId = 'order_test'
  const paymentId = 'pay_test'
  const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')

  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature, secret }), true)
  assert.equal(verifyPaymentSignature({ orderId, paymentId: 'pay_other', signature, secret }), false)
  assert.equal(verifyPaymentSignature({ orderId, paymentId, signature: 'bad', secret }), false)
})

test('gateway order creation errors are retryable only when rejection is definitive', () => {
  assert.equal(isDefinitiveGatewayRejection({ statusCode: 400 }), true)
  assert.equal(isDefinitiveGatewayRejection({ response: { status: 429 } }), true)
  assert.equal(isDefinitiveGatewayRejection({ statusCode: 408 }), false)
  assert.equal(isDefinitiveGatewayRejection({ statusCode: 503 }), false)
  assert.equal(isDefinitiveGatewayRejection(new Error('timeout')), false)
})

test('Razorpay SDK requests use a bounded timeout', () => {
  const client = { api: { rq: { defaults: { timeout: 0 } } } }
  assert.equal(applyGatewayRequestTimeout(client), client)
  assert.equal(client.api.rq.defaults.timeout, 15000)
})
