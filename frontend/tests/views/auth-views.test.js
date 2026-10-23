import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LoginView from '../../src/views/LoginView.vue'
import RegisterView from '../../src/views/RegisterView.vue'
import ForgotPasswordView from '../../src/views/ForgotPasswordView.vue'
import ResetPasswordView from '../../src/views/ResetPasswordView.vue'
import AdminLoginView from '../../src/views/admin/AdminLoginView.vue'

const { auth, toast, router, route } = vi.hoisted(() => ({
  auth: {},
  toast: {},
  router: { push: vi.fn() },
  route: { query: {}, params: { token: 'reset-token' } }
}))

vi.mock('@/stores/index.js', () => ({
  useAuthStore: () => auth,
  useToastStore: () => toast
}))

vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => route
}))

const mountOptions = {
  global: {
    stubs: {
      RouterLink: {
        props: ['to'],
        template: '<a :href="to"><slot /></a>'
      },
      PasswordInput: {
        props: ['modelValue'],
        emits: ['update:modelValue'],
        template: '<input type="password" :value="modelValue" v-bind="$attrs" @input="$emit(\'update:modelValue\', $event.target.value)" />'
      }
    }
  }
}

const setValue = async (wrapper, selector, value) => {
  await wrapper.find(selector).setValue(value)
}

describe('customer authentication route views', () => {
  beforeEach(() => {
    auth.loading = false
    auth.login = vi.fn().mockResolvedValue({ success: true })
    auth.register = vi.fn().mockResolvedValue({ success: true })
    auth.forgotPassword = vi.fn().mockResolvedValue({ success: true, message: 'If the address exists, a reset link was sent.' })
    auth.resetPassword = vi.fn().mockResolvedValue({ success: true })
    auth.adminLogin = vi.fn().mockResolvedValue({ success: true })
    toast.error = vi.fn()
    toast.success = vi.fn()
    router.push.mockReset()
    route.query = {}
    route.params = { token: 'reset-token' }
  })

  it('shows login validation errors and does not call the auth store for invalid credentials', async () => {
    const wrapper = mount(LoginView, mountOptions)

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Password is required.')
    expect(auth.login).not.toHaveBeenCalled()
  })

  it('submits valid login credentials and honors the requested redirect', async () => {
    route.query = { redirect: '/account/orders' }
    const wrapper = mount(LoginView, mountOptions)
    await setValue(wrapper, 'input[type="email"]', ' person@example.com ')
    await setValue(wrapper, 'input[type="password"]', 'secret')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.login).toHaveBeenCalledWith('person@example.com', 'secret')
    expect(router.push).toHaveBeenCalledWith('/account/orders')
    expect(wrapper.text()).not.toContain('Email is required.')
  })

  it('validates registration fields before making a request', async () => {
    const wrapper = mount(RegisterView, mountOptions)
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Name is required.')
    expect(wrapper.text()).toContain('Email is required.')
    expect(wrapper.text()).toContain('Password must be at least 8 characters.')
    expect(auth.register).not.toHaveBeenCalled()
  })

  it('submits a valid registration and navigates to the default destination', async () => {
    const wrapper = mount(RegisterView, mountOptions)
    await setValue(wrapper, 'input[type="text"]', '  Alex Farmer  ')
    await setValue(wrapper, 'input[type="email"]', 'alex@example.com')
    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('password123')
    await passwordInputs[1].setValue('password123')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.register).toHaveBeenCalledWith({
      name: 'Alex Farmer',
      email: 'alex@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      phone: undefined
    })
    expect(router.push).toHaveBeenCalledWith('/')
  })

  it('keeps the forgot-password form visible for invalid email and reveals confirmation after success', async () => {
    const wrapper = mount(ForgotPasswordView, mountOptions)
    await setValue(wrapper, 'input[type="email"]', 'not-an-email')
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Enter a valid email address.')
    expect(auth.forgotPassword).not.toHaveBeenCalled()

    await setValue(wrapper, 'input[type="email"]', 'person@example.com')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.forgotPassword).toHaveBeenCalledWith('person@example.com')
    expect(wrapper.text()).toContain('Check your email')
    expect(wrapper.text()).toContain('If the address exists, a reset link was sent.')
  })

  it('validates and completes password reset using the route token', async () => {
    const wrapper = mount(ResetPasswordView, mountOptions)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Password must be at least 8 characters.')
    expect(auth.resetPassword).not.toHaveBeenCalled()

    const passwordInputs = wrapper.findAll('input[type="password"]')
    await passwordInputs[0].setValue('newpassword')
    await passwordInputs[1].setValue('newpassword')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.resetPassword).toHaveBeenCalledWith('reset-token', 'newpassword')
    expect(wrapper.text()).toContain('Password updated')
  })
})

describe('admin login route view', () => {
  beforeEach(() => {
    auth.adminLogin = vi.fn().mockResolvedValue({ success: true })
    toast.error = vi.fn()
    toast.success = vi.fn()
    router.push.mockReset()
  })

  it('requires both credentials, then redirects after a successful admin login', async () => {
    const wrapper = mount(AdminLoginView, mountOptions)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Email and password are required.')
    expect(auth.adminLogin).not.toHaveBeenCalled()

    await setValue(wrapper, 'input[type="text"]', ' admin@example.com ')
    await setValue(wrapper, 'input[type="password"]', 'secret')
    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(auth.adminLogin).toHaveBeenCalledWith('admin@example.com', 'secret')
    expect(router.push).toHaveBeenCalledWith('/admin')
  })
})
