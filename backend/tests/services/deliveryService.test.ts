import assert from 'node:assert/strict'
import test from 'node:test'
import { Pincode } from '../../src/models/index.js'
import { calculateDeliveryFee, getDeliveryByPincode } from '../../src/services/deliveryService.js'

const replacePincodeMethod = (method: string, value: unknown) => {
  Object.defineProperty(Pincode, method, { configurable: true, writable: true, value })
}

test('delivery lookup rejects malformed pincodes before database or network access', async () => {
  for (const pincode of ['12345', '012345']) {
    await assert.rejects(getDeliveryByPincode(pincode), (err: any) => {
      assert.equal(err.message, 'Pincode must be 6 digits.')
      assert.equal(err.statusCode, 400)
      return true
    })
  }
})

test('free delivery threshold is optional and applied at the configured subtotal', () => {
  assert.equal(calculateDeliveryFee(80, 799.99, 800), 80)
  assert.equal(calculateDeliveryFee(80, 800, 800), 0)
  assert.equal(calculateDeliveryFee(80, 5000, 0), 80)
})

test('delivery lookup respects cached serviceability overrides without postal requests', async () => {
  const originalFindOne = Pincode.findOne
  const originalFetch = globalThis.fetch
  let fetchCalls = 0
  replacePincodeMethod('findOne', async () => ({
    city: 'Salem', district: 'Salem', state: 'Tamil Nadu', zone: 'tamil-nadu',
    deliveryFee: 35, estimatedDays: 'Same day', isActive: true, isServiceable: false,
    reason: 'Temporarily unavailable'
  }))
  globalThis.fetch = (async () => { fetchCalls += 1; throw new Error('unexpected network call') }) as any

  try {
    const result = await getDeliveryByPincode(' 636001 ')
    assert.deepEqual(result, {
      success: true,
      serviceable: false,
      message: 'Temporarily unavailable',
      reason: 'Temporarily unavailable',
      city: 'Salem',
      district: 'Salem',
      state: 'Tamil Nadu'
    })
    assert.equal(fetchCalls, 0)
  } finally {
    replacePincodeMethod('findOne', originalFindOne)
    globalThis.fetch = originalFetch
  }
})

test('postal metadata is cached but never grants serviceability without admin approval', async () => {
  const originalFindOne = Pincode.findOne
  const originalCreate = Pincode.create
  const originalFetch = globalThis.fetch
  let createArgs: any
  replacePincodeMethod('findOne', async () => null)
  Pincode.create = async (record: any) => { createArgs = record; return record }
  globalThis.fetch = (async (input: any) => {
    assert.equal(String(input), 'https://api.postalpincode.in/pincode/560001')
    return {
      ok: true,
      json: async () => [{ Status: 'Success', PostOffice: [{ Block: 'Bengaluru', District: 'Bengaluru Urban', State: 'Karnataka' }] }]
    } as any
  }) as any

  try {
    const result = await getDeliveryByPincode('560001')
    assert.equal(createArgs.zone, 'south-india')
    assert.equal(createArgs.deliveryFee, 120)
    assert.equal(createArgs.estimatedDays, '2-3 Days')
    assert.equal(createArgs.city, 'Bengaluru')
    assert.equal(createArgs.isServiceable, false)
    assert.equal(result.serviceable, false)
    assert.equal(result.reason, 'Postal metadata cached; serviceability requires admin approval.')
    assert.equal(result.city, 'Bengaluru')
  } finally {
    replacePincodeMethod('findOne', originalFindOne)
    Pincode.create = originalCreate
    globalThis.fetch = originalFetch
  }
})

test('postal API request timeout is translated to a retryable service error', async () => {
  const originalFindOne = Pincode.findOne
  const originalFetch = globalThis.fetch
  replacePincodeMethod('findOne', async () => null)
  globalThis.fetch = (async (_input: any, options: any) => {
    assert.ok(options.signal)
    const error = new Error('timed out')
    error.name = 'TimeoutError'
    throw error
  }) as any

  try {
    await assert.rejects(getDeliveryByPincode('600001'), (err: any) => {
      assert.equal(err.statusCode, 503)
      assert.match(err.message, /timed out/i)
      return true
    })
  } finally {
    replacePincodeMethod('findOne', originalFindOne)
    globalThis.fetch = originalFetch
  }
})

test('postal API rejects structurally incomplete location metadata', async () => {
  const originalFindOne = Pincode.findOne
  const originalFetch = globalThis.fetch
  replacePincodeMethod('findOne', async () => null)
  globalThis.fetch = (async () => ({
    ok: true,
    json: async () => [{ Status: 'Success', PostOffice: [{ Pincode: '600001', District: 'Chennai' }] }]
  })) as any

  try {
    await assert.rejects(getDeliveryByPincode('600001'), (err: any) => {
      assert.equal(err.statusCode, 502)
      assert.match(err.message, /incomplete/i)
      return true
    })
  } finally {
    replacePincodeMethod('findOne', originalFindOne)
    globalThis.fetch = originalFetch
  }
})

test('postal lookup exposes upstream, malformed-response, and not-found status codes', async () => {
  const originalFindOne = Pincode.findOne
  const originalFetch = globalThis.fetch
  replacePincodeMethod('findOne', async () => null)

  try {
    globalThis.fetch = (async () => ({ ok: false })) as any
    await assert.rejects(getDeliveryByPincode('600001'), (err: any) => {
      assert.equal(err.statusCode, 502)
      assert.equal(err.message, 'Unable to resolve pincode from postal service.')
      return true
    })

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ unexpected: true })
    })) as any
    await assert.rejects(getDeliveryByPincode('600001'), (err: any) => {
      assert.equal(err.statusCode, 502)
      assert.equal(err.message, 'Invalid pincode lookup response.')
      return true
    })

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => [{ Status: 'Error', PostOffice: [] }]
    })) as any
    await assert.rejects(getDeliveryByPincode('600001'), (err: any) => {
      assert.equal(err.statusCode, 404)
      assert.equal(err.message, 'Pincode not found.')
      return true
    })
  } finally {
    replacePincodeMethod('findOne', originalFindOne)
    globalThis.fetch = originalFetch
  }
})
