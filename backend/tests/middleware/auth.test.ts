import assert from 'node:assert/strict'
import test from 'node:test'
import User from '../../src/models/User.js'
import { adminOnly, customerOnly, generateToken, optionalAuth, protect } from '../../src/middleware/auth.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

test('protect rejects missing tokens and authenticates a valid bearer token', async () => {
  const oldSecret = process.env.JWT_SECRET
  const originalFindById = User.findById
  process.env.JWT_SECRET = 'test-secret-with-enough-length'
  const user: any = { _id: 'user-1', role: 'customer', isBlocked: false }
  let selected: string | undefined
  User.findById = ((id: string) => ({
    select: async (selection: string) => {
      assert.equal(id, 'user-1')
      selected = selection
      return user
    }
  })) as any

  try {
    const missingResponse = response()
    await protect({ cookies: {}, headers: {} } as any, missingResponse, () => {})
    assert.equal(missingResponse.statusCode, 401)
    assert.deepEqual(missingResponse.body.errors, ['JWT token is missing.'])

    const request: any = {
      cookies: {},
      method: 'GET',
      headers: { authorization: `Bearer ${generateToken('user-1')}` }
    }
    const res = response()
    let nextCalls = 0
    await protect(request, res, () => { nextCalls += 1 })
    assert.equal(nextCalls, 1)
    assert.equal(request.user, user)
    assert.equal(selected, '-__v')
  } finally {
    User.findById = originalFindById
    if (oldSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = oldSecret
  }
})

test('protect rejects revoked sessions and cookie-authenticated mutations from untrusted origins', async () => {
  const oldSecret = process.env.JWT_SECRET
  const oldOrigins = process.env.CORS_ORIGINS
  const originalFindById = User.findById
  process.env.JWT_SECRET = 'test-secret-with-enough-length'
  process.env.CORS_ORIGINS = 'https://shop.example'
  User.findById = (() => ({
    select: async () => ({ _id: 'user-1', role: 'customer', isBlocked: false, authVersion: 2 })
  })) as any

  try {
    const revokedResponse = response()
    await protect({
      cookies: {},
      method: 'GET',
      headers: { authorization: `Bearer ${generateToken('user-1', 1)}` }
    } as any, revokedResponse, () => {})
    assert.equal(revokedResponse.statusCode, 401)
    assert.deepEqual(revokedResponse.body.errors, ['Session has been revoked.'])

    const csrfResponse = response()
    await protect({
      cookies: { token: generateToken('user-1', 2) },
      method: 'POST',
      headers: { origin: 'https://attacker.example' }
    } as any, csrfResponse, () => {})
    assert.equal(csrfResponse.statusCode, 403)
    assert.deepEqual(csrfResponse.body.errors, ['Request origin is not allowed.'])
  } finally {
    User.findById = originalFindById
    if (oldSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = oldSecret
    if (oldOrigins === undefined) delete process.env.CORS_ORIGINS
    else process.env.CORS_ORIGINS = oldOrigins
  }
})

test('protect rejects blocked users and optionalAuth ignores invalid credentials', async () => {
  const oldSecret = process.env.JWT_SECRET
  const originalFindById = User.findById
  process.env.JWT_SECRET = 'test-secret-with-enough-length'
  User.findById = (() => ({
    select: async () => ({ _id: 'blocked', isBlocked: true })
  })) as any

  try {
    const token = generateToken('blocked')
    const blockedResponse = response()
    await protect({ cookies: { token }, method: 'GET', headers: {} } as any, blockedResponse, () => {})
    assert.equal(blockedResponse.statusCode, 403)
    assert.deepEqual(blockedResponse.body.errors, ['Your account has been blocked.'])

    const optionalRequest: any = { cookies: { token: 'invalid' }, headers: {} }
    let nextCalls = 0
    await optionalAuth(optionalRequest, response(), () => { nextCalls += 1 })
    assert.equal(nextCalls, 1)
    assert.equal(optionalRequest.user, undefined)
  } finally {
    User.findById = originalFindById
    if (oldSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = oldSecret
  }
})

test('role guards allow only matching roles', () => {
  const res = response()
  let nextCalls = 0
  adminOnly({ user: { role: 'customer' } } as any, res, () => { nextCalls += 1 })
  assert.equal(res.statusCode, 403)
  assert.deepEqual(res.body.errors, ['Admin access required.'])

  const customerResponse = response()
  customerOnly({ user: { role: 'customer', isBlocked: false } } as any, customerResponse, () => { nextCalls += 1 })
  assert.equal(nextCalls, 1)
  assert.equal(customerResponse.statusCode, 200)
})
