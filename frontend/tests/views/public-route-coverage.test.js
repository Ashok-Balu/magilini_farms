import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AccountView from '../../src/views/AccountView.vue'
import BulkView from '../../src/views/BulkView.vue'
import CartView from '../../src/views/CartView.vue'
import CheckoutSuccessView from '../../src/views/CheckoutSuccessView.vue'
import CheckoutView from '../../src/views/CheckoutView.vue'
import ContactView from '../../src/views/ContactView.vue'
import HomeView from '../../src/views/HomeView.vue'
import OrderDetailView from '../../src/views/OrderDetailView.vue'
import ProductView from '../../src/views/ProductView.vue'
import ShopView from '../../src/views/ShopView.vue'

const { api, toast, router, route, auth, cart, products, pincode } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  route: { params: { id: 'order-1', slug: 'alphonso' }, query: {} },
  auth: { user: { name: 'Jamie Customer', email: 'jamie@example.com', phone: '9876543210', addresses: [] }, logout: vi.fn() },
  cart: { loadSettings: vi.fn().mockResolvedValue(3), freeDeliveryMin: 0 },
  products: { fetchCategories: vi.fn(), fetchFeatured: vi.fn(), fetchProduct: vi.fn() },
  pincode: { pincode: '', result: null, check: vi.fn() }
}))

vi.mock('@/lib/api.js', () => ({ default: api }))
vi.mock('@/stores/index.js', () => ({
  useAuthStore: () => auth,
  useCartStore: () => cart,
  useToastStore: () => toast,
  useProductStore: () => products,
  usePincodeStore: () => pincode
}))
vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => route
}))

const mountView = (component) => mount(component, {
  global: {
    stubs: {
      AppNavbar: true,
      AppFooter: true,
      DirectUpiPayment: true,
      ProductCard: {
        props: ['product'],
        template: '<div class="product-card">{{ product.name }}</div>'
      },
      RouterLink: {
        props: ['to'],
        template: '<a :href="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>'
      }
    }
  }
})

const product = {
  _id: 'product-1',
  name: 'Alphonso Mango',
  slug: 'alphonso',
  seasonalStatus: 'available',
  description: 'Naturally ripened mangoes',
  category: { _id: 'category-1', name: 'Mangoes', slug: 'mangoes' },
  images: [{ url: '/alphonso.jpg' }],
  variants: [{ _id: 'variant-1', weight: '1 kg', price: 250, mrp: 300, stock: 12 }]
}

const customerOrder = {
  _id: 'order-1',
  orderNumber: 'NM-000101',
  status: 'New',
  customer: { name: 'Jamie Customer', phone: '9876543210' },
  items: [{ name: 'Alphonso Mango', weight: '1 kg', qty: 2, subtotal: 500 }],
  subtotal: 500,
  total: 580,
  deliveryFee: 80,
  deliveryType: 'home',
  paymentMethod: 'razorpay-upi',
  paymentStatus: 'pending',
  createdAt: '2026-01-01T00:00:00.000Z',
  statusHistory: []
}

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: {} })
  api.post.mockReset().mockResolvedValue({ data: {} })
  api.patch.mockReset().mockResolvedValue({ data: {} })
  api.put.mockReset().mockResolvedValue({ data: {} })
  api.delete.mockReset().mockResolvedValue({ data: {} })
  toast.error.mockReset()
  toast.success.mockReset()
  toast.info.mockReset()
  router.push.mockReset()
  router.replace.mockReset()
  route.params = { id: 'order-1', slug: 'alphonso' }
  route.query = {}
  auth.user = { name: 'Jamie Customer', email: 'jamie@example.com', phone: '9876543210', addresses: [] }
  auth.logout.mockReset()
  cart.items = []
  cart.count = 0
  cart.totalKg = 0
  cart.minMet = false
  cart.subtotal = 0
  cart.freeDeliveryMin = 0
  cart.loadSettings.mockReset().mockResolvedValue(3)
  cart.cartForCheckout = []
  cart.addItem = vi.fn()
  cart.removeItem = vi.fn()
  cart.updateQty = vi.fn()
  cart.clear = vi.fn()
  products.fetchCategories.mockReset().mockResolvedValue([{ _id: 'category-1', name: 'Mangoes', slug: 'mangoes', emoji: '🥭' }])
  products.fetchFeatured.mockReset().mockResolvedValue([product])
  products.fetchProduct.mockReset().mockResolvedValue(product)
  pincode.pincode = ''
  pincode.result = null
  pincode.check.mockReset().mockResolvedValue({ serviceable: true, city: 'Karur', deliveryFee: 80, estimatedDays: '1-2 days' })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('public customer route views', () => {
  it('loads the account order list and renders the returned order summary', async () => {
    api.get.mockImplementation(async (url) => url === '/orders/my'
      ? { data: { orders: [customerOrder] } }
      : { data: { addresses: [] } })
    const wrapper = mountView(AccountView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/orders/my')
    expect(api.get).toHaveBeenCalledWith('/customer/addresses')
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.text()).toContain('Alphonso Mango')
  })

  it('validates bulk enquiry fields and sends a valid enquiry to the mocked API', async () => {
    const wrapper = mountView(BulkView)
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Name is required.')
    expect(wrapper.text()).toContain('Enter a valid 10-digit phone number.')
    expect(api.post).not.toHaveBeenCalled()

    await wrapper.find('input[placeholder="Your full name"]').setValue('Jordan Lee')
    await wrapper.find('input[placeholder="9876543210"]').setValue('9876543210')
    await wrapper.get('select').setValue('Alphonso')
    await wrapper.find('input[placeholder="e.g. 50"]').setValue('20')
    await wrapper.find('input[placeholder="Chennai"]').setValue('Karur')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/bulk-enquiry', expect.objectContaining({
      name: 'Jordan Lee',
      phone: '9876543210',
      variety: 'Alphonso',
      quantity: '20',
      city: 'Karur'
    }))
    expect(wrapper.text()).toContain('Enquiry Submitted!')
  })

  it('shows the empty-cart state with a link back to shopping', () => {
    const wrapper = mountView(CartView)

    expect(wrapper.text()).toContain('Your cart is empty')
    expect(wrapper.find('a[href="/shop"]').exists()).toBe(true)
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows checkout confirmation, order number, and account navigation from the route query', async () => {
    route.query = { order: 'NM-000101' }
    const wrapper = mountView(CheckoutSuccessView)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Order Placed!')
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.find('a[href="/account"]').exists()).toBe(true)
    expect(api.get).not.toHaveBeenCalled()
  })

  it('shows the checkout empty-cart state without making order requests', async () => {
    const wrapper = mountView(CheckoutView)
    await flushPromises()

    expect(wrapper.text()).toContain('Checkout')
    expect(wrapper.text()).toContain('Your cart is empty')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('validates customer contact information and opens the WhatsApp contact action on success', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    const wrapper = mountView(ContactView)

    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Name is required.')
    expect(wrapper.text()).toContain('Message is required.')

    await wrapper.find('input[placeholder="Your full name"]').setValue('Taylor User')
    await wrapper.find('input[placeholder="9876543210"]').setValue('9876543210')
    await wrapper.find('textarea[placeholder="Tell us how we can help you..."]').setValue('Question about an order')
    await wrapper.get('form').trigger('submit')

    expect(open).toHaveBeenCalledWith(expect.stringContaining('wa.me/919943996614'), '_blank')
    expect(wrapper.text()).toContain('Message Sent!')
  })

  it('renders the homepage hero and featured products using mocked store data', async () => {
    api.get.mockResolvedValue({ data: { products: [product] } })
    const wrapper = mountView(HomeView)
    await flushPromises()

    expect(wrapper.get('h1').text()).toContain('Pure Farm Fresh')
    expect(products.fetchCategories).toHaveBeenCalled()
    expect(products.fetchFeatured).toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledWith('/products/top-selling', { params: { limit: 8 } })
    expect(wrapper.text()).toContain('Alphonso Mango')
    wrapper.unmount()
  })

  it('loads a customer order detail and exposes the pending-payment action', async () => {
    api.get.mockResolvedValue({ data: { order: customerOrder } })
    const wrapper = mountView(OrderDetailView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/orders/order-1')
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.text()).toContain('Payment pending')
    expect(wrapper.findAll('button').some((button) => button.text().includes('Retry Payment'))).toBe(true)
  })

  it('loads product details and adds the selected in-stock variant to the cart', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/products') return { data: { products: [] } }
      if (url === '/products/alphonso/reviews') return { data: { reviews: [], stats: { avg: 0, count: 0 } } }
      return { data: {} }
    })
    const wrapper = mountView(ProductView)
    await flushPromises()

    expect(products.fetchProduct).toHaveBeenCalledWith('alphonso')
    expect(wrapper.text()).toContain('Alphonso Mango')
    const addButton = wrapper.findAll('button').find((button) => button.text().includes('Add to Cart'))
    expect(addButton).toBeTruthy()
    await addButton.trigger('click')

    expect(cart.addItem).toHaveBeenCalledWith(product, product.variants[0], 1)
    expect(toast.success).toHaveBeenCalledWith('Alphonso Mango added to cart!')
  })

  it('loads shop categories and product results, then updates filters in the route query', async () => {
    api.get.mockImplementation(async (url, options) => {
      if (url === '/products' && options?.params?.sort === 'price_asc') {
        return { data: { products: [{ variants: [{ price: 100 }] }] } }
      }
      if (url === '/products' && options?.params?.sort === 'price_desc') {
        return { data: { products: [{ variants: [{ price: 900 }] }] } }
      }
      return { data: { products: [product], total: 1 } }
    })
    const wrapper = mountView(ShopView)
    await flushPromises()

    expect(products.fetchCategories).toHaveBeenCalled()
    expect(api.get).toHaveBeenCalledWith('/products', expect.objectContaining({
      params: expect.objectContaining({ limit: expect.any(Number), page: 1 })
    }))
    expect(wrapper.text()).toContain('Alphonso Mango')
    await wrapper.findAll('button').find((button) => button.text().includes('Mangoes')).trigger('click')
    await flushPromises()

    expect(router.replace).toHaveBeenCalledWith({ query: expect.objectContaining({ category: 'mangoes' }) })
  })

  it('requires confirmation before using a reverse-geocoded PIN on the homepage', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 11, longitude: 78 } }))
      }
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: { postcode: '639001', city: 'Karur' } })
    }))
    const wrapper = mountView(HomeView)
    await flushPromises()

    await wrapper.findAll('button').find(button => button.text().includes('Auto-detect')).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Detected PIN 639001')
    expect(pincode.check).not.toHaveBeenCalled()

    await wrapper.findAll('button').find(button => button.text().includes('Use this PIN')).trigger('click')
    await flushPromises()
    expect(pincode.check).toHaveBeenCalledWith('639001')
    wrapper.unmount()
  })
})
