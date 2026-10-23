import { describe, expect, it } from 'vitest'
import { weightToKg } from '../../src/lib/weight.js'

describe('weightToKg', () => {
  it.each([
    ['1 kg', 1],
    ['500 g', 0.5],
    ['1.5 kg', 1.5],
    ['350 grams', 0.35],
    ['1 piece (~1.5 kg)', 1.5],
    ['piece', 0],
    ['', 0],
    [null, 0]
  ])('converts %s to %s kilograms', (weight, expected) => {
    expect(weightToKg(weight)).toBe(expected)
  })
})
