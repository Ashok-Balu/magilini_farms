import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminLoginView from '../../../src/views/admin/AdminLoginView.vue'
import BusinessHoursView from '../../../src/views/admin/BusinessHoursView.vue'

const { auth, api, toast, router } = vi.hoisted(() => ({
  auth: { adminLogin: vi.fn() },
  api: { get: vi.fn(), patch: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn() },
  router: { push: vi.fn() }
}))

vi.mock('@/stores/index.js', () => ({
  useAuthStore: () => auth,
  useToastStore: () => toast
}))
vi.mock('@/lib/api.js', () => ({ default: api }))
vi.mock('vue-router', () => ({ useRouter: () => router }))

const mountOptions = {
  global: {
    stubs: {
      RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
      PasswordInput: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<input type="password" :value="modelValue" v-bind="$attrs" @input="$emit(\'update:modelValue\', $event.target.value)" />'
      }
    }
  }
}

describe('admin route views', () => {
  beforeEach(() => {
    auth.adminLogin.mockReset()
    auth.adminLogin.mockResolvedValue({ success: true })
    api.get.mockReset()
    api.patch.mockReset()
    api.get.mockResolvedValue({
      data: {
        hours: [{ day: 'monday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' }]
      }
    })
    api.patch.mockResolvedValue({})
    toast.error.mockReset()
    toast.success.mockReset()
    router.push.mockReset()
  })

  it('shows the admin sign-in form and redirects after successful authentication', async () => {
    const wrapper = mount(AdminLoginView, mountOptions)
    await wrapper.find('input[type="text"]').setValue('admin@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.adminLogin).toHaveBeenCalledWith('admin@example.com', 'secret')
    expect(router.push).toHaveBeenCalledWith('/admin')
    expect(toast.success).toHaveBeenCalledWith('Welcome back!')
  })

  it('loads business hours and submits the edited schedule', async () => {
    const wrapper = mount(BusinessHoursView, mountOptions)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/business-hours')
    expect(wrapper.text()).toContain('monday')
    expect(wrapper.find('input[type="time"]').element.value).toBe('08:00')

    await wrapper.find('input[type="time"]').setValue('09:00')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/admin/business-hours', {
      hours: [{
        day: 'monday',
        isOpen: true,
        openTime: '09:00',
        closeTime: '20:00',
        pickupOpenTime: '07:00',
        pickupCloseTime: '18:00'
      }]
    })
    expect(toast.success).toHaveBeenCalledWith('Business hours saved!')
  })

  it('surfaces business-hours save errors and clears the saving state', async () => {
    api.patch.mockRejectedValue({ response: { data: { message: 'Schedule could not be saved.' } } })
    const wrapper = mount(BusinessHoursView, mountOptions)
    await flushPromises()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Schedule could not be saved.')
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.get('button').element.disabled).toBe(false)
  })
})
