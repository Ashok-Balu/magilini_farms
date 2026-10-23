import Product from '../models/Product.js'
import { StockLog } from '../models/index.js'
import { conflict } from '../utils/httpError.js'

export const mergeInventoryItems = (items = []) => {
  const merged = new Map()

  for (const item of items) {
    const key = `${item.productId}:${item.variantId}`
    const current = merged.get(key)
    if (current) {
      if (Number(current.price) !== Number(item.price)) {
        throw conflict('A product price changed while preparing the order. Please refresh your cart.')
      }
      current.qty += Number(item.qty)
    } else {
      merged.set(key, { ...item, qty: Number(item.qty) })
    }
  }

  return [...merged.values()]
}

const movementKey = (orderId, item, movementType) =>
  `${orderId}:${item.productId}:${item.variantId}:${movementType}`

export const reserveInventory = async (items, orderId, session) => {
  const lowStock = []

  for (const item of mergeInventoryItems(items)) {
    const product = await Product.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: true,
        seasonalStatus: 'available',
        variants: {
          $elemMatch: {
            _id: item.variantId,
            price: item.price,
            isAvailable: true,
            stock: { $gte: item.qty }
          }
        }
      },
      { $inc: { 'variants.$[variant].stock': -item.qty } },
      {
        arrayFilters: [{ 'variant._id': item.variantId, 'variant.stock': { $gte: item.qty } }],
        new: true,
        session
      }
    )

    if (!product) {
      throw conflict(`Stock or price changed for ${item.name}. Refresh your cart and try again.`)
    }

    const variant = product.variants.id(item.variantId)
    const before = variant.stock + item.qty
    await StockLog.create([{
      productId: product._id,
      productName: product.name,
      variantWeight: variant.weight,
      changeType: 'order',
      quantityBefore: before,
      quantityChange: -item.qty,
      quantityAfter: variant.stock,
      orderId,
      movementKey: movementKey(orderId, item, 'reserve')
    }], { session })

    if (variant.stock <= 10 && variant.stock > 0) {
      lowStock.push({ name: product.name, weight: variant.weight, stock: variant.stock })
    }
  }

  return lowStock
}

export const releaseInventory = async (items, orderId, session, movementType = 'cancellation') => {
  for (const item of mergeInventoryItems(items)) {
    const product = await Product.findOneAndUpdate(
      { _id: item.productId, 'variants._id': item.variantId },
      { $inc: { 'variants.$[variant].stock': item.qty } },
      {
        arrayFilters: [{ 'variant._id': item.variantId }],
        new: true,
        session
      }
    )

    if (!product) {
      throw conflict(`Cannot release inventory for missing product variant ${item.variantId}.`)
    }

    const variant = product.variants.id(item.variantId)
    await StockLog.create([{
      productId: product._id,
      productName: product.name,
      variantWeight: variant.weight,
      changeType: movementType,
      quantityBefore: variant.stock - item.qty,
      quantityChange: item.qty,
      quantityAfter: variant.stock,
      orderId,
      movementKey: movementKey(orderId, item, movementType)
    }], { session })
  }
}