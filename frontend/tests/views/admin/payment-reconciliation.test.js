import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PaymentReconciliationView from '../../../src/views/admin/PaymentReconciliationView.vue'

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))

vi.mock('@/lib/api.js', () => ({ default: api }))

const mountView = () => mount(PaymentReconciliationView, {
  global: {
    stubs: {
      RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
    }
  }
})

describe('payment reconciliation view', () => {
  beforeEach(() => {
    api.get.mockReset()
    api.get.mockResolvedValue({ data: { orders: [], transactions: [], attempts: [] } })
  })

  it('renders orders, failed attempts, transactions, and their review links', async () => {
    api.get.mockResolvedValue({ data: {
      orders: [{
        _id: 'order-1',
        orderNumber: 'NM-000101',
        customer: { name: 'Sam Customer' },
        paymentStatus: 'refund_pending',
        total: 500,
        refundRequired: true
      }],
      transactions: [{
        _id: 'transaction-1',
        orderId: 'order-1',
        orderNumber: 'NM-000101',
        providerPaymentId: 'pay-1',
        status: 'paid',
        refundStatus: 'pending',
        currency: 'INR',
        amount: 500
      }],
      attempts: [{
        _id: 'attempt-1',
        orderId: 'order-1',
        attemptNumber: 2,
        status: 'failed',
        failureMessage: 'Provider timeout'
      }]
    } })
    const wrapper = mountView()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/payment-reconciliation')
    expect(wrapper.text()).toContain('3 exceptions require review')
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.text()).toContain('Sam Customer')
    expect(wrapper.text()).toContain('Refund required')
    expect(wrapper.text()).toContain('Provider timeout')
    expect(wrapper.text()).toContain('pay-1')
    expect(wrapper.findAll('a[href="/admin/orders/order-1"]')).toHaveLength(3)
  })

  it('renders an empty state when no payment records require review', async () => {
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('No payment exceptions need review.')
    expect(wrapper.text()).toContain('0 exceptions require review')
  })

  it('shows request errors and retries from the refresh button', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Reconciliation unavailable.' } } })
      .mockResolvedValueOnce({ data: { orders: [], transactions: [], attempts: [] } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Reconciliation unavailable.')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('Reconciliation unavailable.')
    expect(wrapper.text()).toContain('No payment exceptions need review.')
  })
})
