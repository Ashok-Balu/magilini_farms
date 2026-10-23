import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addItem: vi.fn(),
  success: vi.fn(),
  push: vi.fn(),
  post: vi.fn()
}))

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useRouter: () => ({ push: mocks.push }) }
})
vi.mock('@/stores/index.js', () => ({
  useCartStore: () => ({ addItem: mocks.addItem }),
  useToastStore: () => ({ success: mocks.success })
}))
vi.mock('@/lib/api.js', () => ({ default: { post: mocks.post } }))

import ProductCard from '../../../src/components/shop/ProductCard.vue'

const mountCard = (options) => mount(ProductCard, {
  ...options,
  global: { stubs: { RouterLink: true, Teleport: true }, ...options.global }
})

const availableProduct = {
  _id: 'product-1',
  name: 'Mango',
  slug: 'mango',
  seasonalStatus: 'available',
  variants: [{ _id: 'variant-1', weight: '1 kg', price: 200, mrp: 250, stock: 4 }],
  tags: ['Fresh'],
  category: { emoji: '🥭' }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ProductCard', () => {
  it('shows pricing, discount, and adds the cheapest variant to the cart', async () => {
    const wrapper = mountCard({ props: { product: availableProduct } })

    expect(wrapper.text()).toContain('20% OFF')
    expect(wrapper.text()).toContain('₹200')
    await wrapper.get('button').trigger('click')
    expect(mocks.addItem).toHaveBeenCalledWith(availableProduct, availableProduct.variants[0], 1)
    expect(mocks.success).toHaveBeenCalledWith('Mango added to cart!')
  })

  it('shows out-of-stock state and allows notify subscription', async () => {
    const product = {
      ...availableProduct,
      seasonalStatus: 'off-season',
      variants: [{ ...availableProduct.variants[0], stock: 0 }]
    }
    const wrapper = mountCard({ props: { product } })

    await wrapper.get('button').trigger('click')
    await wrapper.get('input[type="tel"]').setValue('123')
    await wrapper.findAll('button').at(-1).trigger('click')
    expect(wrapper.text()).toContain('valid 10-digit phone')
    expect(mocks.post).not.toHaveBeenCalled()

    mocks.post.mockResolvedValueOnce({})
    await wrapper.get('input[type="tel"]').setValue('9876543210')
    await wrapper.findAll('button').at(-1).trigger('click')
    await wrapper.vm.$nextTick()
    expect(mocks.post).toHaveBeenCalledWith('/notify-me', { phone: '9876543210', productId: 'product-1' })
    expect(wrapper.text()).toContain("You'll be notified when available!")
    wrapper.unmount()
  })

  it('navigates to the product when the card body is clicked', async () => {
    const wrapper = mountCard({ props: { product: availableProduct } })
    await wrapper.get('.product-card').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith('/product/mango')
  })
})
