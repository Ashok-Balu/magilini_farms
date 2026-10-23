import test from 'node:test'
import assert from 'node:assert/strict'
import { weightToKg } from '../../src/utils/weight.js'

test('converts supported product weight labels to kilograms', () => {
  assert.equal(weightToKg('1 kg (3-4 pcs)'), 1)
  assert.equal(weightToKg('500 g (3-4 pcs)'), 0.5)
  assert.equal(weightToKg('1 piece (~1.5 kg)'), 1.5)
  assert.equal(weightToKg('1 piece (~350g)'), 0.35)
  assert.equal(weightToKg('3 pieces (~1 kg)'), 1)
  assert.equal(weightToKg('250 g (4-5 pcs)'), 0.25)
  assert.equal(weightToKg('250 g'), 0.25)
  assert.equal(weightToKg('250 kg'), 250)
  assert.equal(weightToKg('piece'), 0)
})

test('rejects ambiguous or malformed weight labels instead of parsing a partial match', () => {
  for (const weight of ['250 g of fruit', '250 kg-ish', '250 g 1 kg', '0 g', '250 g [x]']) {
    assert.equal(weightToKg(weight), 0)
  }
})