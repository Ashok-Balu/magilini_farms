import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ComplaintView from '../../src/views/ComplaintView.vue'
import TrackView from '../../src/views/TrackView.vue'

const { api, toast, auth } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn() },
  auth: { isLoggedIn: false, isCustomer: false }
}))

vi.mock('@/lib/api.js', () => ({ default: api }))
vi.mock('@/stores/index.js', () => ({ useAuthStore: () => auth, useToastStore: () => toast }))

const mountOptions = {
  global: {
    stubs: {
      AppNavbar: true,
      AppFooter: true,
      RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
    }
  }
}

describe('complaint route view', () => {
  beforeEach(() => {
    api.post.mockReset()
    api.post.mockResolvedValue({ data: { complaintNumber: 'CMP-0004' } })
    toast.error.mockReset()
    toast.success.mockReset()
  })

  it('shows field validation and avoids sending an incomplete complaint', async () => {
    const wrapper = mount(ComplaintView, mountOptions)
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Order number is required.')
    expect(wrapper.text()).toContain('Enter a valid 10-digit phone number.')
    expect(wrapper.text()).toContain('At least one photo is required.')
    expect(api.post).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('Please fix the highlighted fields.')
  })

  it('submits required details with attached photos and renders the returned reference', async () => {
    const wrapper = mount(ComplaintView, mountOptions)
    await wrapper.find('input[placeholder^="NM-"]').setValue('NM-000001')
    await wrapper.find('input[placeholder="9876543210"]').setValue('9876543210')
    await wrapper.find('input[type="date"]').setValue('2026-06-01')
    await wrapper.find('textarea').setValue('Fruit arrived damaged')

    const fileInput = wrapper.find('input[type="file"]').element
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [new File(['photo'], 'damage.jpg', { type: 'image/jpeg' })]
    })
    await wrapper.find('input[type="file"]').trigger('change')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post.mock.calls[0][0]).toBe('/complaints')
    expect(api.post.mock.calls[0][1]).toBeInstanceOf(FormData)
    expect(wrapper.text()).toContain('Complaint Submitted')
    expect(wrapper.text()).toContain('CMP-0004')
    expect(toast.success).toHaveBeenCalledWith('Complaint submitted successfully!')
  })
})

describe('order tracking route view', () => {
  beforeEach(() => {
    api.get.mockReset()
    toast.error.mockReset()
    auth.isLoggedIn = false
    auth.isCustomer = false
  })

  it('requires a customer session before accepting an order number', async () => {
    const wrapper = mount(TrackView, mountOptions)

    expect(wrapper.text()).toContain('Order numbers are not access credentials.')
    expect(wrapper.get('a[href="/login"]').text()).toBe('Sign in')
    expect(wrapper.find('input').exists()).toBe(false)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('normalizes the order number and displays the returned delivery status', async () => {
    auth.isLoggedIn = true
    auth.isCustomer = true
    api.get.mockResolvedValue({
      data: { order: { orderNumber: 'NM-000042', status: 'Shipped', customer: { name: 'Sam' } } }
    })
    const wrapper = mount(TrackView, mountOptions)
    await wrapper.find('input').setValue('nm-000042')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/orders/track/NM-000042')
    expect(wrapper.text()).toContain('NM-000042')
    expect(wrapper.text()).not.toContain('Customer: Sam')
    expect(wrapper.text()).toContain('Shipped')
  })
})
