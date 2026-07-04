import config from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import Otp from '../models/Otp.js'
import OtpRequest from '../models/OtpRequest.js'
import {
  Coupon,
  Pincode,
  BusinessHours,
  StockLog,
  BulkEnquiry,
  NotifyMe,
  PaymentTransaction,
  PaymentWebhookEvent,
  Complaint
} from '../models/index.js'
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

type SeedBusinessHours = {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  isOpen: boolean
  openTime: string
  closeTime: string
  pickupOpenTime: string
  pickupCloseTime: string
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
const allowProd = args.has('--allow-prod')

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
    description: 'Naturally ripened Alphonso mangoes sourced directly from our farm. No carbide used.',
    keyPoints: ['No carbide ripening', 'Farm direct', 'Hand sorted quality'],
    tags: ['alphonso', 'seasonal', 'premium'],
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
      },
      {
        weight: '2 kg',
        price: 549,
        mrp: 649,
        stock: 80,
        isAvailable: true
      }
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=1200&q=80',
        publicId: 'seed/alphonso-1'
      }
    ]
  },
  {
    name: 'Organic Farm Fresh Greens',
    slug: 'organic-farm-fresh-greens',
    categorySlug: 'farm-fresh',
    description: 'Fresh organic vegetables harvested daily from our certified organic farm.',
    keyPoints: ['Pesticide-free', 'Freshly harvested', 'Certified organic'],
    tags: ['organic', 'vegetables', 'fresh'],
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      {
        weight: '500 g',
        price: 125,
        mrp: 150,
        stock: 150,
        isAvailable: true
      },
      {
        weight: '1 kg',
        price: 225,
        mrp: 275,
        stock: 120,
        isAvailable: true
      }
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1464226184158-280fb86fcff1?auto=format&fit=crop&w=1200&q=80',
        publicId: 'seed/greens-1'
      }
    ]
  },
  {
    name: 'Fresh Farm Eggs',
    slug: 'fresh-farm-eggs',
    categorySlug: 'farm-fresh',
    description: 'Free-range eggs from our farm hens. No antibiotics, no artificial feed.',
    keyPoints: ['Free-range', 'No antibiotics', 'Fresh daily'],
    tags: ['eggs', 'organic', 'farm-fresh'],
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      {
        weight: '6 eggs',
        price: 65,
        mrp: 85,
        stock: 200,
        isAvailable: true
      },
      {
        weight: '12 eggs',
        price: 120,
        mrp: 160,
        stock: 180,
        isAvailable: true
      }
    ],
    images: [
      {
        url: 'https://images.unsplash.com/photo-1582720571773-7249df2edf46?auto=format&fit=crop&w=1200&q=80',
        publicId: 'seed/eggs-1'
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
  },
  {
    code: 'SUMMER20',
    type: 'percent',
    value: 20,
    minOrderAmount: 1000,
    maxDiscount: 300,
    usageLimit: 500,
    perUserLimit: 1,
    isActive: true
  },
  {
    code: 'FREEDELIV',
    type: 'delivery',
    value: 100,
    minOrderAmount: 800,
    usageLimit: 300,
    perUserLimit: 2,
    isActive: true
  },
  {
    code: 'FLAT100',
    type: 'flat',
    value: 100,
    minOrderAmount: 1500,
    usageLimit: 200,
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
  },
  {
    pincode: '639002',
    city: 'Karur',
    state: 'Tamil Nadu',
    zone: 'tamil-nadu',
    deliveryFee: 0,
    estimatedDays: '1-2 days',
    isActive: true
  },
  {
    pincode: '641001',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    zone: 'south-india',
    deliveryFee: 50,
    estimatedDays: '2-3 days',
    isActive: true
  },
  {
    pincode: '600001',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zone: 'south-india',
    deliveryFee: 75,
    estimatedDays: '2-3 days',
    isActive: true
  },
  {
    pincode: '500001',
    city: 'Hyderabad',
    state: 'Telangana',
    zone: 'south-india',
    deliveryFee: 100,
    estimatedDays: '3-4 days',
    isActive: true
  },
  {
    pincode: '110001',
    city: 'New Delhi',
    state: 'Delhi',
    zone: 'rest-india',
    deliveryFee: 150,
    estimatedDays: '4-5 days',
    isActive: true
  }
]

const SEED_BUSINESS_HOURS: SeedBusinessHours[] = [
  { day: 'monday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'tuesday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'wednesday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'thursday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'friday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'saturday', isOpen: true, openTime: '07:00', closeTime: '21:00', pickupOpenTime: '06:00', pickupCloseTime: '19:00' },
  { day: 'sunday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' }
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
  if (config.isProduction && !allowProd) {
    fail('Production database cannot be seeded. Use --allow-prod flag if intentional.')
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
  const [
    categories,
    products,
    coupons,
    pincodes,
    businessHours,
    orders,
    payments,
    webhooks,
    stockLogs,
    complaints,
    bulkEnquiries,
    notifyMe,
    otps,
    otpRequests,
    users
  ] = await Promise.all([
    Category.countDocuments(),
    Product.countDocuments(),
    Coupon.countDocuments(),
    Pincode.countDocuments(),
    BusinessHours.countDocuments(),
    Order.countDocuments(),
    PaymentTransaction.countDocuments(),
    PaymentWebhookEvent.countDocuments(),
    StockLog.countDocuments(),
    Complaint.countDocuments(),
    BulkEnquiry.countDocuments(),
    NotifyMe.countDocuments(),
    Otp.countDocuments(),
    OtpRequest.countDocuments(),
    User.countDocuments()
  ])

  return [
    categories,
    products,
    coupons,
    pincodes,
    businessHours,
    orders,
    payments,
    webhooks,
    stockLogs,
    complaints,
    bulkEnquiries,
    notifyMe,
    otps,
    otpRequests,
    users
  ].some((count) => count > 0)
}

const clearCollections = async () => {
  await Promise.all([
    Product.deleteMany({}),
    Category.deleteMany({}),
    Coupon.deleteMany({}),
    Pincode.deleteMany({}),
    BusinessHours.deleteMany({}),
    Order.deleteMany({}),
    PaymentTransaction.deleteMany({}),
    PaymentWebhookEvent.deleteMany({}),
    StockLog.deleteMany({}),
    Complaint.deleteMany({}),
    BulkEnquiry.deleteMany({}),
    NotifyMe.deleteMany({}),
    Otp.deleteMany({}),
    OtpRequest.deleteMany({}),
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

const upsertBusinessHours = async (): Promise<void> => {
  for (const hours of SEED_BUSINESS_HOURS) {
    await BusinessHours.updateOne(
      { day: hours.day },
      {
        $setOnInsert: {
          day: hours.day,
          isOpen: hours.isOpen,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          pickupOpenTime: hours.pickupOpenTime,
          pickupCloseTime: hours.pickupCloseTime
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
    await upsertBusinessHours()

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
