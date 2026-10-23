import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppFooter from '../../../src/components/layout/AppFooter.vue'

describe('AppFooter', () => {
  it('renders contact details, business hours, and policy navigation', () => {
    const wrapper = mount(AppFooter, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('Business Hours')
    expect(wrapper.text()).toContain('Sunday: Closed')
    expect(wrapper.find('a[href="/terms"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/privacy"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/returns"]').exists()).toBe(true)
  })
})
