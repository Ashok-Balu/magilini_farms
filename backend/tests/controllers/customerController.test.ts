import assert from 'node:assert/strict'
import test from 'node:test'
import User from '../../src/models/User.js'
import {
  addAddress,
  deleteAddress,
  getAddresses,
  getProfile,
  setDefaultAddress,
  updateAddress,
  updateProfile
} from '../../src/controllers/customerController.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

const callController = async (handler: any, req: any, res: any) => {
  let failure: unknown
  await handler(req, res, (err: unknown) => { failure = err })
  if (failure) throw failure
}

const replaceModelMethod = (method: string, value: unknown) => {
  Object.defineProperty(User, method, { configurable: true, writable: true, value })
}

test('updateProfile normalizes email and trims fields before saving', async () => {
  const originalFindById = User.findById
  const originalFindOne = User.findOne
  let saved = 0
  const user: any = {
    _id: 'user-1', email: 'old@example.com', name: 'Before', phone: '111',
    save: async () => { saved += 1 }
  }
  replaceModelMethod('findById', async () => user)
  replaceModelMethod('findOne', async () => null)
  const res = response()

  try {
    await callController(updateProfile, {
      req: undefined,
      user: { _id: 'user-1' },
      body: { name: '  New Name ', email: ' NEW@Example.com ', phone: ' 9876543210 ' }
    }, res)
    assert.equal(saved, 1)
    assert.equal(user.name, 'New Name')
    assert.equal(user.email, 'new@example.com')
    assert.equal(user.phone, '9876543210')
    assert.equal(res.body.message, 'Profile updated.')
  } finally {
    replaceModelMethod('findById', originalFindById)
    replaceModelMethod('findOne', originalFindOne)
  }
})

test('addAddress makes the first address default and persists it', async () => {
  const originalFindById = User.findById
  const addresses: any[] = []
  let saved = 0
  const user: any = { _id: 'user-2', addresses, save: async () => { saved += 1 } }
  replaceModelMethod('findById', async () => user)
  const res = response()

  try {
    await callController(addAddress, {
      user: { _id: 'user-2' },
      body: { fullName: 'Sam', line1: '1 Main St' }
    }, res)
    assert.equal(res.statusCode, 201)
    assert.equal(addresses.length, 1)
    assert.equal(addresses[0].isDefault, true)
    assert.equal(saved, 1)
  } finally {
    replaceModelMethod('findById', originalFindById)
  }
})

test('updateProfile rejects a duplicate normalized email without saving the caller', async () => {
  const originals = { findById: User.findById, findOne: User.findOne }
  let saveCalls = 0
  const user: any = {
    _id: 'user-1',
    email: 'old@example.com',
    save: async () => { saveCalls += 1 }
  }
  User.findById = (async () => user) as any
  User.findOne = (async () => ({ _id: 'other-user' })) as any
  const res = response()

  try {
    await callController(updateProfile, {
      user: { _id: 'user-1' },
      body: { email: ' DUPLICATE@Example.com ' }
    }, res)
    assert.equal(res.statusCode, 409)
    assert.equal(res.body.message, 'This email is already in use.')
    assert.equal(user.email, 'old@example.com')
    assert.equal(saveCalls, 0)
  } finally {
    replaceModelMethod('findById', originals.findById)
    replaceModelMethod('findOne', originals.findOne)
  }
})

test('address APIs return the current profile and address list', async () => {
  const res = response()
  const user = { _id: 'user-1', name: 'Sam', addresses: [{ _id: 'address-1' }] }

  await callController(getProfile, { user }, res)
  assert.deepEqual(res.body, { success: true, user })

  await callController(getAddresses, { user }, res)
  assert.deepEqual(res.body, { success: true, addresses: user.addresses })
})

test('updating or selecting a default address leaves exactly one default', async () => {
  const originalFindById = User.findById
  let saveCalls = 0
  const addresses: any = [
    { _id: 'address-1', fullName: 'First', isDefault: true },
    { _id: 'address-2', fullName: 'Second', isDefault: false }
  ]
  addresses.id = (id: string) => addresses.find((address: any) => address._id === id)
  const user: any = { addresses, save: async () => { saveCalls += 1 } }
  User.findById = (async () => user) as any

  try {
    const updated = response()
    await callController(updateAddress, {
      user: { _id: 'user-1' },
      params: { id: 'address-2' },
      body: { fullName: 'Second Updated', isDefault: true }
    }, updated)
    assert.equal(addresses[0].isDefault, false)
    assert.equal(addresses[1].isDefault, true)
    assert.equal(addresses[1].fullName, 'Second Updated')
    assert.equal(saveCalls, 1)

    await callController(setDefaultAddress, {
      user: { _id: 'user-1' },
      params: { id: 'address-1' }
    }, response())
    assert.equal(addresses[0].isDefault, true)
    assert.equal(addresses[1].isDefault, false)
    assert.equal(saveCalls, 2)
  } finally {
    replaceModelMethod('findById', originalFindById)
  }
})

test('deleting the default address promotes the next remaining address', async () => {
  const originalFindById = User.findById
  let saveCalls = 0
  const addresses: any = [
    { _id: 'address-1', isDefault: true, deleteOne() { addresses.splice(addresses.indexOf(this), 1) } },
    { _id: 'address-2', isDefault: false, deleteOne() { addresses.splice(addresses.indexOf(this), 1) } }
  ]
  addresses.id = (id: string) => addresses.find((address: any) => address._id === id)
  const user: any = { addresses, save: async () => { saveCalls += 1 } }
  User.findById = (async () => user) as any

  try {
    const res = response()
    await callController(deleteAddress, {
      user: { _id: 'user-1' },
      params: { id: 'address-1' }
    }, res)
    assert.equal(addresses.length, 1)
    assert.equal(addresses[0]._id, 'address-2')
    assert.equal(addresses[0].isDefault, true)
    assert.equal(saveCalls, 1)
    assert.equal(res.body.message, 'Address deleted.')
  } finally {
    replaceModelMethod('findById', originalFindById)
  }
})

test('address mutations return not-found for IDs that do not belong to the account', async () => {
  const originalFindById = User.findById
  const addresses: any = []
  addresses.id = () => undefined
  User.findById = (async () => ({ addresses })) as any

  try {
    for (const [handler, req] of [
      [updateAddress, { params: { id: 'missing' }, body: {} }],
      [deleteAddress, { params: { id: 'missing' } }],
      [setDefaultAddress, { params: { id: 'missing' } }]
    ] as const) {
      const res = response()
      await callController(handler, { user: { _id: 'user-1' }, ...req }, res)
      assert.equal(res.statusCode, 404)
      assert.equal(res.body.message, 'Address not found.')
    }
  } finally {
    replaceModelMethod('findById', originalFindById)
  }
})
