import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AboutView from '../../src/views/AboutView.vue'
import FaqView from '../../src/views/FaqView.vue'
import NotFoundView from '../../src/views/NotFoundView.vue'
import PrivacyView from '../../src/views/PrivacyView.vue'
import ReturnsView from '../../src/views/ReturnsView.vue'
import TermsView from '../../src/views/TermsView.vue'

const mountPage = (component) => mount(component, {
  global: {
    stubs: {
      AppNavbar: true,
      AppFooter: true,
      RouterLink: {
        props: ['to'],
        template: '<a :href="to"><slot /></a>'
      }
    }
  }
})

describe('static customer route views', () => {
  it('renders the farm story and its key public facts', () => {
    const wrapper = mountPage(AboutView)

    expect(wrapper.get('h1').text()).toContain('From Our Trees')
    expect(wrapper.text()).toContain('Mango Trees')
    expect(wrapper.text()).toContain('Zero Chemicals')
  })

  it('opens and closes an FAQ answer when its question is toggled', async () => {
    const wrapper = mountPage(FaqView)
    const firstQuestion = wrapper.get('button')

    expect(wrapper.text()).not.toContain('We never use calcium carbide')
    await firstQuestion.trigger('click')
    expect(wrapper.text()).toContain('We never use calcium carbide')
    expect(firstQuestion.text()).toContain('−')

    await firstQuestion.trigger('click')
    expect(wrapper.text()).not.toContain('We never use calcium carbide')
    expect(firstQuestion.text()).toContain('+')
  })

  it('renders policy content and exposes the complaint route for damaged goods', () => {
    const wrapper = mountPage(ReturnsView)

    expect(wrapper.get('h1').text()).toBe('Return Policy')
    expect(wrapper.text()).toContain('No Returns or Replacements')
    expect(wrapper.find('a[href="/complaint"]').exists()).toBe(true)
  })

  it('renders the privacy and terms headings and meaningful policy sections', () => {
    const privacy = mountPage(PrivacyView)
    const terms = mountPage(TermsView)

    expect(privacy.get('h1').text()).toBe('Privacy Policy')
    expect(privacy.text()).toContain('Information We Collect')
    expect(terms.get('h1').text()).toBe('Terms & Conditions')
    expect(terms.text()).toContain('Minimum Order')
  })

  it('offers store navigation from the not-found page', () => {
    const wrapper = mountPage(NotFoundView)

    expect(wrapper.get('h1').text()).toBe('Page Not Found')
    expect(wrapper.find('a[href="/"]').text()).toBe('Go Home')
    expect(wrapper.find('a[href="/shop"]').text()).toBe('Shop Now')
  })
})
