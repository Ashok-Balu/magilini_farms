import assert from 'node:assert/strict'
import test, { afterEach, beforeEach } from 'node:test'
import axios from 'axios'
import { NotificationDelivery } from '../../src/models/index.js'

import {
  notifyBulkEnquiry,
  notifyComplaintReceived,
  notifyLowStock,
  notifyOrderPlaced,
  notifySeasonAvailable,
  notifyStatusUpdate,
  retryWAMessage,
  sendSMS,
  sendWAMessage
} from '../../src/services/notificationService.js'

const originalCreate = NotificationDelivery.create
const originalFindOneAndUpdate = NotificationDelivery.findOneAndUpdate
const originalUpdateOne = NotificationDelivery.updateOne
const originalFindById = NotificationDelivery.findById
const deliveries = new Map<string, any>()
let deliverySequence = 0

beforeEach(() => {
  deliveries.clear()
  deliverySequence = 0
  NotificationDelivery.create = (async (data: any) => {
    const delivery = { ...data, _id: `delivery-${++deliverySequence}`, status: 'pending', attempts: 0 }
    deliveries.set(delivery._id, delivery)
    return delivery
  }) as any
  NotificationDelivery.findOneAndUpdate = (async (query: any, update: any) => {
    const delivery = deliveries.get(String(query._id))
    if (!delivery || !query.status.$in.includes(delivery.status)) return null
    Object.assign(delivery, update.$set)
    delivery.attempts += update.$inc.attempts
    return { ...delivery }
  }) as any
  NotificationDelivery.updateOne = (async (query: any, update: any) => {
    const delivery = deliveries.get(String(query._id))
    if (delivery && delivery.status === query.status) Object.assign(delivery, update.$set)
    return { modifiedCount: delivery ? 1 : 0 }
  }) as any
  NotificationDelivery.findById = (async (id: string) => {
    const delivery = deliveries.get(String(id))
    return delivery ? { ...delivery } : null
  }) as any
})

afterEach(() => {
  NotificationDelivery.create = originalCreate
  NotificationDelivery.findOneAndUpdate = originalFindOneAndUpdate
  NotificationDelivery.updateOne = originalUpdateOne
  NotificationDelivery.findById = originalFindById
})

test('console-mode SMS notifications report simulated status instead of successful delivery', async () => {
  const originalLog = console.log
  const originalError = console.error
  const messages: string[] = []

  console.log = (...args: unknown[]) => {
    messages.push(args.join(' '))
  }
  console.error = (...args: unknown[]) => {
    messages.push(args.join(' '))
  }

  try {
    const result = await sendSMS('9876543210', 'status update')
    assert.equal(result, true)
    const joined = messages.join(' ')
    assert.match(joined, /simulated/i)
    assert.doesNotMatch(joined, /delivered/i)
    assert.doesNotMatch(joined, /9876543210|status update/i)
  } finally {
    console.log = originalLog
    console.error = originalError
  }
})

test('console-mode WhatsApp notifications report simulated status instead of delivered', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalWhatsAppKey = process.env.WA_API_KEY
  const originalWhatsAppUrl = process.env.WA_API_URL
  process.env.NODE_ENV = 'test'
  process.env.WA_API_KEY = 'configured-test-key'
  process.env.WA_API_URL = 'https://example.invalid/messages'

  const originalLog = console.log
  const originalError = console.error
  const messages: string[] = []

  console.log = (...args: unknown[]) => {
    messages.push(args.join(' '))
  }
  console.error = (...args: unknown[]) => {
    messages.push(args.join(' '))
  }

  try {
    const result = await sendWAMessage('9876543210', 'order_confirmed', ['ABC123'])
    assert.equal(result, true)
    const joined = messages.join(' ')
    assert.match(joined, /simulated/i)
    assert.doesNotMatch(joined, /delivered/i)
    assert.doesNotMatch(joined, /9876543210|ABC123/i)
  } finally {
    console.log = originalLog
    console.error = originalError
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalWhatsAppKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWhatsAppKey
    if (originalWhatsAppUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWhatsAppUrl
  }
})

test('configured WhatsApp provider receives the expected template payload', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEnabled = process.env.ENABLE_REAL_NOTIFICATIONS
  const originalWhatsAppKey = process.env.WA_API_KEY
  const originalWhatsAppUrl = process.env.WA_API_URL
  const originalPost = axios.post
  const originalLog = console.log
  let request: { url: string; body: any; config: any } | undefined
  process.env.NODE_ENV = 'production'
  process.env.ENABLE_REAL_NOTIFICATIONS = 'true'
  process.env.WA_API_KEY = 'configured-test-key'
  process.env.WA_API_URL = 'https://example.invalid/messages'
  axios.post = (async (url: string, body: any, config: any) => {
    request = { url, body, config }
    return { status: 200 } as any
  }) as any
  console.log = () => {}

  try {
    assert.equal(await sendWAMessage('9876543210', 'order_confirmed', ['NM-000101', '500']), true)
    assert.deepEqual(request, {
      url: 'https://example.invalid/messages',
      body: {
        countryCode: '+91',
        phoneNumber: '9876543210',
        callbackData: 'order-update',
        type: 'Template',
        template: {
          name: 'order_confirmed',
          languageCode: 'en',
          bodyValues: ['NM-000101', '500']
        }
      },
      config: {
        headers: {
          Authorization: 'Basic configured-test-key',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    })
  } finally {
    axios.post = originalPost
    console.log = originalLog
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalEnabled === undefined) delete process.env.ENABLE_REAL_NOTIFICATIONS
    else process.env.ENABLE_REAL_NOTIFICATIONS = originalEnabled
    if (originalWhatsAppKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWhatsAppKey
    if (originalWhatsAppUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWhatsAppUrl
  }
})

test('WhatsApp provider failures and missing configuration are not reported as delivered', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEnabled = process.env.ENABLE_REAL_NOTIFICATIONS
  const originalWhatsAppKey = process.env.WA_API_KEY
  const originalWhatsAppUrl = process.env.WA_API_URL
  const originalPost = axios.post
  const originalError = console.error
  const errors: string[] = []
  process.env.NODE_ENV = 'production'
  process.env.ENABLE_REAL_NOTIFICATIONS = 'true'
  process.env.WA_API_KEY = 'configured-test-key'
  process.env.WA_API_URL = 'https://example.invalid/messages'
  axios.post = (async () => { throw new Error('provider unavailable') }) as any
  console.error = (...args: unknown[]) => { errors.push(args.join(' ')) }

  try {
    assert.equal(await sendWAMessage('9876543210', 'order_confirmed'), false)
    assert.match(errors.join(' '), /provider request failed/)

    delete process.env.WA_API_URL
    assert.equal(await sendWAMessage('9876543210', 'order_confirmed'), false)
    assert.match(errors.join(' '), /WA_API_KEY and WA_API_URL are required/)
  } finally {
    axios.post = originalPost
    console.error = originalError
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalEnabled === undefined) delete process.env.ENABLE_REAL_NOTIFICATIONS
    else process.env.ENABLE_REAL_NOTIFICATIONS = originalEnabled
    if (originalWhatsAppKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWhatsAppKey
    if (originalWhatsAppUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWhatsAppUrl
  }
})

test('failed WhatsApp deliveries are stored and can be retried by an admin', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEnabled = process.env.ENABLE_REAL_NOTIFICATIONS
  const originalWhatsAppKey = process.env.WA_API_KEY
  const originalWhatsAppUrl = process.env.WA_API_URL
  const originalPost = axios.post
  process.env.NODE_ENV = 'production'
  process.env.ENABLE_REAL_NOTIFICATIONS = 'true'
  process.env.WA_API_KEY = 'configured-test-key'
  process.env.WA_API_URL = 'https://example.invalid/messages'
  axios.post = (async () => { throw new Error('provider unavailable') }) as any
  const originalError = console.error
  console.error = () => {}

  try {
    assert.equal(await sendWAMessage('9876543210', 'order_confirmed', ['NM-000101'], { orderNumber: 'NM-000101' }), false)
    const failedDelivery = [...deliveries.values()][0]
    assert.equal(failedDelivery.status, 'failed')
    assert.equal(failedDelivery.attempts, 1)
    assert.equal(failedDelivery.orderNumber, 'NM-000101')

    axios.post = (async () => ({ status: 200 })) as any
    const result = await retryWAMessage(failedDelivery._id)
    assert.equal(result?.sent, true)
    assert.equal(result?.delivery.status, 'delivered')
    assert.equal(result?.delivery.attempts, 2)
  } finally {
    axios.post = originalPost
    console.error = originalError
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalEnabled === undefined) delete process.env.ENABLE_REAL_NOTIFICATIONS
    else process.env.ENABLE_REAL_NOTIFICATIONS = originalEnabled
    if (originalWhatsAppKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWhatsAppKey
    if (originalWhatsAppUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWhatsAppUrl
  }
})

test('order and stock/support notification events do not write personal data to logs', async () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalEnabled = process.env.ENABLE_REAL_NOTIFICATIONS
  const originalWhatsAppKey = process.env.WA_API_KEY
  const originalWhatsAppUrl = process.env.WA_API_URL
  const originalAdminNumber = process.env.ADMIN_WA_NUMBER
  const originalPost = axios.post
  const originalLog = console.log
  const requests: any[] = []
  const messages: string[] = []
  process.env.NODE_ENV = 'production'
  process.env.ENABLE_REAL_NOTIFICATIONS = 'true'
  process.env.WA_API_KEY = 'configured-test-key'
  process.env.WA_API_URL = 'https://example.invalid/messages'
  process.env.ADMIN_WA_NUMBER = '919876543210'
  axios.post = (async (_url: string, body: any) => {
    requests.push(body)
    return { status: 200 } as any
  }) as any
  console.log = (...args: unknown[]) => { messages.push(args.join(' ')) }

  const order = {
    orderNumber: 'NM-000101',
    total: 500,
    paymentMethod: 'pay-at-farm',
    deliveryType: 'home',
    customer: { name: 'Sam Customer', phone: '9876543210' },
    items: [{ name: 'Alphonso Mango', weight: '1 kg', qty: 2 }]
  }

  try {
    await notifyOrderPlaced(order)
    for (const status of ['Confirmed', 'Packed', 'Shipped', 'Delivered', 'Pickup-Ready', 'Picked-Up', 'Cancelled']) {
      await notifyStatusUpdate({ ...order, status })
    }
    await notifySeasonAvailable('9876543210', 'Alphonso Mango')
    await notifyLowStock('Alphonso Mango', '1 kg', 5)
    await notifyComplaintReceived({ complaintNumber: 'CMP-0001', orderId: 'NM-000101', phone: '9876543210' })
    await notifyBulkEnquiry({ name: 'Sam Customer', phone: '9876543210', variety: 'Alphonso', quantity: '25 kg', city: 'Salem' })

    assert.equal(requests[0].template.name, 'order_received')
    assert.deepEqual(requests[0].template.bodyValues, ['NM-000101', '500'])
    assert.deepEqual(requests.slice(1, 8).map((request) => request.template.name), [
      'status_confirmed',
      'status_packed',
      'status_shipped',
      'status_delivered',
      'status_pickup-ready',
      'status_picked-up',
      'status_cancelled'
    ])
    assert.deepEqual(requests[8].template, {
      name: 'season_available',
      languageCode: 'en',
      bodyValues: ['Alphonso Mango']
    })
    assert.doesNotMatch(messages.join(' '), /9876543210|Sam Customer|NM-000101|CMP-0001|25 kg|Alphonso Mango/)
  } finally {
    axios.post = originalPost
    console.log = originalLog
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalEnabled === undefined) delete process.env.ENABLE_REAL_NOTIFICATIONS
    else process.env.ENABLE_REAL_NOTIFICATIONS = originalEnabled
    if (originalWhatsAppKey === undefined) delete process.env.WA_API_KEY
    else process.env.WA_API_KEY = originalWhatsAppKey
    if (originalWhatsAppUrl === undefined) delete process.env.WA_API_URL
    else process.env.WA_API_URL = originalWhatsAppUrl
    if (originalAdminNumber === undefined) delete process.env.ADMIN_WA_NUMBER
    else process.env.ADMIN_WA_NUMBER = originalAdminNumber
  }
})
