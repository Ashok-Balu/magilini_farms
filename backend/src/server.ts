import express from 'express'
import type { Request, Response } from 'express'
import cors from 'cors'
import type { CorsOptions } from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import mongoSanitize from 'express-mongo-sanitize'
import cron from 'node-cron'
import mongoose from 'mongoose'

import config from './config/env.js'
import { connectDatabase } from './config/database.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { xssProtection } from './middleware/xssProtection.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import Order from './models/Order.js'
import Product from './models/Product.js'
import Otp from './models/Otp.js'
import OtpRequest from './models/OtpRequest.js'
import { StockLog } from './models/index.js'
import { otpConfig } from './config/otp.js'
import { notifyStatusUpdate } from './services/notificationService.js'
import { logger } from './utils/logger.js'
import { successResponse } from './utils/response.js'
import { otpService } from './services/otp/otpService.js'

const app = express()
const PORT = config.port

await connectDatabase()

if (otpConfig.resetCountersOnRestart) {
  await Promise.all([
    Otp.deleteMany({}),
    OtpRequest.deleteMany({})
  ])
  console.log('Development Mode')
  console.log('OTP counters reset on server restart')
}

if (config.trustProxy) {
  app.set('trust proxy', config.trustProxyHops)
}

app.disable('x-powered-by')

app.use(helmet({
  contentSecurityPolicy: config.isProduction,
  crossOriginEmbedderPolicy: false
}))
app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true)
    if (config.corsOrigins.includes(origin)) return callback(null, true)
    const error = new Error('CORS origin not allowed')
    ;(error as any).status = 403
    return callback(error, false)
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'X-Total-Count'],
  maxAge: 86400
} as CorsOptions))
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(mongoSanitize())
app.use(xssProtection)
app.use(morgan(':method :url :status :response-time ms', { stream: logger.morganStream }))

app.get('/', (_: Request, res: Response) => res.json(successResponse('MagiliniFarms API is running')))
app.get('/health', (_: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1
  return res.json(successResponse('Health check OK', {
    serverStatus: 'up',
    databaseStatus: dbConnected ? 'connected' : 'disconnected',
    environment: config.nodeEnv,
    version: config.appVersion,
    timestamp: new Date().toISOString()
  }))
})

app.use('/api', apiLimiter, routes)

app.use(notFound)
app.use(errorHandler)

const restoreOrderStock = async (items: Array<{ productId?: unknown; variantId?: unknown; qty?: number }>, orderId: unknown) => {
  for (const item of items) {
    if (!item.productId || !item.variantId) continue

    const productId = String(item.productId)
    const variantId = String(item.variantId)

    const product = await Product.findById(productId)
    if (!product) continue

    const variant = product.variants.id(variantId)
    if (!variant) continue

    const before = variant.stock
    variant.stock += Number(item.qty || 0)
    await product.save()

    await StockLog.create({
      productId: product._id,
      productName: product.name,
      variantWeight: variant.weight,
      changeType: 'cancellation',
      quantityBefore: before,
      quantityChange: Number(item.qty || 0),
      quantityAfter: variant.stock,
      orderId
    })
  }
}

cron.schedule('0 * * * *', async () => {
  try {
    const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const expired = await Order.find({
      paymentMethod: 'direct-upi',
      paymentStatus: 'pending',
      status: 'New',
      createdAt: { $lt: expiry }
    })

    for (const order of expired) {
      order.status = 'Cancelled'
      order.paymentStatus = 'failed'
      order.cancelledBy = 'system'
      order.cancelReason = 'Payment not received within 24 hours'
      order.statusHistory.push({ status: 'Cancelled', note: 'Auto-cancelled: payment timeout' })
      await restoreOrderStock(order.items, order._id)
      await order.save()
      await notifyStatusUpdate(order)
      console.log(`Auto-cancelled order ${order.orderNumber}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Cron error: ${message}`)
  }
})

app.listen(PORT, () => {
  const otpMode = otpConfig.isProduction
    ? `Production (${otpService.providerName})`
    : 'Development (Console Only)'

  console.log('========================================')
  console.log(`Environment : ${config.nodeEnv}`)
  console.log(`Database    : ${config.dbName}`)
  console.log(`Server      : ${config.apiBaseUrl.replace(/\/api\/?$/, '')}`)
  console.log('MongoDB     : Connected')
  console.log('Seed        : Disabled')
  console.log(`CORS Origins : ${config.corsOrigins.join(', ') || 'none'}`)
  console.log(`OTP Mode    : ${otpMode}`)
  console.log('========================================')

  logger.info('Server startup complete', {
    environment: config.nodeEnv,
    port: PORT,
    apiBaseUrl: config.apiBaseUrl,
    frontendUrl: config.frontendUrl,
    trustProxy: config.trustProxy,
    logFile: logger.logFileName
  })
})