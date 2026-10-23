import assert from 'node:assert/strict'
import test from 'node:test'
import crypto from 'node:crypto'
import { verifyAndParseRazorpayWebhook } from '../../src/middleware/razorpayWebhook.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

const invoke = (req: any, res: any) => {
  let nextCalled = false
  verifyAndParseRazorpayWebhook(req, res, () => { nextCalled = true })
  return nextCalled
}

test('webhook signature is checked against original bytes before JSON parsing', () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  const secret = 'test-webhook-secret'
  const rawBody = Buffer.from('{ "event" : "payment.captured", "payload": {} }')
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  process.env.RAZORPAY_WEBHOOK_SECRET = secret
  const req: any = { body: rawBody, headers: { 'x-razorpay-signature': signature } }
  const res = response()

  try {
    assert.equal(invoke(req, res), true)
    assert.deepEqual(req.body, { event: 'payment.captured', payload: {} })
    assert.deepEqual(req.rawBody, rawBody)
    assert.notEqual(req.body, req.rawBody)
  } finally {
    if (originalSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET
    else process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret
  }
})

test('invalid signature is rejected before malformed JSON is parsed', () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret'
  const req: any = { body: Buffer.from('{invalid'), headers: { 'x-razorpay-signature': 'bad' } }
  const res = response()

  try {
    assert.equal(invoke(req, res), false)
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.message, 'Invalid webhook signature.')
    assert.ok(Buffer.isBuffer(req.rawBody))
  } finally {
    if (originalSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET
    else process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret
  }
})

test('webhook parser fails closed when the secret is missing', () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  delete process.env.RAZORPAY_WEBHOOK_SECRET
  const res = response()

  try {
    assert.equal(invoke({ body: Buffer.from('{}'), headers: {} }, res), false)
    assert.equal(res.statusCode, 503)
  } finally {
    if (originalSecret !== undefined) process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret
  }
})
