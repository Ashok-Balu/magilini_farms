import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeInventoryItems } from '../../src/services/inventoryService.js'

test('merges repeated product variants into one stock reservation', () => {
  const items = mergeInventoryItems([
    { productId: 'p1', variantId: 'v1', name: 'Mango', price: 100, qty: 2 },
    { productId: 'p1', variantId: 'v1', name: 'Mango', price: 100, qty: 3 }
  ])

  assert.equal(items.length, 1)
  assert.equal(items[0].qty, 5)
})

test('rejects duplicate cart lines with inconsistent server prices', () => {
  assert.throws(() => mergeInventoryItems([
    { productId: 'p1', variantId: 'v1', name: 'Mango', price: 100, qty: 1 },
    { productId: 'p1', variantId: 'v1', name: 'Mango', price: 110, qty: 1 }
  ]), (err: any) => {
    assert.equal(err.statusCode, 409)
    assert.equal(err.message, 'A product price changed while preparing the order. Please refresh your cart.')
    return true
  })
})