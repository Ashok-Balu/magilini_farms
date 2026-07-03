import fs from 'fs'
import path from 'path'

type Level = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

const logsDir = path.resolve(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

const env = process.env.NODE_ENV || 'development'
const logFileName = env === 'production' ? 'production.log' : 'development.log'
const logFilePath = path.join(logsDir, logFileName)

const writeToFile = (line: string) => {
  fs.appendFileSync(logFilePath, `${line}\n`)
}

const createLine = (level: Level, message: string, meta?: Record<string, unknown>) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta || {})
  })
}

const log = (level: Level, message: string, meta?: Record<string, unknown>) => {
  const line = createLine(level, message, meta)
  writeToFile(line)

  if (env !== 'production' || level === 'ERROR' || level === 'WARN') {
    const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
    fn(line)
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('ERROR', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('DEBUG', message, meta),
  morganStream: {
    write: (line: string) => {
      writeToFile(line.trim())
      if (env !== 'production') console.log(line.trim())
    }
  },
  logFilePath,
  logFileName
}
