import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { api } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}))

vi.mock('@/lib/api.js', () => ({ default: api }))

const {
  useAuthStore,
  useCartStore,
  useToastStore,
  useProductStore,
  usePincodeStore
} = await import('../../src/stores/index.js')

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  vi.clearAllMocks()
})

describe('auth store', () => {
  it('sets user and clears loading on successful login', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { user: { role: 'customer' } } } })
    const auth = useAuthStore()

    await expect(auth.login('customer@example.com', 'secret')).resolves.toMatchObject({ success: true })
    expect(auth.user).toEqual({ role: 'customer' })
    expect(auth.loading).toBe(false)
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.isCustomer).toBe(true)
    expect(auth.isAdmin).toBe(false)
  })

  it('reports API errors and always clears loading', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Blocked' } } })
    const auth = useAuthStore()

    await expect(auth.login('customer@example.com', 'bad')).resolves.toEqual({ success: false, message: 'Blocked' })
    expect(auth.loading).toBe(false)
    expect(auth.user).toBeNull()
  })

  it('fetches current user and resets the user on failure', async () => {
    api.get.mockResolvedValueOnce({ data: { user: { role: 'admin' } } })
    const auth = useAuthStore()
    await auth.fetchMe()
    expect(auth.isAdmin).toBe(true)

    api.get.mockRejectedValueOnce(new Error('Unauthorized'))
    await auth.fetchMe()
    expect(auth.user).toBeNull()
  })

  it('clears local auth state on logout even when the server fails', async () => {
    api.post.mockRejectedValueOnce(new Error('Network unavailable'))
    const auth = useAuthStore()
    auth.user = { role: 'customer' }

    await auth.logout()
    expect(auth.user).toBeNull()
    expect(api.post).toHaveBeenCalledWith('/auth/logout')
  })
})

describe('cart store', () => {
  const product = { _id: 'p1', name: 'Mango', slug: 'mango', images: [] }
  const variant = { _id: 'v1', weight: '1 kg', price: 100, stock: 2 }

  it('adds items, caps quantity at stock, and calculates totals', () => {
    const cart = useCartStore()
    cart.addItem(product, variant, 5)
    cart.addItem(product, variant, 1)

    expect(cart.count).toBe(2)
    expect(cart.subtotal).toBe(200)
    expect(cart.totalKg).toBe(2)
    expect(cart.minMet).toBe(false)
    expect(cart.items[0].qty).toBe(2)
    expect(JSON.parse(localStorage.getItem('nm_cart'))[0].qty).toBe(2)
  })

  it('ignores out-of-stock items and removes quantities set to zero', () => {
    const cart = useCartStore()
    cart.addItem(product, { ...variant, stock: 0 })
    expect(cart.items).toHaveLength(0)

    cart.addItem(product, variant)
    cart.updateQty('p1', 'v1', 0)
    expect(cart.items).toHaveLength(0)
    expect(cart.count).toBe(0)
  })

  it('restores persisted cart data and clears storage', () => {
    const cart = useCartStore()
    cart.addItem(product, { ...variant, weight: '3 kg' })
    expect(cart.minMet).toBe(true)

    const restored = useCartStore()
    restored.loadCart()
    expect(restored.count).toBe(1)
    expect(restored.cartForCheckout).toEqual([{ productId: 'p1', variantId: 'v1', qty: 1 }])

    restored.clear()
    expect(localStorage.getItem('nm_cart')).toBeNull()
  })

  it('recovers from corrupt persisted cart data', () => {
    localStorage.setItem('nm_cart', '{invalid')
    const cart = useCartStore()
    cart.loadCart()
    expect(cart.items).toEqual([])
  })

  it('reconciles persisted lines against current availability and stock', async () => {
    localStorage.setItem('nm_cart', JSON.stringify([
      { productId: 'p1', variantId: 'v1', product: { ...product }, variant: { ...variant, stock: 8 }, qty: 5 },
      { productId: 'p2', variantId: 'v2', product: { ...product, _id: 'p2', slug: 'gone' }, variant: { ...variant, _id: 'v2' }, qty: 1 }
    ]))
    api.get.mockImplementation(async (url) => {
      if (url === '/products/mango') return { data: { product: { ...product, seasonalStatus: 'available', variants: [{ ...variant, stock: 2, price: 125 }] } } }
      return Promise.reject({ response: { status: 404 } })
    })
    const cart = useCartStore()
    cart.loadCart()

    await expect(cart.reconcile()).resolves.toMatchObject({ changed: true, removed: 1 })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]).toMatchObject({ qty: 2, variant: { stock: 2, price: 125 } })
  })

  it('loads the server-configured minimum order threshold', async () => {
    api.get.mockResolvedValueOnce({ data: { settings: { minimumOrderKg: 5, freeDeliveryMin: 1000 } } })
    const cart = useCartStore()
    await expect(cart.loadSettings()).resolves.toBe(5)
    expect(cart.minimumOrderKg).toBe(5)
    expect(cart.freeDeliveryMin).toBe(1000)
    expect(cart.minMet).toBe(false)
  })
})

describe('toast store', () => {
  it('records success, error, and informational messages', () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(() => 1)
    const toast = useToastStore()
    toast.success('Saved')
    toast.error('Failed')
    toast.info('Loading')

    expect(toast.toasts.map(({ message, type }) => [message, type])).toEqual([
      ['Saved', 'success'],
      ['Failed', 'error'],
      ['Loading', 'info']
    ])
    expect(setTimeout).toHaveBeenCalledTimes(3)
  })
})

describe('product store', () => {
  it('loads products, tracks totals, and clears loading after a failed request', async () => {
    api.get.mockResolvedValueOnce({ data: { products: [{ _id: 'p1' }], total: 1 } })
    const products = useProductStore()
    await products.fetchProducts({ page: 2 })
    expect(products.products).toEqual([{ _id: 'p1' }])
    expect(products.total).toBe(1)
    expect(products.loading).toBe(false)

    api.get.mockRejectedValueOnce(new Error('Unavailable'))
    await expect(products.fetchProducts()).rejects.toThrow('Unavailable')
    expect(products.loading).toBe(false)
  })

  it('caches categories and fetches individual and featured products', async () => {
    api.get.mockResolvedValueOnce({ data: { categories: [{ _id: 'c1' }] } })
    const products = useProductStore()
    await expect(products.fetchCategories()).resolves.toEqual([{ _id: 'c1' }])
    await expect(products.fetchCategories()).resolves.toEqual([{ _id: 'c1' }])
    expect(api.get).toHaveBeenCalledTimes(1)

    api.get.mockResolvedValueOnce({ data: { product: { slug: 'mango' } } })
    await expect(products.fetchProduct('mango')).resolves.toEqual({ slug: 'mango' })
    api.get.mockResolvedValueOnce({ data: { products: [{ slug: 'featured' }] } })
    await expect(products.fetchFeatured()).resolves.toEqual([{ slug: 'featured' }])
  })
})

describe('pincode store', () => {
  it('skips malformed pincodes and persists a valid delivery result', async () => {
    const pincode = usePincodeStore()
    await expect(pincode.check('123')).resolves.toBeNull()
    expect(api.get).not.toHaveBeenCalled()

    api.get.mockResolvedValueOnce({ data: { serviceable: true, deliveryFee: 80 } })
    await expect(pincode.check('600001')).resolves.toEqual({ serviceable: true, deliveryFee: 80 })
    expect(localStorage.getItem('nm_pincode')).toBe('600001')
    expect(pincode.loading).toBe(false)
  })

  it('preserves lookup failures separately from a confirmed unserviceable PIN', async () => {
    const pincode = usePincodeStore()
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Postal service timed out.' } } })
    await expect(pincode.check('600001')).resolves.toEqual({
      serviceable: false,
      lookupError: true,
      message: 'Postal service timed out.'
    })
    expect(pincode.result.lookupError).toBe(true)

    pincode.clear()
    expect(pincode.pincode).toBe('')
    expect(pincode.result).toBeNull()
    expect(localStorage.getItem('nm_pincode')).toBeNull()
  })
})
