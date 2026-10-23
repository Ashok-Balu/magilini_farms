import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import User from '../../src/models/User.js'
import {
  adminLogin,
  getMe,
  login,
  logout,
  register,
  resetPassword
} from '../../src/controllers/authController.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  cookies: [] as any[],
  clearedCookies: [] as any[],
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this },
  cookie(name: string, token: string, options: unknown) { this.cookies.push({ name, token, options }); return this },
  clearCookie(name: string, options: unknown) { this.clearedCookies.push({ name, options }); return this }
})

const invoke = async (handler: any, req: any, res: any) => {
  let failure: unknown
  await handler(req, res, (error: unknown) => { failure = error })
  if (failure) throw failure
}

const replaceUserMethod = (method: string, value: unknown) => {
  Object.defineProperty(User, method, { configurable: true, writable: true, value })
}

test('register rejects mismatched passwords and duplicate normalized email without creating users', async () => {
  const originalFindOne = User.findOne
  const originalCreate = User.create
  let createCalls = 0
  User.findOne = (async () => ({ _id: 'existing' })) as any
  User.create = (async () => { createCalls += 1 }) as any

  try {
    const mismatch = response()
    await invoke(register, {
      body: { name: 'Sam', email: 'sam@example.com', password: 'password123', confirmPassword: 'different' }
    }, mismatch)
    assert.equal(mismatch.statusCode, 400)
    assert.equal(mismatch.body.message, 'Passwords do not match.')

    const duplicate = response()
    await invoke(register, {
      body: { name: 'Sam', email: ' SAM@Example.com ', password: 'password123', confirmPassword: 'password123' }
    }, duplicate)
    assert.equal(duplicate.statusCode, 409)
    assert.equal(duplicate.body.message, 'An account with this email already exists.')
    assert.equal(createCalls, 0)
  } finally {
    replaceUserMethod('findOne', originalFindOne)
    replaceUserMethod('create', originalCreate)
  }
})

test('register normalizes new customer fields and does not expose private account fields', async () => {
  const originalSecret = process.env.JWT_SECRET
  const originalFindOne = User.findOne
  const originalCreate = User.create
  process.env.JWT_SECRET = 'unit-test-secret-that-is-long-enough'
  User.findOne = (async () => null) as any
  User.create = (async (input: any) => ({
    _id: { toString: () => 'user-1' },
    ...input,
    addresses: [],
    password: 'hashed-secret',
    passwordResetToken: 'private-token'
  })) as any
  const res = response()

  try {
    await invoke(register, {
      body: {
        name: '  Sam Customer ',
        email: ' SAM@Example.com ',
        phone: ' 9876543210 ',
        password: 'password123',
        confirmPassword: 'password123'
      },
      ip: '127.0.0.1'
    }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(res.cookies.length, 1)
    assert.equal(res.cookies[0].name, 'token')
    const { id, ...publicUser } = res.body.data.user
    assert.equal(id.toString(), 'user-1')
    assert.deepEqual(publicUser, {
      name: 'Sam Customer',
      email: 'sam@example.com',
      phone: '9876543210',
      role: 'customer',
      addresses: []
    })
    assert.equal('password' in res.body.data.user, false)
  } finally {
    replaceUserMethod('findOne', originalFindOne)
    replaceUserMethod('create', originalCreate)
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  }
})

test('login rejects unknown, blocked, and incorrect-password users without issuing a token', async () => {
  const originalFindOne = User.findOne
  const queryResults: any[] = [
    null,
    { isBlocked: true, select: async () => ({ isBlocked: true }) },
    { isBlocked: false, comparePassword: async () => false, select: async () => ({
      isBlocked: false,
      comparePassword: async () => false
    }) }
  ]
  User.findOne = (() => ({ select: async () => queryResults.shift() })) as any

  try {
    for (const [status, message] of [
      [401, 'Invalid email or password.'],
      [403, 'Your account has been blocked. Please contact support.'],
      [401, 'Invalid email or password.']
    ] as const) {
      const res = response()
      await invoke(login, { body: { email: ' SAM@Example.com ', password: 'wrong' }, ip: '127.0.0.1' }, res)
      assert.equal(res.statusCode, status)
      assert.equal(res.body.message, message)
      assert.equal(res.cookies.length, 0)
    }
  } finally {
    replaceUserMethod('findOne', originalFindOne)
  }
})

test('login accepts a matching active customer and admin login uses a generic failure response', async () => {
  const originalSecret = process.env.JWT_SECRET
  const originalFindOne = User.findOne
  process.env.JWT_SECRET = 'unit-test-secret-that-is-long-enough'
  const customer = {
    _id: { toString: () => 'customer-1' },
    name: 'Sam Customer',
    email: 'sam@example.com',
    phone: '9876543210',
    role: 'customer',
    authVersion: 2,
    addresses: [],
    isBlocked: false,
    comparePassword: async () => true
  }
  let lookup: any
  User.findOne = ((filter: any) => {
    lookup = filter
    return { select: async () => customer }
  }) as any

  try {
    const customerResponse = response()
    await invoke(login, { body: { email: ' SAM@Example.com ', password: 'correct' }, ip: '127.0.0.1' }, customerResponse)
    assert.deepEqual(lookup, { email: 'sam@example.com', role: 'customer' })
    assert.equal(customerResponse.body.success, true)
    assert.equal(customerResponse.body.data.user.name, 'Sam Customer')
    assert.equal(customerResponse.cookies.length, 1)
    assert.equal((jwt.decode(customerResponse.cookies[0].token) as jwt.JwtPayload).sessionVersion, 2)

    User.findOne = (() => ({ select: async () => ({ ...customer, role: 'admin', comparePassword: async () => false }) })) as any
    const adminResponse = response()
    await invoke(adminLogin, { body: { email: ' ADMIN@Example.com ', password: 'wrong' }, ip: '127.0.0.1' }, adminResponse)
    assert.equal(adminResponse.statusCode, 401)
    assert.equal(adminResponse.body.message, 'Invalid credentials.')
    assert.equal(adminResponse.cookies.length, 0)
  } finally {
    replaceUserMethod('findOne', originalFindOne)
    if (originalSecret === undefined) delete process.env.JWT_SECRET
    else process.env.JWT_SECRET = originalSecret
  }
})

test('resetPassword rejects expired tokens and clears a valid token after saving a new password', async () => {
  const originalFindOneAndUpdate = User.findOneAndUpdate
  const expired = response()
  User.findOneAndUpdate = (async () => null) as any

  try {
    await invoke(resetPassword, { body: { token: 'expired-token', password: 'new-password' } }, expired)
    assert.equal(expired.statusCode, 400)
    assert.equal(expired.body.message, 'Reset link is invalid or has expired.')

    const user = {
      _id: { toString: () => 'user-1' },
      email: 'sam@example.com'
    }
    User.findOneAndUpdate = (async (query: any, update: any, options: any) => {
      assert.match(query.passwordResetToken, /^[a-f0-9]{64}$/)
      assert.ok(query.passwordResetExpires.$gt instanceof Date)
      assert.match(update.$set.password, /^\$2[aby]\$/)
      assert.deepEqual(update.$unset, { passwordResetToken: 1, passwordResetExpires: 1 })
      assert.deepEqual(update.$inc, { authVersion: 1 })
      assert.deepEqual(options, { new: true, runValidators: true })
      return user
    }) as any
    const success = response()
    await invoke(resetPassword, { body: { token: 'valid-token', password: 'new-password' }, ip: '127.0.0.1' }, success)
    assert.equal(success.body.success, true)
  } finally {
    replaceUserMethod('findOneAndUpdate', originalFindOneAndUpdate)
  }
})

test('getMe returns the authenticated user and logout clears the auth cookie', async () => {
  const originalUpdateOne = User.updateOne
  let updateFilter: any
  let updateDocument: any
  User.updateOne = (async (filter: any, update: any) => {
    updateFilter = filter
    updateDocument = update
    return { matchedCount: 1 }
  }) as any
  const res = response()
  const user = { _id: 'user-1', role: 'customer' }

  try {
    await invoke(getMe, { user }, res)
    assert.deepEqual(res.body, { success: true, user })

    await invoke(logout, { user }, res)
    assert.deepEqual(updateFilter, { _id: 'user-1' })
    assert.deepEqual(updateDocument, { $inc: { authVersion: 1 } })
    assert.deepEqual(res.clearedCookies[0].name, 'token')
    assert.equal(res.body.message, 'Logged out successfully.')
  } finally {
    replaceUserMethod('updateOne', originalUpdateOne)
  }
})
