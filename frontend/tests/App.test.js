import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App.vue'
import { useCartStore, useToastStore } from '../src/stores/index.js'

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('loads persisted cart on mount and renders global toast messages', () => {
    localStorage.setItem('nm_cart', JSON.stringify([
      { productId: 'p1', variantId: 'v1', qty: 1, variant: { weight: '3 kg', price: 100 } }
    ]))
    const pinia = createPinia()
    setActivePinia(pinia)
    const toastStore = useToastStore(pinia)
    toastStore.success('Saved successfully')

    const wrapper = mount(App, {
      global: {
        plugins: [pinia],
        stubs: { RouterView: true, Teleport: true, TransitionGroup: true }
      }
    })

    expect(useCartStore(pinia).count).toBe(1)
    expect(wrapper.text()).toContain('Saved successfully')
  })
})
