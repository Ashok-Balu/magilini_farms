import assert from 'node:assert/strict'
import test from 'node:test'
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized, unprocessable } from '../../src/utils/httpError.js'
import { errorResponse, successResponse } from '../../src/utils/response.js'

test('HTTP error helpers preserve status, message, and optional validation errors', () => {
  assert.deepEqual(
    [badRequest('bad input', ['field: invalid']), unauthorized(), forbidden(), notFound(), conflict('taken', ['email']), unprocessable('invalid')],
    [
      new HttpError(400, 'bad input', ['field: invalid']),
      new HttpError(401, 'Unauthorized'),
      new HttpError(403, 'Forbidden'),
      new HttpError(404, 'Not found'),
      new HttpError(409, 'taken', ['email']),
      new HttpError(422, 'invalid')
    ]
  )
})

test('response helpers provide defaults and allow extra response fields', () => {
  assert.deepEqual(successResponse(), { success: true, message: 'OK', data: {} })
  assert.deepEqual(successResponse('loaded', { id: '1' }, { total: 1 }), {
    success: true, message: 'loaded', data: { id: '1' }, total: 1
  })
  assert.deepEqual(errorResponse(), { success: false, message: 'Request failed', errors: [] })
  assert.deepEqual(errorResponse('Invalid', ['name: required'], { code: 'INVALID' }), {
    success: false, message: 'Invalid', errors: ['name: required'], code: 'INVALID'
  })
})
