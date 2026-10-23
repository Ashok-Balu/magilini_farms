import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  user: null,
  loading: false,
  isLoggedIn: false,
  isAdmin: false,
  isCustomer: false,
  fetchMe: vi.fn()
}))

vi.mock('@/stores/index.js', () => ({ useAuthStore: () => auth }))

import router from '../../src/router/index.js'

beforeEach(async () => {
  window.scrollTo = vi.fn()
  auth.user = null
  auth.loading = false
  auth.isLoggedIn = false
  auth.isAdmin = false
  auth.isCustomer = false
  auth.fetchMe.mockReset()
  auth.fetchMe.mockResolvedValue()
  await router.push('/')
})

describe('router', () => {
  it('registers customer, admin, and fallback routes', () => {
    const names = router.getRoutes().map(route => route.name).filter(Boolean)
    expect(names).toContain('Home')
    expect(names).toContain('Checkout')
    expect(names).toContain('AdminDashboard')
    expect(names).toContain('AdminNotifications')
    expect(names).toContain('AdminAuditLogs')
    expect(names).toContain('NotFound')
  })

  it('redirects guests to login with the requested path', async () => {
    await router.push('/checkout?coupon=SAVE')
    expect(router.currentRoute.value.name).toBe('Login')
    expect(router.currentRoute.value.query.redirect).toBe('/checkout?coupon=SAVE')
    expect(auth.fetchMe).toHaveBeenCalledOnce()
  })

  it('allows customers into customer routes and redirects admins to admin home', async () => {
    auth.user = { role: 'customer' }
    auth.isLoggedIn = true
    auth.isCustomer = true
    await router.push('/account')
    expect(router.currentRoute.value.name).toBe('Account')

    auth.user = { role: 'admin' }
    auth.isAdmin = true
    auth.isCustomer = false
    await router.push('/checkout')
    expect(router.currentRoute.value.path).toBe('/admin')
  }, 20000)

  it('sends non-admins away from admin pages and logged-in users away from guest pages', async () => {
    await router.push('/admin/products')
    expect(router.currentRoute.value.path).toBe('/admin/login')

    await router.push('/')
    auth.user = { role: 'customer' }
    auth.isLoggedIn = true
    auth.isCustomer = true
    await router.push('/admin/products')
    expect(router.currentRoute.value.path).toBe('/')

    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('uses a smooth scroll-to-top policy', () => {
    expect(router.options.scrollBehavior()).toEqual({ top: 0, behavior: 'smooth' })
  })
})
