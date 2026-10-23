import mongoose from 'mongoose'
import type { MongoServerSelectionError, TopologyDescription } from 'mongodb'

import config from './env.js'
import { logger } from '../utils/logger.js'

const asTopology = (value: unknown): TopologyDescription | null => {
  if (!value || typeof value !== 'object') return null
  const candidate = value as { servers?: unknown }
  if (!candidate.servers || !(candidate.servers instanceof Map)) return null
  return value as TopologyDescription
}

const printFailureDiagnostics = (error: unknown): void => {
  const err = error as Partial<MongoServerSelectionError> & {
    reason?: unknown
    cause?: unknown
  }
  const safeMessage = (message: string): string =>
    message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[MongoDB connection string redacted]')

  console.error('=====================================')
  console.error('MongoDB Connection Failed')
  console.error('')
  console.error(`Environment : ${config.nodeEnv}`)
  console.error(`Env File    : ${config.envFileName}`)
  console.error(`Database    : ${config.dbName}`)
  console.error(`Host        : ${config.mongoHost}`)
  console.error(`Error Name  : ${err.name || 'UnknownError'}`)
  console.error(`Error Msg   : ${safeMessage(err.message || String(error))}`)

  const topology = asTopology(err.reason) || asTopology(err.cause)
  if (topology) {
    for (const [address, server] of topology.servers.entries()) {
      const serverError = (server as { error?: Error & { code?: string } }).error
      if (!serverError) continue
      console.error(`Server      : ${address}`)
      console.error(`Server Err  : ${serverError.name}: ${safeMessage(serverError.message)}`)
      if (serverError.code) {
        console.error(`Server Code : ${serverError.code}`)
      }
    }
  }

  console.error('=====================================')
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    const options = {
      dbName: config.dbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4 as const
    }

    const connection = await mongoose.connect(config.mongoUri, {
      ...options
    })

    logger.info('Database connected', {
      environment: config.nodeEnv,
      database: connection.connection.name,
      mongoHost: config.mongoHost
    })

    return connection
  } catch (error) {
    printFailureDiagnostics(error)
    process.exit(1)
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close()
  }
}