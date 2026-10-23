import mongoose from 'mongoose'
import Product  from '../models/Product.js'
import Order from '../models/Order.js'
import Category from '../models/Category.js'
import { StockLog, NotifyMe } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { cloudinary }   from '../config/cloudinary.js'
import slugify from 'slugify'
import { notifySeasonAvailable } from '../services/notificationService.js'
import { conflict } from '../utils/httpError.js'
import { weightToKg } from '../utils/weight.js'
import { logger } from '../utils/logger.js'

const parseJSON = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const validateVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) return 'At least one variant is required.'
  for (const variant of variants) {
    const price = Number(variant.price)
    const mrp = Number(variant.mrp)
    const stock = Number(variant.stock ?? 0)
    if (weightToKg(variant.weight) <= 0) return 'Variant weight must include a positive amount and an explicit g or kg unit.'
    if (!Number.isFinite(price) || price <= 0) return 'Variant price must be greater than zero.'
    if (!Number.isFinite(mrp) || mrp < price) return 'Variant MRP must be at least the selling price.'
    if (!Number.isSafeInteger(stock) || stock < 0) return 'Variant stock must be a non-negative whole number.'
  }
  return null
}

// ── PUBLIC ────────────────────────────────────────────────

// GET /api/products
export const getProducts = asyncHandler(async (req, res) => {
  const { category, search, sort, seasonal, featured, minPrice, maxPrice, limit = 20, page = 1 } = req.query

  const query = { isActive: true }
  if (category) {
    const categoryId = await getCategoryId(category)
    if (!categoryId) {
      return res.json({ success: true, total: 0, page: Number(page), products: [] })
    }
    query.category = categoryId
  }
  if (seasonal) query.seasonalStatus = seasonal
  if (featured !== undefined) query.isFeatured = featured === 'true'
  if (minPrice || maxPrice) {
    const min = Number(minPrice || 0)
    const max = Number(maxPrice || Number.MAX_SAFE_INTEGER)
    query.variants = { $elemMatch: { price: { $gte: min, $lte: max } } }
  }
  if (search) {
    const safeSearch = escapeRegex(String(search))
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
      { tags: { $in: [new RegExp(safeSearch, 'i')] } }
    ]
  }

  const total    = await Product.countDocuments(query)
  const pageSize = Math.max(1, Math.min(100, Number(limit) || 20))
  const pageNumber = Math.max(1, Number(page) || 1)
  const sortStage = sort === 'price_asc'
    ? { lowestPrice: 1, _id: 1 }
    : sort === 'price_desc'
      ? { lowestPrice: -1, _id: 1 }
      : sort === 'newest'
        ? { createdAt: -1 }
        : { isFeatured: -1, createdAt: -1 }
  const products = await Product.aggregate([
    { $match: query },
    { $addFields: {
      lowestPrice: { $min: '$variants.price' },
      highestPrice: { $max: '$variants.price' }
    } },
    { $sort: sortStage },
    { $skip: (pageNumber - 1) * pageSize },
    { $limit: pageSize },
    { $lookup: { from: Category.collection.name, localField: 'category', foreignField: '_id', as: 'category' } },
    { $addFields: { category: { $arrayElemAt: ['$category', 0] } } }
  ])

  res.json({ success: true, total, page: pageNumber, products })
})

// GET /api/products/:slug
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug emoji')
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  res.json({ success: true, product })
})

// GET /api/products/featured
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true, isFeatured: true })
    .populate('category', 'name slug emoji').limit(8)
  res.json({ success: true, products })
})

// GET /api/products/top-selling
export const getTopSellingProducts = asyncHandler(async (req, res) => {
  const { limit = 8 } = req.query
  const pageSize = Math.max(1, Math.min(30, Number(limit) || 8))
  const products = await Order.aggregate([
    { $match: { paymentStatus: 'paid', status: { $ne: 'Cancelled' } } },
    { $unwind: '$items' },
    { $match: { 'items.productId': { $ne: null } } },
    { $group: { _id: '$items.productId', unitsSold: { $sum: '$items.qty' } } },
    { $sort: { unitsSold: -1, _id: 1 } },
    { $limit: pageSize },
    { $lookup: { from: Product.collection.name, localField: '_id', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    { $match: { 'product.isActive': true } },
    { $lookup: { from: Category.collection.name, localField: 'product.category', foreignField: '_id', as: 'category' } },
    { $addFields: { 'product.category': { $arrayElemAt: ['$category', 0] }, 'product.unitsSold': '$unitsSold' } },
    { $replaceRoot: { newRoot: '$product' } }
  ])

  res.json({ success: true, products })
})

// ── ADMIN ─────────────────────────────────────────────────

// GET /api/admin/products
export const adminGetProducts = asyncHandler(async (req, res) => {
  const { search, category, stock, seasonalStatus, isActive, page = 1, limit = 20 } = req.query
  const query = {}
  if (search) {
    const safeSearch = escapeRegex(String(search))
    query.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
      { tags: { $in: [new RegExp(safeSearch, 'i')] } }
    ]
  }
  if (category) {
    const categoryId = await getCategoryId(category)
    if (!categoryId) return res.json({ success: true, total: 0, products: [] })
    query.category = categoryId
  }
  if (stock === 'low')  query['variants.stock'] = { $lte: 10, $gt: 0 }
  if (stock === 'out')  query['variants.stock'] = 0
  if (seasonalStatus) query.seasonalStatus = seasonalStatus
  if (isActive !== undefined && isActive !== '') query.isActive = String(isActive) === 'true'

  const total    = await Product.countDocuments(query)
  const products = await Product.find(query)
    .populate('category', 'name').sort({ createdAt: -1 })
    .limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
  res.json({ success: true, total, products })
})

// POST /api/admin/products
export const createProduct = asyncHandler(async (req, res) => {
  const { name, category, description, keyPoints, storageTips, productTerms,
          tags, badge, minimumQty, variants, isFeatured, seasonalStatus,
          availableFrom, seasonNote, seo } = req.body

  const slug = slugify(name, { lower: true, strict: true })
  const parsedVariants = parseJSON(variants, null)
  const variantValidationError = validateVariants(parsedVariants)
  if (variantValidationError) {
    return res.status(400).json({ success: false, message: variantValidationError })
  }
  if (!await Category.exists({ _id: category })) {
    return res.status(400).json({ success: false, message: 'Selected category does not exist.' })
  }

  const images = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || []
  if (images.length > 5) {
    return res.status(400).json({ success: false, message: 'Maximum 5 images are allowed.' })
  }

  const product = await Product.create({
    name, slug, category, description,
    keyPoints:    parseJSON(keyPoints, []),
    storageTips, productTerms,
    tags:         parseJSON(tags, []),
    badge, minimumQty,
    variants:     parsedVariants,
    images, isFeatured, seasonalStatus,
    availableFrom: availableFrom || null,
    seasonNote,
    seo:          parseJSON(seo, {})
  })

  res.status(201).json({ success: true, message: 'Product created.', product })
})

// PATCH /api/admin/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const updates = { ...req.body }
  if (req.body.keyPoints) updates.keyPoints = parseJSON(req.body.keyPoints, [])
  if (req.body.tags)      updates.tags      = parseJSON(req.body.tags, [])
  if (req.body.variants)  updates.variants  = parseJSON(req.body.variants, [])
  if (req.body.seo)       updates.seo       = parseJSON(req.body.seo, {})
  if (req.body.name)      updates.slug      = slugify(req.body.name, { lower: true, strict: true })
  if ('availableFrom' in updates) updates.availableFrom = updates.availableFrom || null

  // Handle image management: existingImages tells us which images to keep
  const existingImages = parseJSON(req.body.existingImages, null)
  let imageDeletes = []
  let imageUpdates
  let appendImages = false
  if (existingImages !== null) {
    imageUpdates = [...existingImages, ...(req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [])]
  } else if (req.files?.length) {
    imageUpdates = [...req.files.map(f => ({ url: f.path, publicId: f.filename }))]
    appendImages = true
  }

  if (imageUpdates && imageUpdates.length > 5) {
    return res.status(400).json({ success: false, message: 'Maximum 5 images are allowed.' })
  }

  if (updates.variants) {
    const variantValidationError = validateVariants(updates.variants)
    if (variantValidationError) {
      return res.status(400).json({ success: false, message: variantValidationError })
    }
  }

  delete updates.existingImages
  delete updates.images
  const session = await mongoose.startSession()
  let product
  try {
    await session.withTransaction(async () => {
      product = await Product.findById(req.params.id).session(session)
      if (!product) return

      if (updates.category && !await Category.exists({ _id: updates.category }).session(session)) {
        throw conflict('Selected category does not exist.')
      }

      if (updates.variants) {
        const oldVariants = new Map(product.variants.map(variant => [String(variant._id), variant]))
        const newVariants = updates.variants
        const stockChanges = []
        const nextVariantIds = new Set(newVariants.map(variant => String(variant._id || '')))
        const removedVariantIds = product.variants
          .filter(variant => !nextVariantIds.has(String(variant._id)))
          .map(variant => variant._id)
        if (removedVariantIds.length) {
          const hasHistoricalOrders = await Order.exists({
            items: { $elemMatch: { productId: product._id, variantId: { $in: removedVariantIds } } }
          }).session(session)
          if (hasHistoricalOrders) {
            throw conflict('Variants referenced by existing orders cannot be removed. Mark them unavailable instead.')
          }
        }
        for (const variant of newVariants) {
          const oldVariant = variant._id && oldVariants.get(String(variant._id))
          if (oldVariant) {
            const initialStock = variant._initialStock === undefined ? Number(oldVariant.stock) : Number(variant._initialStock)
            const requestedStock = Number(variant.stock)
            if (initialStock !== Number(oldVariant.stock) && requestedStock !== initialStock) {
              throw conflict(`${variant.weight} stock changed while this product form was open. Reload before adjusting inventory.`)
            }
            variant.stock = initialStock === Number(oldVariant.stock) ? requestedStock : Number(oldVariant.stock)
            if (Number(oldVariant.stock) !== Number(variant.stock)) {
              stockChanges.push({ variant, oldVariant })
            }
          }
          delete variant._initialStock
        }
        if (stockChanges.length) {
          await StockLog.create(stockChanges.map(({ variant, oldVariant }) => ({
            productId: product._id,
            productName: product.name,
            variantWeight: variant.weight,
            changeType: 'adjustment',
            quantityBefore: Number(oldVariant.stock),
            quantityChange: Number(variant.stock) - Number(oldVariant.stock),
            quantityAfter: Number(variant.stock),
            adminId: req.user._id,
            note: 'Stock adjusted through product editor',
            movementKey: `product-edit:${product._id}:${variant._id}:${new mongoose.Types.ObjectId()}`
          })), { session })
        }
      }

      if (imageUpdates) {
        const nextImages = appendImages ? [...product.images, ...imageUpdates] : imageUpdates
        const keptUrls = new Set(nextImages.map(img => img.url))
        imageDeletes = product.images.filter(img => !keptUrls.has(img.url))
        updates.images = nextImages
      }
      Object.assign(product, updates)
      await product.save({ session })
    })
  } finally {
    await session.endSession()
  }

  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  await Promise.all(imageDeletes.map(async (img) => {
    try {
      await cloudinary.uploader.destroy(img.publicId)
    } catch (error) {
      logger.warn('Failed to remove replaced Cloudinary product image', {
        errorName: error instanceof Error ? error.name : 'UnknownError'
      })
    }
  }))
  res.json({ success: true, message: 'Product updated.', product })
})

// PATCH /api/admin/products/:id/stock
export const updateStock = asyncHandler(async (req, res) => {
  const { variantId, stock, note } = req.body
  const session = await mongoose.startSession()
  let product
  let before
  let updatedVariant
  try {
    await session.withTransaction(async () => {
      product = await Product.findById(req.params.id).session(session)
      if (!product) return

      const variant = product.variants.id(variantId)
      if (!variant) return
      before = variant.stock
      variant.stock = stock
      await product.save({ session })
      updatedVariant = product.variants.id(variantId)

      await StockLog.create([{
        productId: product._id,
        productName: product.name,
        variantWeight: variant.weight,
        changeType: 'manual',
        quantityBefore: before,
        quantityChange: stock - before,
        quantityAfter: stock,
        adminId: req.user._id,
        note,
        movementKey: `stock-adjustment:${product._id}:${variantId}:${new mongoose.Types.ObjectId()}`
      }], { session })
    })
  } finally {
    await session.endSession()
  }

  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  if (!updatedVariant) return res.status(404).json({ success: false, message: 'Variant not found.' })

  // Check if was out-of-stock and now available → notify registered users
  if (before === 0 && stock > 0) {
    const notifyList = await NotifyMe.find({ productId: product._id, notified: false })
    await Promise.all(notifyList.map(({ phone }) => notifySeasonAvailable(phone, product.name).catch(() => {})))
    await NotifyMe.updateMany({ productId: product._id }, { notified: true })
    console.log(`📱 Notifying ${notifyList.length} users about stock availability`)
  }

  res.json({ success: true, message: 'Stock updated.', variant: updatedVariant })
})

// PATCH /api/admin/products/:id/seasonal
export const updateSeasonalStatus = asyncHandler(async (req, res) => {
  const { seasonalStatus, availableFrom, seasonNote } = req.body
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })

  const previousStatus = product.seasonalStatus

  product.seasonalStatus = seasonalStatus
  if (availableFrom !== undefined) product.availableFrom = availableFrom || null
  if (seasonNote !== undefined) product.seasonNote = seasonNote
  await product.save()

  // Notify users when product becomes available from off-season/coming-soon
  if (seasonalStatus === 'available' && previousStatus !== 'available') {
    const notifyList = await NotifyMe.find({ productId: product._id, notified: false })
    if (notifyList.length) {
      await Promise.all(notifyList.map(({ phone }) => notifySeasonAvailable(phone, product.name).catch(() => {})))
      await NotifyMe.updateMany({ productId: product._id, notified: false }, { notified: true })
      console.log(`📱 Notifying ${notifyList.length} users about ${product.name} seasonal availability`)
    }
  }

  res.json({ success: true, message: 'Seasonal status updated.', product })
})

// DELETE /api/admin/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })
  product.isActive = false
  await product.save()
  res.json({ success: true, message: 'Product archived.' })
})

// Helper
const getCategoryId = async (slug) => {
  const cat = await Category.findOne({ slug })
  return cat?._id
}
