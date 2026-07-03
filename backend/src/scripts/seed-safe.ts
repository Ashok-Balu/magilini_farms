import config from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { Coupon, Pincode } from '../models/index.js'
import { logger } from '../utils/logger.js'

type SeedCategory = {
  name: string
  slug: string
  emoji: string
  sortOrder: number
  isActive: boolean
}

type SeedProduct = {
  name: string
  slug: string
  categorySlug: string
  description: string
  keyPoints: string[]
  tags: string[]
  minimumQty: number
  isFeatured: boolean
  isActive: boolean
  variants: Array<{
    weight: string
    price: number
    mrp: number
    stock: number
    isAvailable: boolean
  }>
  images: Array<{
    url: string
    publicId: string
  }>
}

type SeedCoupon = {
  code: string
  type: 'percent' | 'flat' | 'delivery'
  value: number
  minOrderAmount: number
  maxDiscount?: number
  usageLimit: number
  perUserLimit: number
  isActive: boolean
}

type SeedPincode = {
  pincode: string
  city: string
  state: string
  zone: 'tamil-nadu' | 'south-india' | 'rest-india'
  deliveryFee: number
  estimatedDays: string
  isActive: boolean
}

class SeedSafetyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SeedSafetyError'
  }
}

const args = new Set(process.argv.slice(2))
const hasForce = args.has('--force')
const hasClear = args.has('--clear')

const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Mangoes',
    slug: 'mangoes',
    emoji: '🥭',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Farm Fresh',
    slug: 'farm-fresh',
    emoji: '🌿',
    sortOrder: 2,
    isActive: true
  }
]

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Premium Alphonso Mango',
    slug: 'premium-alphonso-mango',
    categorySlug: 'mangoes',
    description: 'Naturally ripened Alphonso mangoes sourced directly from our farm.',
    keyPoints: ['No carbide ripening', 'Farm direct', 'Hand sorted quality'],
    tags: ['alphonso', 'seasonal'],
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      {
        weight: '1 kg',
        price: 299,
        mrp: 349,
        stock: 100,
        isAvailable: true
      }
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80',
        publicId: 'seed/premium-alphonso-mango-1'
      }
    ]
  }
]

const SEED_COUPONS: SeedCoupon[] = [
  {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minOrderAmount: 500,
    maxDiscount: 150,
    usageLimit: 1000,
    perUserLimit: 1,
    isActive: true
  }
]

const SEED_PINCODES: SeedPincode[] = [
  {
    pincode: '639001',
    city: 'Karur',
    state: 'Tamil Nadu',
    zone: 'tamil-nadu',
    deliveryFee: 0,
    estimatedDays: '1-2 days',
    isActive: true
  }
]

const fail = (message: string): never => {
  throw new SeedSafetyError(message)
}

const printSafetyBanner = () => {
  if (!(hasForce && hasClear)) return

  console.log('============================================')
  console.log('WARNING')
  console.log('')
  console.log(`Database : ${config.dbName}`)
  console.log('All existing data will be removed.')
  console.log(`Environment : ${config.nodeEnv}`)
  console.log('Seed Mode : FORCE + CLEAR')
  console.log('============================================')
}

const assertSeedPolicy = () => {
  if (config.isProduction) {
    fail('Production database cannot be seeded.')
  }

  if (!config.enableSeed) {
    console.error('Seeding is disabled.')
    fail('Set ENABLE_SEED=true before running.')
  }

  if (!hasForce) {
    fail('Use --force to execute database seeding.')
  }
}

const hasExistingData = async (): Promise<boolean> => {
  const [categories, products, coupons, pincodes, users] = await Promise.all([
    Category.countDocuments(),
    Product.countDocuments(),
    Coupon.countDocuments(),
    Pincode.countDocuments(),
    User.countDocuments()
  ])

  return [categories, products, coupons, pincodes, users].some((count) => count > 0)
}

const clearCollections = async () => {
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Coupon.deleteMany({}),
    Pincode.deleteMany({}),
    User.deleteMany({ role: 'customer' })
  ])
}

const upsertCategories = async (): Promise<Map<string, string>> => {
  for (const category of SEED_CATEGORIES) {
    await Category.updateOne(
      { slug: category.slug },
      {
        $setOnInsert: {
          name: category.name,
          slug: category.slug,
          emoji: category.emoji,
          sortOrder: category.sortOrder,
          isActive: category.isActive
        }
      },
      { upsert: true }
    )
  }

  const insertedCategories = await Category.find(
    { slug: { $in: SEED_CATEGORIES.map((category) => category.slug) } },
    { slug: 1 }
  )

  const map = new Map<string, string>()
  for (const category of insertedCategories) {
    map.set(category.slug, String(category._id))
  }

  return map
}

const upsertProducts = async (categoryIdBySlug: Map<string, string>): Promise<void> => {
  for (const product of SEED_PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.categorySlug)
    if (!categoryId) {
      fail(`Missing category for product seed: ${product.slug}`)
    }

    await Product.updateOne(
      { slug: product.slug },
      {
        $setOnInsert: {
          name: product.name,
          slug: product.slug,
          category: categoryId,
          description: product.description,
          keyPoints: product.keyPoints,
          tags: product.tags,
          minimumQty: product.minimumQty,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          variants: product.variants,
          images: product.images
        }
      },
      { upsert: true }
    )
  }
}

const upsertCoupons = async (): Promise<void> => {
  for (const coupon of SEED_COUPONS) {
    await Coupon.updateOne(
      { code: coupon.code },
      {
        $setOnInsert: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minOrderAmount: coupon.minOrderAmount,
          maxDiscount: coupon.maxDiscount,
          usageLimit: coupon.usageLimit,
          perUserLimit: coupon.perUserLimit,
          isActive: coupon.isActive
        }
      },
      { upsert: true }
    )
  }
}

const upsertPincodes = async (): Promise<void> => {
  for (const pincode of SEED_PINCODES) {
    await Pincode.updateOne(
      { pincode: pincode.pincode },
      {
        $setOnInsert: {
          pincode: pincode.pincode,
          city: pincode.city,
          state: pincode.state,
          zone: pincode.zone,
          deliveryFee: pincode.deliveryFee,
          estimatedDays: pincode.estimatedDays,
          isActive: pincode.isActive
        }
      },
      { upsert: true }
    )
  }
}

const run = async (): Promise<void> => {
  try {
    assertSeedPolicy()
    await connectDatabase()

    const existing = await hasExistingData()

    if (existing && !hasClear) {
      fail('Database already contains data. Seeding cancelled.')
    }

    if (existing && hasClear) {
      printSafetyBanner()
      await clearCollections()
    }

    const categories = await upsertCategories()
    await upsertProducts(categories)
    await upsertCoupons()
    await upsertPincodes()

    logger.info('Seed execution completed', {
      environment: config.nodeEnv,
      database: config.dbName,
      mode: hasClear ? 'FORCE + CLEAR' : 'FORCE'
    })

    console.log('Seed completed successfully.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Seed execution failed', {
      environment: config.nodeEnv,
      database: config.dbName,
      message
    })
    console.error(message)
    throw error
  } finally {
    await disconnectDatabase()
  }
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
