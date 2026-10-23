import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BulkEnquiriesView from '../../../src/views/admin/BulkEnquiriesView.vue'
import AuditLogsView from '../../../src/views/admin/AuditLogsView.vue'
import CategoriesView from '../../../src/views/admin/CategoriesView.vue'
import ComplaintsView from '../../../src/views/admin/ComplaintsView.vue'
import CouponsView from '../../../src/views/admin/CouponsView.vue'
import CustomersView from '../../../src/views/admin/CustomersView.vue'
import DashboardView from '../../../src/views/admin/DashboardView.vue'
import OrderDetailView from '../../../src/views/admin/OrderDetailView.vue'
import OrdersView from '../../../src/views/admin/OrdersView.vue'
import NotificationsView from '../../../src/views/admin/NotificationsView.vue'
import PincodesView from '../../../src/views/admin/PincodesView.vue'
import ProductFormView from '../../../src/views/admin/ProductFormView.vue'
import ProductsView from '../../../src/views/admin/ProductsView.vue'
import ReviewsView from '../../../src/views/admin/ReviewsView.vue'
import StockLogsView from '../../../src/views/admin/StockLogsView.vue'

const { api, toast, router, route, auth } = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  },
  toast: { error: vi.fn(), success: vi.fn() },
  router: { push: vi.fn(), replace: vi.fn() },
  route: { params: { id: 'order-1' }, query: {} },
  auth: { user: { name: 'Admin User' } }
}))

vi.mock('@/lib/api.js', () => ({ default: api }))
vi.mock('@/stores/index.js', () => ({
  useToastStore: () => toast,
  useAuthStore: () => auth
}))
vi.mock('vue-router', () => ({
  useRouter: () => router,
  useRoute: () => route
}))

const mountView = (component) => mount(component, {
  global: {
    stubs: {
      RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
    }
  }
})

const order = {
  _id: 'order-1',
  orderNumber: 'NM-000101',
  status: 'New',
  customer: { name: 'Jamie Customer', phone: '9876543210' },
  items: [{ name: 'Alphonso Mango', weight: '1 kg', qty: 2, subtotal: 500 }],
  subtotal: 500,
  total: 580,
  deliveryFee: 80,
  deliveryType: 'home',
  deliveryAddress: { line1: 'Farm Road', city: 'Karur', pincode: '639001' },
  paymentMethod: 'razorpay-upi',
  paymentStatus: 'pending',
  statusHistory: []
}

beforeEach(() => {
  api.get.mockReset()
  api.get.mockResolvedValue({ data: {} })
  api.post.mockReset().mockResolvedValue({ data: {} })
  api.put.mockReset().mockResolvedValue({ data: {} })
  api.patch.mockReset().mockResolvedValue({ data: { order } })
  api.delete.mockReset().mockResolvedValue({ data: {} })
  toast.error.mockReset()
  toast.success.mockReset()
  router.push.mockReset()
  router.replace.mockReset()
  route.params = { id: 'order-1' }
  route.query = {}
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('admin management route views', () => {
  it('loads and filters persisted admin audit history', async () => {
    api.get.mockResolvedValue({ data: {
      total: 1,
      logs: [{
        _id: 'audit-1',
        action: 'coupon_created',
        actorId: { name: 'Admin User' },
        resourceId: 'coupon-1',
        details: { code: 'SAVE10' },
        createdAt: '2026-01-01T00:00:00.000Z'
      }]
    } })
    const wrapper = mountView(AuditLogsView)
    await flushPromises()
    expect(wrapper.text()).toContain('coupon_created')
    expect(wrapper.text()).toContain('Admin User')

    await wrapper.get('input').setValue('coupon_created')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Apply').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenLastCalledWith('/admin/audit-logs', {
      params: { page: 1, limit: 50, action: 'coupon_created' }
    })
  })

  it('loads failed notifications and retries a failed delivery', async () => {
    api.get.mockResolvedValue({ data: {
      total: 1,
      deliveries: [{
        _id: '507f1f77bcf86cd799439011',
        recipient: '9876543210',
        templateName: 'order_received',
        status: 'failed',
        attempts: 1,
        lastError: 'WhatsApp provider request failed.',
        createdAt: '2026-01-01T00:00:00.000Z'
      }]
    } })
    const wrapper = mountView(NotificationsView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/notifications', {
      params: { page: 1, limit: 50 }
    })
    expect(wrapper.text()).toContain('order_received')
    expect(wrapper.text()).toContain('WhatsApp provider request failed.')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Retry').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/notifications/507f1f77bcf86cd799439011/retry')
    expect(toast.success).toHaveBeenCalledWith('Notification delivered.')
  })

  it('shows provider retry failures instead of claiming delivery', async () => {
    api.get.mockResolvedValue({ data: {
      total: 1,
      deliveries: [{
        _id: '507f1f77bcf86cd799439011',
        recipient: '9876543210',
        templateName: 'order_received',
        status: 'failed',
        attempts: 1,
        createdAt: '2026-01-01T00:00:00.000Z'
      }]
    } })
    api.post.mockRejectedValue({ response: { data: { message: 'Notification delivery failed.' } } })
    const wrapper = mountView(NotificationsView)
    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Retry').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Notification delivery failed.')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('renders bulk enquiries and persists a changed enquiry status', async () => {
    api.get.mockResolvedValue({ data: { enquiries: [{
      _id: 'bulk-1', name: 'Morgan Lee', phone: '9876543210', variety: 'Alphonso', quantity: '25 kg', city: 'Karur', status: 'New', createdAt: '2026-01-01'
    }] } })
    const wrapper = mountView(BulkEnquiriesView)
    await flushPromises()

    expect(wrapper.text()).toContain('Morgan Lee')
    const status = wrapper.get('select')
    await status.setValue('Contacted')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/admin/bulk-enquiries/bulk-1', { status: 'Contacted' })
    expect(toast.success).toHaveBeenCalledWith('Enquiry status updated.')
  })

  it('surfaces a failed bulk-enquiry status update without claiming success', async () => {
    api.get.mockResolvedValue({ data: { enquiries: [{
      _id: 'bulk-1', name: 'Morgan Lee', phone: '9876543210', variety: 'Alphonso', quantity: '25 kg', city: 'Karur', status: 'New', createdAt: '2026-01-01'
    }] } })
    api.patch.mockRejectedValue({ response: { data: { message: 'Could not update enquiry.' } } })
    const wrapper = mountView(BulkEnquiriesView)
    await flushPromises()

    await wrapper.get('select').setValue('Contacted')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/admin/bulk-enquiries/bulk-1', { status: 'Contacted' })
    expect(toast.error).toHaveBeenCalledWith('Could not update enquiry.')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('validates required category fields before creating a category', async () => {
    api.get.mockResolvedValue({ data: { categories: [] } })
    const wrapper = mountView(CategoriesView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Create').trigger('click')

    expect(wrapper.text()).toContain('Category name is required.')
    expect(wrapper.text()).toContain('Slug is required.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('keeps the category form open and reports duplicate-name API errors', async () => {
    api.get.mockResolvedValue({ data: { categories: [] } })
    api.post.mockRejectedValue({ response: { data: { message: 'Category slug already exists.' } } })
    const wrapper = mountView(CategoriesView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.find('input[placeholder="Mangoes"]').setValue('Mangoes')
    await wrapper.find('input[placeholder="mangoes"]').setValue('mangoes')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Create').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/categories', expect.objectContaining({
      name: 'Mangoes',
      slug: 'mangoes'
    }))
    expect(toast.error).toHaveBeenCalledWith('Category slug already exists.')
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('New Category')
  })

  it('loads complaint details and saves a selected resolution status', async () => {
    api.get.mockResolvedValue({ data: { complaints: [{
      _id: 'complaint-3', complaintNumber: 'CMP-0003', orderId: { orderNumber: 'NM-000101' }, phone: '9876543210', description: 'Damaged fruit', status: 'New', createdAt: '2026-01-01', photos: [{ url: '/photo.jpg' }]
    }] } })
    const wrapper = mountView(ComplaintsView)
    await flushPromises()

    expect(wrapper.text()).toContain('CMP-0003')
    expect(wrapper.text()).toContain('Damaged fruit')
    await wrapper.get('select').setValue('Reviewing')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/admin/complaints/complaint-3', { status: 'Reviewing' })
    expect(wrapper.find('a[href="/photo.jpg"]').exists()).toBe(true)
  })

  it('rejects invalid coupon values and leaves the create request untouched', async () => {
    api.get.mockResolvedValue({ data: { coupons: [] } })
    const wrapper = mountView(CouponsView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Create').trigger('click')

    expect(wrapper.text()).toContain('Coupon code is required.')
    expect(wrapper.text()).toContain('Enter a value greater than zero.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('surfaces coupon save failures without clearing the submitted form', async () => {
    api.get.mockResolvedValue({ data: { coupons: [] } })
    api.post.mockRejectedValue({ response: { data: { message: 'Coupon code already exists.' } } })
    const wrapper = mountView(CouponsView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.find('input[placeholder="WELCOME20"]').setValue('SAVE15')
    await wrapper.find('input[placeholder="20"]').setValue('15')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Create').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/admin/coupons', expect.objectContaining({
      code: 'SAVE15',
      value: 15
    }))
    expect(toast.error).toHaveBeenCalledWith('Coupon code already exists.')
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.find('input[placeholder="WELCOME20"]').element.value).toBe('SAVE15')
  })

  it('shows customer status and sends the block action to the matching endpoint', async () => {
    api.get.mockResolvedValue({ data: { customers: [{
      _id: 'customer-1', name: 'Casey Customer', phone: '9876543210', email: 'casey@example.com', createdAt: '2026-01-01', isBlocked: false, ordersCount: 2, totalSpent: 900
    }], total: 1 } })
    const wrapper = mountView(CustomersView)
    await flushPromises()

    expect(wrapper.text()).toContain('Casey Customer')
    expect(wrapper.text()).toContain('Active')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(api.patch).toHaveBeenCalledWith('/admin/customers/customer-1/block', { isBlocked: true })
    expect(toast.success).toHaveBeenCalledWith('Customer blocked.')
  })

  it('renders dashboard summary metrics and recent order data from its dashboard response', async () => {
    api.get.mockResolvedValue({ data: {
      stats: { totalRevenue: 12345, totalOrders: 7, pendingOrders: 2, todayOrders: 1, todayRevenue: 900, totalCustomers: 5 },
      recentOrders: [order],
      lowStockProducts: []
    } })
    const wrapper = mountView(DashboardView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard')
    expect(wrapper.text()).toContain('12,345')
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.text()).toContain('Jamie Customer')
    wrapper.unmount()
  })

  it('loads an order and requires a reason before cancelling it', async () => {
    api.get.mockResolvedValue({ data: { order } })
    const wrapper = mountView(OrderDetailView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/orders/order-1')
    expect(wrapper.text()).toContain('Alphonso Mango')
    const status = wrapper.get('select')
    await status.setValue('Cancelled')
    await wrapper.get('button').trigger('click')

    expect(toast.error).toHaveBeenCalledWith('Cancellation reason is required.')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('initializes order filters from the route query and displays matching orders', async () => {
    route.query = { status: 'New', search: 'NM-000101' }
    api.get.mockResolvedValue({ data: { orders: [order], total: 1 } })
    const wrapper = mountView(OrdersView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/orders', expect.objectContaining({
      params: expect.objectContaining({ status: 'New', search: 'NM-000101' })
    }))
    expect(wrapper.text()).toContain('NM-000101')
    expect(wrapper.text()).toContain('Jamie Customer')
  })

  it('validates pincode length and city before issuing a create request', async () => {
    api.get.mockResolvedValue({ data: { pincodes: [] } })
    const wrapper = mountView(PincodesView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.findAll('button').find((button) => button.text().trim() === 'Add').trigger('click')

    expect(wrapper.text()).toContain('Pincode must be 6 digits.')
    expect(wrapper.text()).toContain('City is required.')
    expect(wrapper.text()).toContain('State is required.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('renders a new product form and blocks saving without required product details', async () => {
    api.get.mockResolvedValue({ data: { categories: [{ _id: 'cat-1', name: 'Mangoes', emoji: '🥭' }] } })
    const wrapper = mountView(ProductFormView)
    await flushPromises()
    expect(wrapper.text()).toContain('New Product')
    expect(wrapper.text()).toContain('Mangoes')

    await wrapper.findAll('button').at(-1).trigger('click')
    expect(wrapper.text()).toContain('Name, category, and description required.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('renders product inventory returned by the admin catalog endpoint', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/admin/categories') return { data: { categories: [{ _id: 'cat-1', slug: 'mangoes', name: 'Mangoes', emoji: '🥭' }] } }
      if (url === '/admin/products') return { data: { products: [{
        _id: 'product-1', name: 'Alphonso Mango', category: { name: 'Mangoes' }, variants: [{ _id: 'variant-1', weight: '1 kg', stock: 8 }]
      }], total: 1 } }
      return { data: {} }
    })
    const wrapper = mountView(ProductsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Alphonso Mango')
    expect(wrapper.text()).toContain('1 kg: 8')
  })

  it('loads products for review creation and enforces required review details', async () => {
    api.get.mockImplementation(async (url) => url === '/admin/products'
      ? { data: { products: [{ _id: 'product-1', name: 'Alphonso Mango' }] } }
      : { data: { reviews: [], total: 0 } })
    const wrapper = mountView(ReviewsView)
    await flushPromises()
    await wrapper.get('button').trigger('click')
    expect(wrapper.text()).toContain('Select product')
    expect(wrapper.text()).toContain('Alphonso Mango')

    await wrapper.findAll('button').find((button) => button.text().trim() === 'Create Review').trigger('click')
    await flushPromises()
    expect(toast.error).toHaveBeenCalledWith('Fill all required fields.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('displays stock change quantities from the stock log API', async () => {
    api.get.mockResolvedValue({ data: { logs: [{
      _id: 'log-1', productName: 'Alphonso Mango', variantWeight: '1 kg', changeType: 'order', quantityBefore: 12, quantityChange: -2, quantityAfter: 10, orderId: { orderNumber: 'NM-000101' }, createdAt: '2026-01-01'
    }] } })
    const wrapper = mountView(StockLogsView)
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/admin/stock-logs')
    expect(wrapper.text()).toContain('Alphonso Mango')
    expect(wrapper.text()).toContain('-2')
    expect(wrapper.text()).toContain('NM-000101')
  })
})
