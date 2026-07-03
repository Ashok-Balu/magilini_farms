import Product  from '../models/Product.js'
import Category from '../models/Category.js'
import { StockLog, NotifyMe } from '../models/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { cloudinary }   from '../config/cloudinary.js'
import slugify from 'slugify'
import { notifySeasonAvailable } from '../services/notificationService.js'

const parseJSON = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const validateVariants = (variants) => {
  if (!Array.isArray(variants) || variants.length === 0) return 'At least one variant is required.'
  for (const variant of variants) {
    const price = Number(variant.price)
    const mrp = Number(variant.mrp)
    const stock = Number(variant.stock ?? 0)
    if (!String(variant.weight || '').trim()) return 'Variant weight is required.'
    if (!Number.isFinite(price) || price < 0) return 'Variant price is invalid.'
    if (!Number.isFinite(mrp) || mrp < 0) return 'Variant MRP is invalid.'
    if (!Number.isFinite(stock) || stock < 0) return 'Variant stock is invalid.'
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
  if (featured) query.isFeatured = true
  if (minPrice || maxPrice) {
    const min = Number(minPrice || 0)
    const max = Number(maxPrice || Number.MAX_SAFE_INTEGER)
    query.variants = { $elemMatch: { price: { $gte: min, $lte: max } } }
  }
  if (search)   query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
    { tags: { $in: [new RegExp(search, 'i')] } }
  ]

  const sortOptions = {
    'price_asc':  { 'variants.0.price': 1 },
    'price_desc': { 'variants.0.price': -1 },
    'newest':     { createdAt: -1 },
    'default':    { isFeatured: -1, createdAt: -1 }
  }

  const total    = await Product.countDocuments(query)
  const products = await Product.find(query)
    .populate('category', 'name slug emoji')
    .sort(sortOptions[sort] || sortOptions.default)
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))

  res.json({ success: true, total, page: Number(page), products })
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
  const products = await Product.find({ isActive: true })
    .populate('category', 'name slug emoji')
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(Number(limit))

  res.json({ success: true, products })
})

// ── ADMIN ─────────────────────────────────────────────────

// GET /api/admin/products
export const adminGetProducts = asyncHandler(async (req, res) => {
  const { search, category, stock, seasonalStatus, isActive, page = 1, limit = 20 } = req.query
  const query = {}
  if (search)   query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
    { tags: { $in: [new RegExp(search, 'i')] } }
  ]
  if (category) query.category = await getCategoryId(category)
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
    availableFrom, seasonNote,
    seo:          parseJSON(seo, {})
  })

  res.status(201).json({ success: true, message: 'Product created.', product })
})

// PATCH /api/admin/products/:id
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })

  const updates = { ...req.body }
  if (req.body.keyPoints) updates.keyPoints = parseJSON(req.body.keyPoints, [])
  if (req.body.tags)      updates.tags      = parseJSON(req.body.tags, [])
  if (req.body.variants)  updates.variants  = parseJSON(req.body.variants, [])
  if (req.body.seo)       updates.seo       = parseJSON(req.body.seo, {})
  if (req.body.name)      updates.slug      = slugify(req.body.name, { lower: true, strict: true })
  if (req.files?.length) {
    updates.images = [...product.images, ...req.files.map(f => ({ url: f.path, publicId: f.filename }))]
  }

  if (updates.images && updates.images.length > 5) {
    return res.status(400).json({ success: false, message: 'Maximum 5 images are allowed.' })
  }

  if (updates.variants) {
    const variantValidationError = validateVariants(updates.variants)
    if (variantValidationError) {
      return res.status(400).json({ success: false, message: variantValidationError })
    }
  }

  Object.assign(product, updates)
  await product.save()
  res.json({ success: true, message: 'Product updated.', product })
})

// PATCH /api/admin/products/:id/stock
export const updateStock = asyncHandler(async (req, res) => {
  const { variantId, stock, note } = req.body
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })

  const variant = product.variants.id(variantId)
  if (!variant) return res.status(404).json({ success: false, message: 'Variant not found.' })

  const before = variant.stock
  variant.stock = stock
  await product.save()

  // Log stock change
  await StockLog.create({
    productId: product._id, productName: product.name,
    variantWeight: variant.weight, changeType: 'manual',
    quantityBefore: before, quantityChange: stock - before,
    quantityAfter: stock, adminId: req.user._id, note
  })

  // Check if was out-of-stock and now available → notify registered users
  if (before === 0 && stock > 0) {
    const notifyList = await NotifyMe.find({ productId: product._id, notified: false })
    await Promise.all(notifyList.map(({ phone }) => notifySeasonAvailable(phone, product.name).catch(() => {})))
    await NotifyMe.updateMany({ productId: product._id }, { notified: true })
    console.log(`📱 Notifying ${notifyList.length} users about stock availability`)
  }

  res.json({ success: true, message: 'Stock updated.', variant })
})

// PATCH /api/admin/products/:id/seasonal
export const updateSeasonalStatus = asyncHandler(async (req, res) => {
  const { seasonalStatus, availableFrom, seasonNote } = req.body
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { seasonalStatus, availableFrom, seasonNote },
    { new: true }
  )
  res.json({ success: true, message: 'Seasonal status updated.', product })
})

// DELETE /api/admin/products/:id
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' })

  // Delete images from Cloudinary
  for (const img of product.images) {
    await cloudinary.uploader.destroy(img.publicId).catch(() => {})
  }
  await product.deleteOne()
  res.json({ success: true, message: 'Product deleted.' })
})

// Helper
const getCategoryId = async (slug) => {
  const cat = await Category.findOne({ slug })
  return cat?._id
}
