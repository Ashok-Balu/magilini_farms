import assert from 'node:assert/strict'
import test from 'node:test'
import { asyncHandler, errorHandler, notFound } from '../../src/middleware/errorHandler.js'
import { HttpError } from '../../src/utils/httpError.js'
import { logger } from '../../src/utils/logger.js'

const response = () => ({
  statusCode: 200,
  body: undefined as unknown,
  status(code: number) { this.statusCode = code; return this },
  json(body: unknown) { this.body = body; return this }
})

test('asyncHandler forwards rejected promises to next', async () => {
  const failure = new Error('async')
  let forwarded: unknown
  await asyncHandler(() => Promise.reject(failure))({}, {}, (err: unknown) => { forwarded = err })
  assert.equal(forwarded, failure)
})

test('asyncHandler propagates a synchronous throw from the wrapped function', () => {
  const failure = new Error('sync')
  assert.throws(() => asyncHandler(() => { throw failure })({}, {}, () => {}), failure)
})

test('errorHandler maps application, mongoose, and duplicate-key errors', () => {
  const originalLogger = logger.error
  logger.error = () => {}
  try {
    const req = { method: 'GET', originalUrl: '/test' }
    const cases = [
      [new HttpError(422, 'Invalid data', ['name: required']), 422, { success: false, message: 'Invalid data', errors: ['name: required'] }],
      [Object.assign(new Error('invalid'), { name: 'ValidationError', errors: { name: { message: 'Name required' } } }), 422, { success: false, message: 'Validation failed', errors: ['Name required'] }],
      [Object.assign(new Error(), { code: 11000, keyValue: { email: 'x' } }), 409, { success: false, message: 'email already exists.', errors: ['email already exists.'] }]
    ] as const

    for (const [failure, status, body] of cases) {
      const res = response()
      errorHandler(failure, req, res, () => {})
      assert.equal(res.statusCode, status)
      assert.deepEqual(res.body, body)
    }
  } finally {
    logger.error = originalLogger
  }
})

test('errorHandler hides server details and notFound does not echo request paths', () => {
  const originalLogger = logger.error
  let loggedMetadata: Record<string, unknown> | undefined
  logger.error = (_message, metadata) => { loggedMetadata = metadata }
  try {
    const res = response()
    errorHandler(new Error('private detail'), { method: 'GET', originalUrl: '/secret?token=private' }, res, () => {})
    assert.equal(res.statusCode, 500)
    assert.deepEqual(res.body, { success: false, message: 'Internal server error.', errors: [] })
    assert.equal(JSON.stringify(loggedMetadata).includes('private'), false)
    assert.equal(JSON.stringify(loggedMetadata).includes('/secret'), false)

    const missing = response()
    notFound({ originalUrl: '/missing?email=private@example.com' }, missing)
    assert.equal(missing.statusCode, 404)
    assert.deepEqual(missing.body, {
      success: false, message: 'Route not found.', errors: ['Route not found.']
    })
  } finally {
    logger.error = originalLogger
  }
})
