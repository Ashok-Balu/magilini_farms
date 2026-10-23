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
import { verifyAndParseRazorpayWebhook } from './middleware/razorpayWebhook.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import Order from './models/Order.js'
import { notifyStatusUpdate } from './services/notificationService.js'
import { releaseInventory } from './services/inventoryService.js'
import { logger } from './utils/logger.js'
import { successResponse } from './utils/response.js'
import { getExpiredPickupReservationFilter, getPendingPaymentExpiryFilter } from './utils/paymentPolicy.js'

const app = express()
const PORT = config.port

await connectDatabase()

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
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  exposedHeaders: ['Content-Type', 'X-Total-Count'],
  maxAge: 86400
} as CorsOptions))
app.use(compression())
app.use(cookieParser())
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '1mb' }), verifyAndParseRazorpayWebhook)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(mongoSanitize())
app.use(xssProtection)
app.use(morgan(':method :status :response-time ms', { stream: logger.morganStream }))

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
app.get('/ready', (_: Request, res: Response) => {
  const dbConnected = mongoose.connection.readyState === 1
  if (!dbConnected) {
    return res.status(503).json(successResponse('Service is not ready', {
      serverStatus: 'up',
      databaseStatus: 'disconnected'
    }))
  }
  return res.json(successResponse('Service is ready', {
    serverStatus: 'up',
    databaseStatus: 'connected'
  }))
})

app.use('/api', apiLimiter, routes)

app.use(notFound)
app.use(errorHandler)

const expiryTask = cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date()
    const legacyExpiry = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const expired = await Order.find({
      $or: [
        getPendingPaymentExpiryFilter(now, legacyExpiry),
        getExpiredPickupReservationFilter(now)
      ]
    }).limit(200)

    for (const order of expired) {
      const session = await mongoose.startSession()
      let cancelled: any = null
      try {
        await session.withTransaction(async () => {
          const paymentNeedsReview = order.paymentMethod === 'direct-upi' && Boolean(order.utrNumber)
          cancelled = await Order.findOneAndUpdate({
            _id: order._id,
            status: 'New',
            paymentStatus: 'pending',
            paymentMethod: order.paymentMethod,
            utrNumber: order.utrNumber ?? null,
            $or: [
              { inventoryStatus: 'reserved' },
              { inventoryStatus: { $exists: false } }
            ],
            $and: [
              { $or: [{ inventoryExpiresAt: { $lte: now } }, { inventoryExpiresAt: { $exists: false }, createdAt: { $lte: legacyExpiry } }] }
            ]
          }, {
            $set: {
              status: 'Cancelled',
              paymentStatus: paymentNeedsReview ? 'refund_pending' : 'failed',
              inventoryStatus: 'released',
              inventoryExpiresAt: null,
              refundRequired: paymentNeedsReview,
              cancelledBy: 'system',
              cancelReason: paymentNeedsReview ? 'UPI reference submitted before reservation expiry; manual payment reconciliation required' : 'Payment reservation expired'
            },
            $push: { statusHistory: { status: 'Cancelled', note: paymentNeedsReview ? 'Reservation expired with submitted UPI reference; payment needs reconciliation' : 'Auto-cancelled: payment reservation expired', time: now } }
          }, { new: true, session })
          if (cancelled) await releaseInventory(cancelled.items, cancelled._id, session, 'cancellation')
        })
      } finally {
        await session.endSession()
      }

      if (cancelled) {
        await notifyStatusUpdate(cancelled)
        logger.info('Expired payment reservation released', { orderId: cancelled._id, orderNumber: cancelled.orderNumber })
      }
    }
  } catch (error) {
    logger.error('Payment reservation expiry job failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError'
    })
  }
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection was lost', { database: config.dbName })
})
mongoose.connection.on('error', (error: Error) => {
  logger.error('MongoDB connection error', { errorName: error.name })
})

const httpServer = app.listen(PORT, () => {
  console.log('========================================')
  console.log(`Environment : ${config.nodeEnv}`)
  console.log(`Database    : ${config.dbName}`)
  console.log(`Server      : ${config.apiBaseUrl.replace(/\/api\/?$/, '')}`)
  console.log('MongoDB     : Connected')
  console.log('Seed        : Disabled')
  console.log(`CORS Origins : ${config.corsOrigins.join(', ') || 'none'}`)
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

let shutdownStarted = false
const shutdown = (signal: NodeJS.Signals): void => {
  if (shutdownStarted) return
  shutdownStarted = true
  logger.info('Graceful shutdown started', { signal })
  expiryTask.stop()

  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out; forcing process exit')
    process.exit(1)
  }, 15000)
  forceExitTimer.unref()

  httpServer.close((error?: Error) => {
    if (error) {
      logger.error('HTTP server shutdown failed', { errorName: error.name })
      process.exitCode = 1
    }
    void mongoose.disconnect().then(() => {
      clearTimeout(forceExitTimer)
      logger.info('Graceful shutdown completed')
    }).catch((disconnectError: unknown) => {
      clearTimeout(forceExitTimer)
      logger.error('MongoDB shutdown failed', {
        errorName: disconnectError instanceof Error ? disconnectError.name : 'UnknownError'
      })
      process.exitCode = 1
    })
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))