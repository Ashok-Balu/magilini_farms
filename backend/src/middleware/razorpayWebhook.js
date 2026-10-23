import { verifyWebhookSignature } from '../services/razorpayService.js'

export const verifyAndParseRazorpayWebhook = (req, res, next) => {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({ success: false, message: 'Webhook body must be JSON.' })
  }

  req.rawBody = Buffer.from(req.body)
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) {
    return res.status(503).json({ success: false, message: 'Razorpay webhook secret is not configured.' })
  }
  if (!verifyWebhookSignature({
    rawBody: req.rawBody,
    signature: req.headers['x-razorpay-signature'],
    secret
  })) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature.' })
  }

  try {
    req.body = JSON.parse(req.rawBody.toString('utf8'))
    next()
  } catch {
    res.status(400).json({ success: false, message: 'Invalid webhook JSON.' })
  }
}
