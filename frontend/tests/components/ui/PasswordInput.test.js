import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PasswordInput from '../../../src/components/ui/PasswordInput.vue'

describe('PasswordInput', () => {
  it('masks the value by default and preserves forwarded input attributes', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'secret' },
      attrs: { autocomplete: 'current-password', name: 'password' }
    })

    expect(wrapper.get('input').attributes('type')).toBe('password')
    expect(wrapper.get('input').element.value).toBe('secret')
    expect(wrapper.get('input').attributes('autocomplete')).toBe('current-password')
    expect(wrapper.get('input').attributes('name')).toBe('password')
  })

  it('toggles visibility and emits model updates', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Hide password')

    await wrapper.get('input').setValue('new-password')
    expect(wrapper.emitted('update:modelValue')).toEqual([['new-password']])

    await wrapper.get('button').trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('password')
  })
})
