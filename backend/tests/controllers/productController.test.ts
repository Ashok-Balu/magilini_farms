import assert from 'node:assert/strict'
import test from 'node:test'
import Product from '../../src/models/Product.js'
import Category from '../../src/models/Category.js'
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts
} from '../../src/controllers/productController.js'

const response = () => ({
  statusCode: 200,
  body: undefined as any,
  status(code: number) { this.statusCode = code; return this },
  json(body: any) { this.body = body; return this }
})

const invoke = async (handler: any, req: any, res: any) => {
  let failure: unknown
  await handler(req, res, (error: unknown) => { failure = error })
  if (failure) throw failure
}

const replaceMethod = (target: any, method: string, value: unknown) => {
  Object.defineProperty(target, method, { configurable: true, writable: true, value })
}

test('public product listing applies active, category, search, filter, sort, and pagination rules', async () => {
  const originals = {
    countDocuments: Product.countDocuments,
    aggregate: Product.aggregate,
    findOne: Category.findOne
  }
  const products = [{ _id: 'product-1' }]
  let pipeline: any[]
  let query: any
  Product.countDocuments = (async (value: any) => { query = value; return 31 }) as any
  Product.aggregate = (async (value: any[]) => { pipeline = value; return products }) as any
  Category.findOne = (async () => ({ _id: 'category-1' })) as any

  try {
    const res = response()
    await invoke(getProducts, { query: {
      category: 'mangoes',
      search: 'alphonso',
      seasonal: 'available',
      featured: 'true',
      minPrice: '100',
      maxPrice: '500',
      sort: 'price_asc',
      page: '3',
      limit: '10'
    } }, res)

    assert.deepEqual(query, {
      isActive: true,
      category: 'category-1',
      seasonalStatus: 'available',
      isFeatured: true,
      variants: { $elemMatch: { price: { $gte: 100, $lte: 500 } } },
      $or: [
        { name: { $regex: 'alphonso', $options: 'i' } },
        { description: { $regex: 'alphonso', $options: 'i' } },
        { tags: { $in: [/alphonso/i] } }
      ]
    })
    assert.deepEqual(pipeline[0], { $match: query })
    assert.deepEqual(pipeline[1], { $addFields: {
      lowestPrice: { $min: '$variants.price' },
      highestPrice: { $max: '$variants.price' }
    } })
    assert.deepEqual(pipeline[2], { $sort: { lowestPrice: 1, _id: 1 } })
    assert.deepEqual(pipeline[3], { $skip: 20 })
    assert.deepEqual(pipeline[4], { $limit: 10 })
    assert.equal(res.body.total, 31)
    assert.equal(res.body.page, 3)
    assert.equal(res.body.products, products)
  } finally {
    replaceMethod(Product, 'countDocuments', originals.countDocuments)
    replaceMethod(Product, 'aggregate', originals.aggregate)
    replaceMethod(Category, 'findOne', originals.findOne)
  }
})

test('public product listing returns an empty page for an unknown category slug', async () => {
  const originalFindOne = Category.findOne
  const originalCount = Product.countDocuments
  const originalFind = Product.find
  let databaseReads = 0
  Category.findOne = (async () => null) as any
  Product.countDocuments = (async () => { databaseReads += 1; return 0 }) as any
  Product.find = (() => { databaseReads += 1 }) as any

  try {
    const res = response()
    await invoke(getProducts, { query: { category: 'unknown', page: '2' } }, res)
    assert.deepEqual(res.body, { success: true, total: 0, page: 2, products: [] })
    assert.equal(databaseReads, 0)
  } finally {
    replaceMethod(Category, 'findOne', originalFindOne)
    replaceMethod(Product, 'countDocuments', originalCount)
    replaceMethod(Product, 'find', originalFind)
  }
})

test('public product detail returns only an active matching slug', async () => {
  const originalFindOne = Product.findOne
  let query: any
  let populateFields: any
  Product.findOne = ((value: any) => {
    query = value
    return { populate: async (...args: any[]) => {
      populateFields = args
      return { _id: 'product-1', slug: 'alphonso', isActive: true }
    } }
  }) as any

  try {
    const res = response()
    await invoke(getProduct, { params: { slug: 'alphonso' } }, res)
    assert.deepEqual(query, { slug: 'alphonso', isActive: true })
    assert.deepEqual(populateFields, ['category', 'name slug emoji'])
    assert.equal(res.body.product._id, 'product-1')

    Product.findOne = (() => ({ populate: async () => null })) as any
    const missing = response()
    await invoke(getProduct, { params: { slug: 'missing' } }, missing)
    assert.equal(missing.statusCode, 404)
    assert.equal(missing.body.message, 'Product not found.')
  } finally {
    replaceMethod(Product, 'findOne', originalFindOne)
  }
})

test('product creation parses fields, normalizes slug, and stores uploaded images', async () => {
  const originalCreate = Product.create
  const originalCategoryExists = Category.exists
  let document: any
  Product.create = (async (value: any) => { document = value; return value }) as any
  Category.exists = (async () => true) as any

  try {
    const res = response()
    await invoke(createProduct, {
      body: {
        name: 'Alphonso Mango',
        category: 'category-1',
        description: 'Fresh fruit',
        keyPoints: '["Sweet","Fresh"]',
        tags: '["mango"]',
        variants: '[{"weight":"1 kg","price":"250","mrp":"300","stock":"5"}]',
        seo: '{"metaTitle":"Alphonso"}',
        seasonalStatus: 'available'
      },
      files: [{ path: '/uploads/mango.jpg', filename: 'mango-image' }]
    }, res)

    assert.equal(res.statusCode, 201)
    assert.equal(document.slug, 'alphonso-mango')
    assert.deepEqual(document.keyPoints, ['Sweet', 'Fresh'])
    assert.deepEqual(document.tags, ['mango'])
    assert.deepEqual(document.variants, [{ weight: '1 kg', price: '250', mrp: '300', stock: '5' }])
    assert.deepEqual(document.images, [{ url: '/uploads/mango.jpg', publicId: 'mango-image' }])
    assert.deepEqual(document.seo, { metaTitle: 'Alphonso' })
  } finally {
    replaceMethod(Product, 'create', originalCreate)
    replaceMethod(Category, 'exists', originalCategoryExists)
  }
})

test('product creation rejects excessive image uploads before creating the product', async () => {
  const originalCreate = Product.create
  const originalCategoryExists = Category.exists
  let writes = 0
  Product.create = (async () => { writes += 1 }) as any
  Category.exists = (async () => true) as any

  try {
    const res = response()
    await invoke(createProduct, {
      body: {
        name: 'Alphonso Mango',
        category: 'category-1',
        description: 'Fresh fruit',
        variants: '[{"weight":"1 kg","price":250,"mrp":300,"stock":5}]'
      },
      files: Array.from({ length: 6 }, (_, index) => ({ path: `/image-${index}.jpg`, filename: `image-${index}` }))
    }, res)
    assert.equal(res.statusCode, 400)
    assert.equal(res.body.message, 'Maximum 5 images are allowed.')
    assert.equal(writes, 0)
  } finally {
    replaceMethod(Product, 'create', originalCreate)
    replaceMethod(Category, 'exists', originalCategoryExists)
  }
})

test('product deletion archives a product rather than removing it', async () => {
  const originalFindById = Product.findById
  const product: any = { isActive: true, save: async () => { product.saved = true } }
  Product.findById = (async () => product) as any

  try {
    const res = response()
    await invoke(deleteProduct, { params: { id: 'product-1' } }, res)
    assert.equal(product.isActive, false)
    assert.equal(product.saved, true)
    assert.equal(res.body.message, 'Product archived.')
  } finally {
    replaceMethod(Product, 'findById', originalFindById)
  }
})
