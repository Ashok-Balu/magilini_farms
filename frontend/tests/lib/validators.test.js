import { describe, expect, it } from 'vitest'
import {
  isEmail,
  isPhone10,
  isPositiveNumber,
  isPincode6,
  isRequired,
  minLen,
  runValidation
} from '../../src/lib/validators.js'

describe('validators', () => {
it('required validation rejects empty, whitespace, and null values', () => {
  expect(isRequired('value')).toBe(true)
  expect(isRequired('   ')).toBe(false)
  expect(isRequired(null)).toBe(false)
})

it('email validation trims whitespace and rejects malformed values', () => {
  expect(isEmail(' user@example.com ')).toBe(true)
  expect(isEmail('user@localhost')).toBe(false)
  expect(isEmail('')).toBe(false)
})

it('phone validation accepts ten digits despite formatting separators', () => {
  expect(isPhone10('9876543210')).toBe(true)
  expect(isPhone10('+91 98765-43210')).toBe(false)
  expect(isPhone10('987654321')).toBe(false)
  expect(isPhone10('abcdefghij')).toBe(false)
})

it('pincode validation trims surrounding whitespace and requires six digits', () => {
  expect(isPincode6('600001')).toBe(true)
  expect(isPincode6(' 600001 ')).toBe(true)
  expect(isPincode6('60001')).toBe(false)
  expect(isPincode6('60A001')).toBe(false)
})

it('minimum length validation handles boundary and null inputs', () => {
  expect(minLen('12345678', 8)).toBe(true)
  expect(minLen('1234567', 8)).toBe(false)
  expect(minLen(null, 1)).toBe(false)
})

it('positive number validation rejects zero, negatives, and non-numeric values', () => {
  expect(isPositiveNumber(0.01)).toBe(true)
  expect(isPositiveNumber('10')).toBe(true)
  expect(isPositiveNumber(0)).toBe(false)
  expect(isPositiveNumber(-1)).toBe(false)
  expect(isPositiveNumber('not-a-number')).toBe(false)
})

it('runValidation reports only the first failing rule for each field', () => {
  const errors = runValidation(
    { email: 'invalid', name: ' ' },
    {
      email: [[isEmail, 'Email is invalid'], [isRequired, 'Email is required']],
      name: [[isRequired, 'Name is required']],
      optional: [[isRequired, 'Optional is required']]
    }
  )

  expect(errors).toEqual({
    email: 'Email is invalid',
    name: 'Name is required',
    optional: 'Optional is required'
  })
})

it('runValidation returns an empty object when every field passes', () => {
  expect(runValidation({ email: 'user@example.com' }, { email: [[isEmail, 'Invalid email']] })).toEqual({})
})
})
