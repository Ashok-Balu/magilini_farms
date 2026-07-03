import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { z } from 'zod'

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
  maskedMongoUri: string
  mongoHost: string
  dbName: string
  enableSeed: boolean
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

const normalizeNodeEnv = (value: string | undefined): NodeEnvironment => {
  const normalized = String(value || 'development').trim().toLowerCase()
  if (VALID_ENVS.includes(normalized as NodeEnvironment)) {
    return normalized as NodeEnvironment
  }
  return 'development'
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

const parseBooleanWithDefault = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}

const parseNumber = (value: string | undefined, key: string): number => {
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`)
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${key}: ${value}`)
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

const maskMongoUri = (uri: string): string => {
  try {
    const parsed = new URL(uri)
    if (parsed.password) parsed.password = '******'
    return parsed.toString()
  } catch {
    return uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:******@')
  }
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
// If production and no file found, use environment variables (from platform like Render)

process.env.NODE_ENV = nodeEnv

const envSchema = z.object({
  PORT: z.string().min(1),
  API_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  ENABLE_SEED: z.enum(['true', 'false']),
  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.enum(['true', 'false']).optional(),
  TRUST_PROXY_HOPS: z.string().optional(),
  OTP_EXPIRY_MINUTES: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  WA_API_KEY: z.string().optional(),
  WA_API_URL: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  REDIS_URL: z.string().optional()
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const msg = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
  throw new Error(`Environment validation failed: ${msg}`)
}

const mongoUri = requiredString('MONGO_URI')
const dbName = requiredString('DB_NAME')

const isLikelyProd = (text: string) => /prod|production/.test(text)
const isLikelyDev = (text: string) => /dev|development|localhost|127\.0\.0\.1/.test(text)

const checkEnvironmentDatabaseSafety = (): void => {
  const combined = `${mongoUri} ${dbName}`.toLowerCase()

  if (nodeEnv === 'production' && isLikelyDev(combined)) {
    throw new Error('Production environment cannot connect to development database. Application stopped.')
  }

  if (nodeEnv === 'development' && isLikelyProd(combined)) {
    throw new Error('Development environment cannot connect to production database. Application stopped.')
  }
}

checkEnvironmentDatabaseSafety()

const packageJsonPath = path.join(backendRoot, 'package.json')
const appVersion = fs.existsSync(packageJsonPath)
  ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version || '1.0.0'
  : '1.0.0'

const corsOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

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
  trustProxy: parseBooleanWithDefault(process.env.TRUST_PROXY, false),
  trustProxyHops: parseNumber(process.env.TRUST_PROXY_HOPS || '1', 'TRUST_PROXY_HOPS'),
  appVersion,
  mongoUri,
  maskedMongoUri: maskMongoUri(mongoUri),
  mongoHost: mongoHostFromUri(mongoUri),
  dbName,
  enableSeed: parseBoolean(process.env.ENABLE_SEED, 'ENABLE_SEED')
})

export default config