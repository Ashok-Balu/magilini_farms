import test from 'node:test'
import assert from 'node:assert/strict'
import Product from '../../src/models/Product.js'

test('stock status handles products with missing variants', () => {
  const product = Product.hydrate({ variants: null })

  assert.equal((product as unknown as { stockStatus: string }).stockStatus, 'out-of-stock')
  assert.equal(Product.hydrate({ variants: [] }).get('stockStatus'), 'out-of-stock')
})

test('stock status is out-of-stock when variants have no stock', () => {
  const product = Product.hydrate({
    variants: [{ weight: '1 kg', price: 100, mrp: 120, stock: 0 }]
  })

  assert.equal(product.get('stockStatus'), 'out-of-stock')
})

test('stock status is low-stock when any variant has ten or fewer units', () => {
  const product = Product.hydrate({
    variants: [
      { weight: '1 kg', price: 100, mrp: 120, stock: 11 },
      { weight: '2 kg', price: 180, mrp: 200, stock: 10 }
    ]
  })

  assert.equal(product.get('stockStatus'), 'low-stock')
})

test('stock status is in-stock when every variant has more than ten units', () => {
  const product = Product.hydrate({
    variants: [
      { weight: '1 kg', price: 100, mrp: 120, stock: 11 },
      { weight: '2 kg', price: 180, mrp: 200, stock: 25 }
    ]
  })

  assert.equal(product.get('stockStatus'), 'in-stock')
})