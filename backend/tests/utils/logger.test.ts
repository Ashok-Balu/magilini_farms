import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pathToFileURL } from 'url'

test('logger writes structured entries and trims Morgan stream lines', async () => {
  const originalCwd = process.cwd()
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'magilini-logger-test-'))

  try {
    process.chdir(temporaryDirectory)
    const loggerUrl = pathToFileURL(path.resolve(originalCwd, 'src/utils/logger.ts'))
    loggerUrl.searchParams.set('test', String(Date.now()))
    const { logger } = await import(loggerUrl.href)
    const originalLog = console.log
    const logged: string[] = []
    console.log = (message?: unknown) => { logged.push(String(message)) }

    try {
      logger.info('unit test event', { requestId: 'test-request' })
      logger.morganStream.write(' GET /health 200 \n')
    } finally {
      console.log = originalLog
    }

    const lines = fs.readFileSync(path.join(temporaryDirectory, 'logs/development.log'), 'utf8')
      .trim()
      .split(/\r?\n/)
    const entry = JSON.parse(lines[0])
    assert.equal(entry.level, 'INFO')
    assert.equal(entry.message, 'unit test event')
    assert.equal(entry.requestId, 'test-request')
    assert.equal(logged[0], lines[0])
    assert.equal(lines[1], 'GET /health 200')
    assert.equal(logger.logFileName, 'development.log')
  } finally {
    process.chdir(originalCwd)
    fs.rmSync(temporaryDirectory, { recursive: true, force: true })
  }
})
