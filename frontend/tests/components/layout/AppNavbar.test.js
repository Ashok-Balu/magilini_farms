import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  currentPath: '/',
  user: null,
  count: 0,
  logout: vi.fn(),
  push: vi.fn(),
  get: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({ currentRoute: { value: { path: mocks.currentPath } }, push: mocks.push })
  }
})
vi.mock('@/stores/index.js', () => ({
  useAuthStore: () => ({
    get user() { return mocks.user },
    get isLoggedIn() { return Boolean(mocks.user) },
    get isAdmin() { return mocks.user?.role === 'admin' },
    logout: mocks.logout
  }),
  useCartStore: () => ({ get count() { return mocks.count } })
}))
vi.mock('@/lib/api.js', () => ({ default: { get: mocks.get } }))

import AppNavbar from '../../../src/components/layout/AppNavbar.vue'

const mountNavbar = () => mount(AppNavbar, {
  global: {
    stubs: {
      RouterLink: {
        props: ['to'],
        template: '<a :href="to" @click="$emit(\'click\', $event)"><slot /></a>'
      }
    }
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.currentPath = '/'
  mocks.user = null
  mocks.count = 0
  mocks.get.mockResolvedValue({ data: { products: [] } })
})

describe('AppNavbar', () => {
  it('shows public links, sign-in, and the cart quantity', () => {
    mocks.count = 3
    const wrapper = mountNavbar()

    expect(wrapper.text()).toContain('Home')
    expect(wrapper.text()).toContain('About')
    expect(wrapper.text()).toContain('Sign In')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.find('a[href="/cart"]').exists()).toBe(true)
  })

  it('opens mobile navigation and search', async () => {
    const wrapper = mountNavbar()
    await wrapper.find('button.md\\:hidden').trigger('click')
    expect(wrapper.text()).toContain('Shop All')
    await wrapper.findAll('button').find(button => button.text().includes('🔍')).trigger('click')
    expect(wrapper.find('input[placeholder="Search mangoes, fruits..."]').exists()).toBe(true)
  })

  it('shows account actions and logs out to the home page', async () => {
    mocks.user = { name: 'Farm Admin', role: 'admin' }
    mocks.logout.mockResolvedValue()
    const wrapper = mountNavbar()
    await wrapper.findAll('button').find(button => button.text().includes('Farm')).trigger('click')
    expect(wrapper.text()).toContain('Admin Panel')
    expect(wrapper.text()).toContain('My Orders')

    await wrapper.findAll('button').find(button => button.text().includes('Sign Out')).trigger('click')
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(mocks.push).toHaveBeenCalledWith('/')
  })
})
