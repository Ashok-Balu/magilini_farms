import dns from 'dns'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import { assertEnvironmentPolicy } from './environmentPolicy.js'

type NodeEnvironment = 'development' | 'test' | 'production'

export interface AppConfig {
  nodeEnv: NodeEnvironment
  isDevelopment: boolean
  isTest: boolean
  isProduction: boolean
  envFileName: string
  envFilePath: string
  port: number
  apiBaseUrl: string
  frontendUrl: string
  corsOrigins: string[]
  trustProxy: boolean
  trustProxyHops: number
  appVersion: string
  mongoUri: string
  mongoHost: string
  dbName: string
  enableSeed: boolean
  freeDeliveryMin: number
}

const VALID_ENVS: ReadonlyArray<NodeEnvironment> = ['development', 'test', 'production']

const ENV_FILE_BY_NODE_ENV: Record<NodeEnvironment, string> = {
  development: '.env.development',
  test: '.env.test',
  production: '.env.production'
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const backendRoot = path.resolve(__dirname, '../..')

const setPublicDnsServersForMongoSrv = (): void => {
  const mongoUri = process.env.MONGO_URI?.trim() || ''
  if (!mongoUri.startsWith('mongodb+srv://')) return

  const currentDnsServers = dns.getServers()
  if (currentDnsServers.includes('8.8.8.8') || currentDnsServers.includes('1.1.1.1')) return

  dns.setServers(['8.8.8.8', '1.1.1.1'])
}

const normalizeNodeEnv = (value: string | undefined): NodeEnvironment => {
  const normalized = String(value || 'development').trim().toLowerCase()
  if (VALID_ENVS.includes(normalized as NodeEnvironment)) {
    return normalized as NodeEnvironment
  }
  throw new Error(`Invalid NODE_ENV "${normalized}". Expected development, test, or production.`)
}

const parseBoolean = (value: string | undefined, key: string): boolean => {
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false

  throw new Error(`Invalid boolean value for ${key}. Expected true or false.`)
}

const parseBooleanWithDefault = (value: string | undefined, key: string, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  throw new Error(`Invalid boolean value for ${key}. Expected true or false.`)
}

const parseNumber = (value: string | undefined, key: string): number => {
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`Invalid numeric value for ${key}.`)
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (key === 'PORT' && parsed > 65535)) {
    throw new Error(`Invalid numeric value for ${key}.`)
  }
  return parsed
}

const requiredString = (key: string): string => {
  const value = process.env[key]
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value.trim()
}

const mongoHostFromUri = (uri: string): string => {
  try {
    const parsed = new URL(uri)
    return parsed.host
  } catch {
    return 'unknown-host'
  }
}

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV)
let envFileName = ENV_FILE_BY_NODE_ENV[nodeEnv]
let envFilePath = path.join(backendRoot, envFileName)

// Try to load env file if it exists (for development/local deployments)
// In production (Render, etc.), env vars should be set directly in the platform
if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: false })
} else if (nodeEnv !== 'production') {
  // Fallback to .env for development/test if NODE_ENV-specific file doesn't exist
  envFileName = '.env'
  envFilePath = path.join(backendRoot, envFileName)
  
  if (fs.existsSync(envFilePath)) {
    dotenv.config({ path: envFilePath, override: false })
  } else {
    throw new Error(`No environment file found. Tried: ${ENV_FILE_BY_NODE_ENV[nodeEnv]}, .env`)
  }
}

setPublicDnsServersForMongoSrv()

// If production and no file found, use environment variables (from platform like Render)
process.env.NODE_ENV = nodeEnv

const envSchema = z.object({
  PORT: z.string().regex(/^[1-9]\d{0,4}$/),
  API_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ENABLE_SEED: z.enum(['true', 'false']),
  FREE_DELIVERY_MIN: z.string().regex(/^\d+(?:\.\d{1,2})?$/).optional(),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
  TRUST_PROXY_HOPS: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().trim().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().trim().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  UPI_ID: z.string().optional(),
  UPI_NAME: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
  WA_API_KEY: z.string().optional(),
  WA_API_URL: z.string().url().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().regex(/^[1-9]\d{0,4}$/).optional(),
  EMAIL_SECURE: z.enum(['true', 'false']).optional(),
  REDIS_URL: z.string().optional(),
  PAYMENT_RESERVATION_MINUTES: z.string().regex(/^[1-9]\d*$/).optional()
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const msg = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`Environment validation failed: ${msg}`)
}

const hasRazorpayKeyId = Boolean(process.env.RAZORPAY_KEY_ID?.trim())
const hasRazorpayKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim())
const hasRazorpayWebhookSecret = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim())
if (hasRazorpayKeyId !== hasRazorpayKeySecret) {
  throw new Error('Razorpay configuration requires both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.')
}
if (hasRazorpayKeyId && !hasRazorpayWebhookSecret) {
  throw new Error('RAZORPAY_WEBHOOK_SECRET is required when Razorpay payments are enabled.')
}
const mongoUri = requiredString('MONGO_URI')
const dbName = requiredString('DB_NAME')
assertEnvironmentPolicy(nodeEnv, dbName, process.env.RAZORPAY_KEY_ID?.trim())
const freeDeliveryMin = Number(parsed.data.FREE_DELIVERY_MIN || 0)
if (!Number.isFinite(freeDeliveryMin) || !Number.isSafeInteger(Math.round(freeDeliveryMin * 100))) {
  throw new Error('FREE_DELIVERY_MIN must be a non-negative amount with at most two decimal places.')
}

const cloudinaryValues = [
  process.env.CLOUDINARY_CLOUD_NAME,
  process.env.CLOUDINARY_API_KEY,
  process.env.CLOUDINARY_API_SECRET
]
const configuredCloudinaryValues = cloudinaryValues.filter(value => Boolean(value?.trim())).length
if (configuredCloudinaryValues > 0 && configuredCloudinaryValues < cloudinaryValues.length) {
  throw new Error('Cloudinary configuration requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
}
if (nodeEnv === 'production' && configuredCloudinaryValues !== cloudinaryValues.length) {
  throw new Error('Cloudinary must be fully configured in production.')
}

const hasEmailUser = Boolean(process.env.EMAIL_USER?.trim())
const hasEmailPassword = Boolean(process.env.EMAIL_PASS?.trim())
if (hasEmailUser !== hasEmailPassword) {
  throw new Error('Email configuration requires both EMAIL_USER and EMAIL_PASS.')
}
if (nodeEnv === 'production' && !hasEmailUser) {
  throw new Error('Production email delivery requires EMAIL_USER and EMAIL_PASS.')
}

const hasWhatsAppKey = Boolean(process.env.WA_API_KEY?.trim())
const hasWhatsAppUrl = Boolean(process.env.WA_API_URL?.trim())
if (hasWhatsAppKey !== hasWhatsAppUrl) {
  throw new Error('WhatsApp configuration requires both WA_API_KEY and WA_API_URL.')
}
if (nodeEnv === 'production' && process.env.WA_API_URL && !process.env.WA_API_URL.startsWith('https://')) {
  throw new Error('Production WhatsApp provider URL must use HTTPS.')
}

const packageJsonPath = path.join(backendRoot, 'package.json')
const appVersion = fs.existsSync(packageJsonPath)
  ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version || '1.0.0'
  : '1.0.0'

const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, '')

const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean)
for (const origin of corsOrigins) {
  let parsedOrigin: URL
  try {
    parsedOrigin = new URL(origin)
  } catch {
    throw new Error('CORS_ORIGINS must contain valid origins.')
  }
  if (parsedOrigin.origin !== origin || origin === '*') {
    throw new Error('CORS_ORIGINS entries must be origins without paths or wildcards.')
  }
  if (nodeEnv === 'production' && parsedOrigin.protocol !== 'https:') {
    throw new Error('Production CORS origins must use HTTPS.')
  }
}

const config: AppConfig = Object.freeze({
  nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
  isProduction: nodeEnv === 'production',
  envFileName,
  envFilePath,
  port: parseNumber(process.env.PORT, 'PORT'),
  apiBaseUrl: requiredString('API_BASE_URL'),
  frontendUrl: requiredString('FRONTEND_URL'),
  corsOrigins,
  trustProxy: parseBooleanWithDefault(process.env.TRUST_PROXY, 'TRUST_PROXY', false),
  trustProxyHops: parseNumber(process.env.TRUST_PROXY_HOPS || '1', 'TRUST_PROXY_HOPS'),
  appVersion,
  mongoUri,
  mongoHost: mongoHostFromUri(mongoUri),
  dbName,
  enableSeed: parseBoolean(process.env.ENABLE_SEED, 'ENABLE_SEED'),
  freeDeliveryMin
})

export default config