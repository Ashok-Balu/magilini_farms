import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  get: vi.fn(),
  post: vi.fn()
}))

vi.mock('@/stores/index.js', () => ({ useToastStore: () => ({ success: mocks.success }) }))
vi.mock('@/lib/api.js', () => ({ default: { get: mocks.get, post: mocks.post } }))

import DirectUpiPayment from '../../../src/components/payment/DirectUpiPayment.vue'

const order = { _id: 'order-1', orderNumber: 'MF-100', total: 500, utrNumber: '' }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.get.mockResolvedValue({ data: { directUpi: { enabled: true, upiId: 'farm@upi', upiName: 'Magilini Farms' } } })
})

describe('DirectUpiPayment', () => {
  it('renders the configured payment details and encoded UPI link', async () => {
    const wrapper = mount(DirectUpiPayment, { props: { order } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('farm@upi'))

    const link = wrapper.get('a').attributes('href')
    expect(link).toContain('upi://pay?')
    expect(link).toContain('pa=farm%40upi')
    expect(link).toContain('am=500')
    expect(link).toContain('tn=Order+MF-100')
  })

  it('validates UTR locally and submits a valid reference once', async () => {
    mocks.post.mockResolvedValueOnce({})
    const wrapper = mount(DirectUpiPayment, { props: { order } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('farm@upi'))

    await wrapper.get('form input').setValue('123')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('valid UTR')
    expect(mocks.post).not.toHaveBeenCalled()

    await wrapper.get('form input').setValue('ABC-12345')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(mocks.post).toHaveBeenCalledOnce())
    expect(mocks.post).toHaveBeenCalledWith('/payment/submit-upi-reference', { orderId: 'order-1', upiRef: 'ABC-12345' })
    expect(wrapper.text()).toContain('submitted. Payment is pending farm verification.')
    expect(mocks.success).toHaveBeenCalled()
  })

  it('reports unavailable configuration and displays an existing UTR when enabled', async () => {
    mocks.get.mockRejectedValueOnce(new Error('Offline'))
    const wrapper = mount(DirectUpiPayment, { props: { order } })
    await vi.waitFor(() => expect(wrapper.text()).toContain('not configured'))
    expect(wrapper.text()).not.toContain('REF12345')

    mocks.get.mockResolvedValueOnce({ data: { directUpi: { enabled: true, upiId: 'farm@upi', upiName: 'Farm' } } })
    const submitted = mount(DirectUpiPayment, { props: { order: { ...order, utrNumber: 'REF12345' } } })
    await vi.waitFor(() => expect(submitted.text()).toContain('REF12345 submitted'))
    expect(submitted.find('form').exists()).toBe(false)
  })
})
