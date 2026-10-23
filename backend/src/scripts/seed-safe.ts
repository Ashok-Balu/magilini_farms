import config from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import Category from '../models/Category.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
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
import { assertSeedAdminCredentials, assertSeedPolicy } from './seed-policy.js'

type SeedCategory = {
  name: string
  slug: string
  emoji: string
  image?: string
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
  storageTips?: string
  productTerms?: string
  badge?: string
  minimumQty: number
  isFeatured: boolean
  isActive: boolean
  seasonalStatus?: 'available' | 'off-season' | 'coming-soon'
  availableFrom?: Date
  seasonNote?: string
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
  seo?: {
    metaTitle?: string
    metaDescription?: string
  }
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
  validFrom?: Date
  expiresAt?: Date
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

// ══════════════════════════════════════════════════════════════
// 2 CATEGORIES
// ══════════════════════════════════════════════════════════════

const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Mangoes',
    slug: 'mangoes',
    emoji: '🥭',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80',
    sortOrder: 1,
    isActive: true
  },
  {
    name: 'Fresh Fruits',
    slug: 'fresh-fruits',
    emoji: '🍎',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80',
    sortOrder: 2,
    isActive: true
  }
]

// ══════════════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════════════

const SEED_PRODUCTS: SeedProduct[] = [

  // ─────────────────────────────────────────────────────────
  // 🥭 MANGOES (15 products)
  // ─────────────────────────────────────────────────────────
  {
    name: 'Alphonso Mango (Hapus)',
    slug: 'alphonso-mango-hapus',
    categorySlug: 'mangoes',
    description: 'The king of mangoes — Alphonso (Hapus) with rich saffron flesh, zero fibre, and an intoxicating aroma. Naturally tree-ripened on our farm without any carbide or chemicals.',
    keyPoints: ['Zero fibre, rich saffron pulp', 'No carbide ripening', 'Hand-picked at peak ripeness', 'GI tagged Ratnagiri variety'],
    tags: ['alphonso', 'hapus', 'premium', 'gift'],
    storageTips: 'Keep at room temperature for 1-2 days to ripen. Refrigerate once soft and consume within 2 days.',
    productTerms: 'Fresh perishable produce. No returns or replacements. All sales final.',
    badge: 'Best Seller',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    seasonalStatus: 'available',
    availableFrom: new Date('2026-04-01T00:00:00.000Z'),
    seo: { metaTitle: 'Buy Alphonso Mango Online | Magilini Farms', metaDescription: 'Order premium Alphonso mangoes direct from farm. No carbide, naturally ripened.' },
    variants: [
      { weight: '1 kg (3-4 pcs)', price: 349, mrp: 449, stock: 200, isAvailable: true },
      { weight: '2 kg (6-8 pcs)', price: 649, mrp: 849, stock: 150, isAvailable: true },
      { weight: '5 kg (15-18 pcs)', price: 1499, mrp: 1999, stock: 80, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80', publicId: 'seed/alphonso-mango-hapus-1' },
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/alphonso-mango-hapus-2' }
    ]
  },
  {
    name: 'Kesar Mango',
    slug: 'kesar-mango',
    categorySlug: 'mangoes',
    description: 'The Queen of Mangoes — Kesar variety with brilliant orange pulp, intense sweetness, and a captivating fragrance. Grown in Gujarat-style cultivation on our farm.',
    keyPoints: ['Vibrant orange pulp', 'Intensely sweet & aromatic', 'Perfect for desserts & lassi', 'Naturally ripened'],
    tags: ['kesar', 'sweet', 'aromatic', 'dessert'],
    storageTips: 'Ripen at room temperature. Press gently — when slightly soft, it is ready to eat.',
    badge: 'Popular',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 kg (4-5 pcs)', price: 279, mrp: 349, stock: 180, isAvailable: true },
      { weight: '2 kg (8-10 pcs)', price: 529, mrp: 649, stock: 120, isAvailable: true },
      { weight: '5 kg (20-24 pcs)', price: 1199, mrp: 1499, stock: 60, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/kesar-mango-1' },
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/kesar-mango-2' }
    ]
  },
  {
    name: 'Banganapalli Mango',
    slug: 'banganapalli-mango',
    categorySlug: 'mangoes',
    description: 'Large golden Banganapalli — South India\'s most popular table mango. Thin skin, fibreless flesh, and a mild sweetness that the whole family loves.',
    keyPoints: ['Large size, thin skin', 'Completely fibreless', 'Mild & universally loved', 'Great for kids'],
    tags: ['banganapalli', 'table-mango', 'fibreless', 'family'],
    storageTips: 'Already semi-ripe on arrival. Eat within 2-3 days. Refrigerate if not consuming immediately.',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 kg (3-4 pcs)', price: 189, mrp: 229, stock: 250, isAvailable: true },
      { weight: '3 kg (9-12 pcs)', price: 529, mrp: 649, stock: 130, isAvailable: true },
      { weight: '5 kg (15-20 pcs)', price: 849, mrp: 1049, stock: 70, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/banganapalli-mango-1' },
      { url: 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&q=80', publicId: 'seed/banganapalli-mango-2' }
    ]
  },
  {
    name: 'Malgova Mango (Salem Special)',
    slug: 'malgova-mango-salem',
    categorySlug: 'mangoes',
    description: 'The legendary Salem Malgova — our farm\'s pride. Thick, creamy pulp with an unmatched richness. A heritage variety that you won\'t find in regular markets.',
    keyPoints: ['Salem heritage variety', 'Extremely thick pulp', 'Creamy & rich', 'Limited seasonal harvest'],
    tags: ['malgova', 'salem', 'heritage', 'creamy'],
    storageTips: 'Ripen at room temperature for 2-3 days. The skin stays green even when ripe — press gently to check.',
    badge: 'Farm Special',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 kg (2-3 pcs)', price: 249, mrp: 299, stock: 100, isAvailable: true },
      { weight: '3 kg (6-9 pcs)', price: 699, mrp: 849, stock: 60, isAvailable: true },
      { weight: '5 kg (10-15 pcs)', price: 1099, mrp: 1349, stock: 30, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&q=80', publicId: 'seed/malgova-mango-salem-1' },
      { url: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=800&q=80', publicId: 'seed/malgova-mango-salem-2' }
    ]
  },
  {
    name: 'Imam Pasand Mango',
    slug: 'imam-pasand-mango',
    categorySlug: 'mangoes',
    description: 'The Emperor\'s Choice — Imam Pasand with a complex flavor profile of vanilla, honey, and citrus. Creamy texture with minimal fibre. A rare premium variety.',
    keyPoints: ['Complex vanilla-honey notes', 'Creamy minimal-fibre flesh', 'Royal heritage variety', 'Extremely limited stock'],
    tags: ['imam-pasand', 'premium', 'royal', 'rare'],
    storageTips: 'Handle with care — bruises easily. Ripen at room temperature and consume the same day.',
    badge: 'Ultra Premium',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 kg (2-3 pcs)', price: 399, mrp: 499, stock: 60, isAvailable: true },
      { weight: '2 kg (4-6 pcs)', price: 749, mrp: 949, stock: 35, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=800&q=80', publicId: 'seed/imam-pasand-mango-1' },
      { url: 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=80', publicId: 'seed/imam-pasand-mango-2' }
    ]
  },
  {
    name: 'Totapuri Mango',
    slug: 'totapuri-mango',
    categorySlug: 'mangoes',
    description: 'The versatile Totapuri — tangy-sweet with a firm texture. India\'s most exported mango variety. Perfect for pickles, salads, juices, and aam dal.',
    keyPoints: ['Tangy-sweet balance', 'Firm flesh, great for cutting', 'Best for pickles & juice', 'Long shelf life (5-7 days)'],
    tags: ['totapuri', 'tangy', 'pickle', 'juice'],
    storageTips: 'Can be stored at room temperature for up to a week. Stays firm even when ripe.',
    minimumQty: 2,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '2 kg (6-8 pcs)', price: 169, mrp: 219, stock: 300, isAvailable: true },
      { weight: '5 kg (15-20 pcs)', price: 389, mrp: 499, stock: 150, isAvailable: true },
      { weight: '10 kg (30-40 pcs)', price: 699, mrp: 899, stock: 60, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=80', publicId: 'seed/totapuri-mango-1' },
      { url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80', publicId: 'seed/totapuri-mango-2' }
    ]
  },
  {
    name: 'Dasheri Mango',
    slug: 'dasheri-mango',
    categorySlug: 'mangoes',
    description: 'North India\'s beloved Dasheri — thin skin, fibreless flesh, and honey-like sweetness. Consistently delivers that classic mango taste everyone remembers from childhood.',
    keyPoints: ['Honey-sweet flavor', 'Paper-thin skin', 'No fibre at all', 'Childhood nostalgia taste'],
    tags: ['dasheri', 'sweet', 'north-indian', 'classic'],
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '1 kg (5-6 pcs)', price: 199, mrp: 249, stock: 140, isAvailable: true },
      { weight: '3 kg (15-18 pcs)', price: 549, mrp: 699, stock: 80, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80', publicId: 'seed/dasheri-mango-1' },
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/dasheri-mango-2' }
    ]
  },
  {
    name: 'Neelam Mango',
    slug: 'neelam-mango',
    categorySlug: 'mangoes',
    description: 'Late-season Neelam mangoes — small but intensely sweet with a distinctive floral aroma. The last mango of the season. Perfect for juices and milkshakes.',
    keyPoints: ['Intensely sweet', 'Strong floral aroma', 'High pulp-to-seed ratio', 'Last of the season'],
    tags: ['neelam', 'sweet', 'late-season', 'juice'],
    seasonalStatus: 'coming-soon',
    availableFrom: new Date('2026-07-01T00:00:00.000Z'),
    seasonNote: 'Available from July (late season)',
    minimumQty: 2,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '2 kg (12-16 pcs)', price: 179, mrp: 229, stock: 0, isAvailable: true },
      { weight: '5 kg (30-40 pcs)', price: 399, mrp: 499, stock: 0, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/neelam-mango-1' },
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/neelam-mango-2' }
    ]
  },
  {
    name: 'Langra Mango',
    slug: 'langra-mango',
    categorySlug: 'mangoes',
    description: 'The green beauty — Langra mangoes stay green even when fully ripe. Distinctive lemony-sweet flavor with a succulent, melting texture unlike any other variety.',
    keyPoints: ['Stays green when ripe', 'Lemony-sweet unique taste', 'Succulent melting texture', 'Varanasi heritage variety'],
    tags: ['langra', 'green', 'unique', 'varanasi'],
    minimumQty: 2,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '2 kg (8-10 pcs)', price: 229, mrp: 279, stock: 90, isAvailable: true },
      { weight: '5 kg (20-25 pcs)', price: 529, mrp: 649, stock: 45, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/langra-mango-1' },
      { url: 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&q=80', publicId: 'seed/langra-mango-2' }
    ]
  },
  {
    name: 'Rasalu Mango',
    slug: 'rasalu-mango',
    categorySlug: 'mangoes',
    description: 'Juicy Rasalu — Andhra Pradesh\'s favorite sucking mango. Extremely juicy with thin skin you can just squeeze and drink. The most fun mango to eat.',
    keyPoints: ['Extremely juicy', 'Best sucking mango', 'Thin squeezable skin', 'Andhra Pradesh favorite'],
    tags: ['rasalu', 'juicy', 'andhra', 'sucking'],
    minimumQty: 2,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '2 kg (10-12 pcs)', price: 189, mrp: 239, stock: 110, isAvailable: true },
      { weight: '5 kg (25-30 pcs)', price: 439, mrp: 549, stock: 55, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&q=80', publicId: 'seed/rasalu-mango-1' },
      { url: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=800&q=80', publicId: 'seed/rasalu-mango-2' }
    ]
  },
  {
    name: 'Raw Mango (Kairi)',
    slug: 'raw-mango-kairi',
    categorySlug: 'mangoes',
    description: 'Fresh raw green mangoes straight from the tree — crunchy, tangy, and perfect for making traditional pickles, chutneys, panha, and dal mango.',
    keyPoints: ['Farm-fresh green mangoes', 'Perfect for pickle making', 'Great for panha & chutney', 'Tangy & crunchy'],
    tags: ['raw', 'kairi', 'pickle', 'green'],
    minimumQty: 2,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '2 kg', price: 129, mrp: 159, stock: 250, isAvailable: true },
      { weight: '5 kg', price: 289, mrp: 369, stock: 120, isAvailable: true },
      { weight: '10 kg', price: 529, mrp: 679, stock: 50, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1563114773-84221bd62daa?w=800&q=80', publicId: 'seed/raw-mango-kairi-1' },
      { url: 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=80', publicId: 'seed/raw-mango-kairi-2' }
    ]
  },
  {
    name: 'Mango Gift Box (Premium Mixed)',
    slug: 'mango-gift-box-premium',
    categorySlug: 'mangoes',
    description: 'A luxurious gift box with 3 premium varieties — Alphonso, Kesar & Imam Pasand. Beautifully packed in a branded wooden crate with a personal message card.',
    keyPoints: ['3 premium varieties in one box', 'Wooden crate packaging', 'Free gift message card', 'Perfect for corporate gifting'],
    tags: ['gift', 'hamper', 'premium', 'corporate'],
    storageTips: 'Open immediately on delivery. Each variety has different ripening times.',
    badge: 'Gift Special',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '3 kg (Mixed)', price: 999, mrp: 1299, stock: 40, isAvailable: true },
      { weight: '5 kg (Mixed)', price: 1599, mrp: 1999, stock: 25, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1546548970-71785318a17b?w=800&q=80', publicId: 'seed/mango-gift-box-premium-1' },
      { url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80', publicId: 'seed/mango-gift-box-premium-2' }
    ]
  },
  {
    name: 'Mango Pickle (Avakkai)',
    slug: 'mango-pickle-avakkai',
    categorySlug: 'mangoes',
    description: 'Traditional Avakkai mango pickle made with our farm\'s raw mangoes, cold-pressed sesame oil, and hand-ground spices. Aged 30 days for deep, complex flavor.',
    keyPoints: ['Traditional family recipe', 'Cold-pressed sesame oil', 'Aged 30 days', 'No preservatives or colors'],
    tags: ['pickle', 'avakkai', 'traditional', 'homemade'],
    storageTips: 'Keep in dry, cool place. Always use a dry spoon. Shelf life 8+ months.',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '250 g', price: 149, mrp: 179, stock: 150, isAvailable: true },
      { weight: '500 g', price: 279, mrp: 339, stock: 100, isAvailable: true },
      { weight: '1 kg', price: 499, mrp: 619, stock: 60, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=800&q=80', publicId: 'seed/mango-pickle-avakkai-1' },
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/mango-pickle-avakkai-2' }
    ]
  },
  {
    name: 'Mango Pulp (Pure Alphonso)',
    slug: 'mango-pulp-pure-alphonso',
    categorySlug: 'mangoes',
    description: 'Pure Alphonso mango pulp — no sugar, no water, no preservatives. Just 100% mango. Perfect for lassi, ice cream, smoothies, and aam ras.',
    keyPoints: ['100% Alphonso pulp', 'Zero sugar added', 'No preservatives', 'Restaurant quality'],
    tags: ['pulp', 'aam-ras', 'pure', 'dessert'],
    storageTips: 'Refrigerate after opening. Consume within 3 days. Freeze for up to 3 months.',
    badge: 'New',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '500 g', price: 219, mrp: 269, stock: 120, isAvailable: true },
      { weight: '1 kg', price: 399, mrp: 499, stock: 80, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1591073113125-e46713c829ed?w=800&q=80', publicId: 'seed/mango-pulp-pure-alphonso-1' },
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/mango-pulp-pure-alphonso-2' }
    ]
  },
  {
    name: 'Mango Jam (Honey-Sweetened)',
    slug: 'mango-jam-honey',
    categorySlug: 'mangoes',
    description: 'Artisanal mango jam made with ripe Alphonso mangoes and raw honey — zero refined sugar. Thick, chunky, spread-ready. Kids and adults love it on toast.',
    keyPoints: ['No refined sugar', 'Sweetened with raw honey', 'Thick chunky texture', 'Made from fresh Alphonso'],
    tags: ['jam', 'no-sugar', 'honey', 'spread'],
    storageTips: 'Refrigerate after opening. Best consumed within 30 days.',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '200 g', price: 189, mrp: 229, stock: 90, isAvailable: true },
      { weight: '400 g', price: 349, mrp: 429, stock: 55, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80', publicId: 'seed/mango-jam-honey-1' },
      { url: 'https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=800&q=80', publicId: 'seed/mango-jam-honey-2' }
    ]
  },

  // ─────────────────────────────────────────────────────────
  // 🍎 FRESH FRUITS (12 products)
  // ─────────────────────────────────────────────────────────
  {
    name: 'Tender Coconut',
    slug: 'tender-coconut',
    categorySlug: 'fresh-fruits',
    description: 'Freshly harvested tender coconuts from our farm — sweet water and soft malai inside. Nature\'s best hydration drink packed with electrolytes and minerals.',
    keyPoints: ['Harvested same morning', 'Sweet water + soft malai', 'Natural electrolytes', 'Perfect summer cooler'],
    tags: ['coconut', 'hydrating', 'summer', 'fresh'],
    storageTips: 'Best consumed the same day. Keep in shade until ready to drink.',
    badge: 'Farm Fresh',
    minimumQty: 2,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 piece', price: 55, mrp: 75, stock: 100, isAvailable: true },
      { weight: '4 pieces', price: 199, mrp: 260, stock: 50, isAvailable: true },
      { weight: '8 pieces', price: 379, mrp: 480, stock: 25, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?w=800&q=80', publicId: 'seed/tender-coconut-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/tender-coconut-2' }
    ]
  },
  {
    name: 'Banana (Nendran)',
    slug: 'banana-nendran',
    categorySlug: 'fresh-fruits',
    description: 'Premium Kerala Nendran bananas — large, starchy, and incredibly versatile. Make crispy chips, steam with jaggery, fry as bajji, or eat ripe with ghee.',
    keyPoints: ['Kerala Nendran variety', 'Perfect for chips & bajji', 'Rich in potassium & fiber', 'Naturally ripened on farm'],
    tags: ['banana', 'nendran', 'kerala', 'versatile'],
    storageTips: 'Green = chips/cooking. Yellow = eating ripe. Keep at room temperature.',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 kg (3-4 pcs)', price: 69, mrp: 89, stock: 200, isAvailable: true },
      { weight: '2 kg (6-8 pcs)', price: 129, mrp: 169, stock: 120, isAvailable: true },
      { weight: '5 kg (15-20 pcs)', price: 299, mrp: 389, stock: 50, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80', publicId: 'seed/banana-nendran-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/banana-nendran-2' }
    ]
  },
  {
    name: 'Papaya (Red Lady)',
    slug: 'papaya-red-lady',
    categorySlug: 'fresh-fruits',
    description: 'Sweet Red Lady papaya — deep orange flesh loaded with Vitamin C, papain enzymes, and antioxidants. Grown naturally without chemical sprays on our farm.',
    keyPoints: ['Deep orange flesh', 'High Vitamin C', 'Aids digestion (papain enzyme)', 'Chemical-free farming'],
    tags: ['papaya', 'vitamin-c', 'digestive', 'organic'],
    storageTips: 'Ripen at room temperature until skin turns yellow-orange. Refrigerate once cut.',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '1 piece (~1.5 kg)', price: 69, mrp: 89, stock: 80, isAvailable: true },
      { weight: '2 pieces (~3 kg)', price: 129, mrp: 169, stock: 45, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?w=800&q=80', publicId: 'seed/papaya-red-lady-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/papaya-red-lady-2' }
    ]
  },
  {
    name: 'Guava (Pink Flesh)',
    slug: 'guava-pink-flesh',
    categorySlug: 'fresh-fruits',
    description: 'Crisp, aromatic pink guavas — 4x more Vitamin C than oranges. Crunchy exterior, sweet pink interior. The ultimate healthy snack fruit from our orchard.',
    keyPoints: ['4x Vitamin C of oranges', 'Pink sweet flesh', 'Crunchy & aromatic', 'Low calorie superfruit'],
    tags: ['guava', 'vitamin-c', 'snack', 'pink'],
    badge: 'Superfruit',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '500 g (3-4 pcs)', price: 59, mrp: 79, stock: 120, isAvailable: true },
      { weight: '1 kg (6-8 pcs)', price: 109, mrp: 139, stock: 80, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1536511132770-e5058c7e8c46?w=800&q=80', publicId: 'seed/guava-pink-flesh-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/guava-pink-flesh-2' }
    ]
  },
  {
    name: 'Jackfruit (Ripe Bulbs)',
    slug: 'jackfruit-ripe-bulbs',
    categorySlug: 'fresh-fruits',
    description: 'Sweet ripe jackfruit bulbs — cleaned, deseeded, and packed fresh. Nature\'s candy from South India. Rich in fiber, potassium, and B vitamins.',
    keyPoints: ['Pre-cleaned & deseeded', 'Ready to eat', 'Intensely sweet', 'High in fiber & potassium'],
    tags: ['jackfruit', 'sweet', 'ready-to-eat', 'tropical'],
    storageTips: 'Consume within 24 hours. Can be frozen for smoothies and ice cream.',
    badge: 'Seasonal',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '500 g', price: 149, mrp: 189, stock: 60, isAvailable: true },
      { weight: '1 kg', price: 279, mrp: 349, stock: 35, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1504185945330-7a3ca1380535?w=800&q=80', publicId: 'seed/jackfruit-ripe-bulbs-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/jackfruit-ripe-bulbs-2' }
    ]
  },
  {
    name: 'Sapota (Chikoo)',
    slug: 'sapota-chikoo',
    categorySlug: 'fresh-fruits',
    description: 'Sweet, malty sapota with brown sugar-like sweetness and smooth grainy texture. Tree-ripened for maximum sweetness. Perfect for milkshakes and smoothies.',
    keyPoints: ['Tree-ripened', 'Brown sugar sweetness', 'Smooth malty texture', 'Milkshake favorite'],
    tags: ['sapota', 'chikoo', 'sweet', 'milkshake'],
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '500 g (5-6 pcs)', price: 59, mrp: 75, stock: 100, isAvailable: true },
      { weight: '1 kg (10-12 pcs)', price: 109, mrp: 139, stock: 70, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?w=800&q=80', publicId: 'seed/sapota-chikoo-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/sapota-chikoo-2' }
    ]
  },
  {
    name: 'Pomegranate (Bhagwa)',
    slug: 'pomegranate-bhagwa',
    categorySlug: 'fresh-fruits',
    description: 'Premium Bhagwa pomegranates — deep ruby-red arils, soft seeds, and a perfect sweet-tart balance. Packed with antioxidants and heart-healthy polyphenols.',
    keyPoints: ['Deep ruby-red arils', 'Soft edible seeds', 'Antioxidant powerhouse', 'Sweet-tart perfection'],
    tags: ['pomegranate', 'antioxidant', 'bhagwa', 'premium'],
    badge: 'Premium',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '500 g (2 pcs)', price: 129, mrp: 159, stock: 90, isAvailable: true },
      { weight: '1 kg (4 pcs)', price: 239, mrp: 299, stock: 60, isAvailable: true },
      { weight: '2 kg (8 pcs)', price: 449, mrp: 559, stock: 30, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=800&q=80', publicId: 'seed/pomegranate-bhagwa-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/pomegranate-bhagwa-2' }
    ]
  },
  {
    name: 'Sweet Lime (Mosambi)',
    slug: 'sweet-lime-mosambi',
    categorySlug: 'fresh-fruits',
    description: 'Juicy sweet limes — mild citrus flavor, incredibly refreshing as fresh juice. Gentle on the stomach and loaded with Vitamin C for immunity.',
    keyPoints: ['Extremely juicy', 'Mild & easy to digest', 'Perfect for fresh juice', 'Immunity booster'],
    tags: ['mosambi', 'citrus', 'juice', 'vitamin-c'],
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '1 kg (5-6 pcs)', price: 69, mrp: 89, stock: 130, isAvailable: true },
      { weight: '2 kg (10-12 pcs)', price: 129, mrp: 169, stock: 80, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?w=800&q=80', publicId: 'seed/sweet-lime-mosambi-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/sweet-lime-mosambi-2' }
    ]
  },
  {
    name: 'Watermelon (Seedless)',
    slug: 'watermelon-seedless',
    categorySlug: 'fresh-fruits',
    description: 'Juicy seedless watermelon — deep red flesh, crisp texture, and naturally sweet. The ultimate summer fruit. 92% water for natural hydration.',
    keyPoints: ['Seedless variety', 'Deep red & crisp', '92% natural hydration', 'Naturally sweet'],
    tags: ['watermelon', 'seedless', 'summer', 'hydrating'],
    storageTips: 'Keep whole at room temperature. Once cut, refrigerate and consume within 2 days.',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 piece (~3 kg)', price: 99, mrp: 129, stock: 60, isAvailable: true },
      { weight: '1 piece (~5 kg)', price: 149, mrp: 189, stock: 40, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=800&q=80', publicId: 'seed/watermelon-seedless-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/watermelon-seedless-2' }
    ]
  },
  {
    name: 'Dragon Fruit (Pink)',
    slug: 'dragon-fruit-pink',
    categorySlug: 'fresh-fruits',
    description: 'Exotic pink dragon fruit grown on our farm — vibrant magenta flesh with tiny black seeds. Mild sweet taste, stunning appearance. Rich in antioxidants and fiber.',
    keyPoints: ['Vibrant magenta flesh', 'Farm-grown exotic', 'Rich in antioxidants', 'Instagram-worthy appearance'],
    tags: ['dragon-fruit', 'exotic', 'antioxidant', 'trendy'],
    badge: 'Exotic',
    minimumQty: 1,
    isFeatured: true,
    isActive: true,
    variants: [
      { weight: '1 piece (~350g)', price: 89, mrp: 119, stock: 70, isAvailable: true },
      { weight: '3 pieces (~1 kg)', price: 249, mrp: 319, stock: 40, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1527325678964-54921661f888?w=800&q=80', publicId: 'seed/dragon-fruit-pink-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/dragon-fruit-pink-2' }
    ]
  },
  {
    name: 'Passion Fruit',
    slug: 'passion-fruit',
    categorySlug: 'fresh-fruits',
    description: 'Tangy-sweet passion fruit from our vines — burst it open for intensely aromatic pulp full of crunchy seeds. Perfect for juices, desserts, and cocktails.',
    keyPoints: ['Intensely aromatic pulp', 'Tangy-sweet unique flavor', 'Great for juice & desserts', 'Grown on our farm vines'],
    tags: ['passion-fruit', 'exotic', 'tangy', 'aromatic'],
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    variants: [
      { weight: '250 g (4-5 pcs)', price: 99, mrp: 129, stock: 60, isAvailable: true },
      { weight: '500 g (8-10 pcs)', price: 179, mrp: 229, stock: 35, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1604495772376-9657f0035eb5?w=800&q=80', publicId: 'seed/passion-fruit-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/passion-fruit-2' }
    ]
  },
  {
    name: 'Custard Apple (Sitaphal)',
    slug: 'custard-apple-sitaphal',
    categorySlug: 'fresh-fruits',
    description: 'Creamy custard apple — break open the bumpy green shell for the sweetest, creamiest white flesh. Tastes like natural vanilla ice cream. A true seasonal treat.',
    keyPoints: ['Natural vanilla-cream taste', 'Extremely creamy', 'Seasonal delicacy', 'Rich in Vitamin B6'],
    tags: ['custard-apple', 'sitaphal', 'creamy', 'seasonal'],
    badge: 'Seasonal',
    minimumQty: 1,
    isFeatured: false,
    isActive: true,
    seasonalStatus: 'available',
    variants: [
      { weight: '500 g (3-4 pcs)', price: 99, mrp: 129, stock: 55, isAvailable: true },
      { weight: '1 kg (6-8 pcs)', price: 179, mrp: 229, stock: 30, isAvailable: true }
    ],
    images: [
      { url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80', publicId: 'seed/custard-apple-sitaphal-1' },
      { url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80', publicId: 'seed/custard-apple-sitaphal-2' }
    ]
  }
]

// ══════════════════════════════════════════════════════════════
// COUPONS
// ══════════════════════════════════════════════════════════════

const SEED_COUPONS: SeedCoupon[] = [
  { code: 'WELCOME20', type: 'percent', value: 20, minOrderAmount: 500, maxDiscount: 200, usageLimit: 1000, perUserLimit: 1, isActive: true, validFrom: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 86400000 * 60) },
  { code: 'MANGO10', type: 'percent', value: 10, minOrderAmount: 300, maxDiscount: 150, usageLimit: 2000, perUserLimit: 2, isActive: true, validFrom: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 86400000 * 90) },
  { code: 'SUMMER25', type: 'percent', value: 25, minOrderAmount: 1000, maxDiscount: 400, usageLimit: 500, perUserLimit: 1, isActive: true, validFrom: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 86400000 * 30) },
  { code: 'FREESHIP', type: 'delivery', value: 150, minOrderAmount: 800, usageLimit: 500, perUserLimit: 2, isActive: true, validFrom: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 86400000 * 45) },
  { code: 'FLAT150', type: 'flat', value: 150, minOrderAmount: 1500, usageLimit: 200, perUserLimit: 1, isActive: true, validFrom: new Date(Date.now() - 86400000), expiresAt: new Date(Date.now() + 86400000 * 30) }
]

// ══════════════════════════════════════════════════════════════
// PINCODES
// ══════════════════════════════════════════════════════════════

const SEED_PINCODES: SeedPincode[] = [
  { pincode: '636001', city: 'Salem', state: 'Tamil Nadu', zone: 'tamil-nadu', deliveryFee: 0, estimatedDays: 'Same day / Next day', isActive: true },
  { pincode: '636002', city: 'Salem', state: 'Tamil Nadu', zone: 'tamil-nadu', deliveryFee: 0, estimatedDays: 'Same day / Next day', isActive: true },
  { pincode: '639001', city: 'Karur', state: 'Tamil Nadu', zone: 'tamil-nadu', deliveryFee: 0, estimatedDays: '1-2 days', isActive: true },
  { pincode: '639002', city: 'Karur', state: 'Tamil Nadu', zone: 'tamil-nadu', deliveryFee: 0, estimatedDays: '1-2 days', isActive: true },
  { pincode: '641001', city: 'Coimbatore', state: 'Tamil Nadu', zone: 'south-india', deliveryFee: 50, estimatedDays: '2-3 days', isActive: true },
  { pincode: '600001', city: 'Chennai', state: 'Tamil Nadu', zone: 'south-india', deliveryFee: 75, estimatedDays: '2-3 days', isActive: true },
  { pincode: '600028', city: 'Chennai', state: 'Tamil Nadu', zone: 'south-india', deliveryFee: 75, estimatedDays: '2-3 days', isActive: true },
  { pincode: '625001', city: 'Madurai', state: 'Tamil Nadu', zone: 'south-india', deliveryFee: 50, estimatedDays: '2-3 days', isActive: true },
  { pincode: '560001', city: 'Bengaluru', state: 'Karnataka', zone: 'south-india', deliveryFee: 80, estimatedDays: '2-3 days', isActive: true },
  { pincode: '500001', city: 'Hyderabad', state: 'Telangana', zone: 'south-india', deliveryFee: 100, estimatedDays: '3-4 days', isActive: true },
  { pincode: '682001', city: 'Kochi', state: 'Kerala', zone: 'south-india', deliveryFee: 90, estimatedDays: '3-4 days', isActive: true },
  { pincode: '110001', city: 'New Delhi', state: 'Delhi', zone: 'rest-india', deliveryFee: 150, estimatedDays: '4-5 days', isActive: true },
  { pincode: '400001', city: 'Mumbai', state: 'Maharashtra', zone: 'rest-india', deliveryFee: 130, estimatedDays: '3-4 days', isActive: true },
  { pincode: '700001', city: 'Kolkata', state: 'West Bengal', zone: 'rest-india', deliveryFee: 170, estimatedDays: '5-6 days', isActive: true },
  { pincode: '380001', city: 'Ahmedabad', state: 'Gujarat', zone: 'rest-india', deliveryFee: 140, estimatedDays: '4-5 days', isActive: true },
]

// ══════════════════════════════════════════════════════════════
// BUSINESS HOURS & USERS
// ══════════════════════════════════════════════════════════════

const SEED_BUSINESS_HOURS: SeedBusinessHours[] = [
  { day: 'monday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'tuesday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'wednesday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'thursday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'friday', isOpen: true, openTime: '08:00', closeTime: '20:00', pickupOpenTime: '07:00', pickupCloseTime: '18:00' },
  { day: 'saturday', isOpen: true, openTime: '07:00', closeTime: '21:00', pickupOpenTime: '06:00', pickupCloseTime: '19:00' },
  { day: 'sunday', isOpen: false, openTime: '00:00', closeTime: '00:00', pickupOpenTime: '00:00', pickupCloseTime: '00:00' }
]

let seedAdminCredentials: { email: string; password: string } | undefined

type SeedBulkEnquiry = { name: string; phone: string; email?: string; company?: string; variety: string; quantity: string; city: string; requiredBy?: string; message?: string; status: 'New' | 'Contacted' | 'Converted' | 'Closed' }

const SEED_BULK_ENQUIRIES: SeedBulkEnquiry[] = [
  { name: 'Sonal Raj', phone: '9111111111', email: 'sonal.raj@freshstore.com', company: 'FreshStore Pvt Ltd', variety: 'Alphonso Mango', quantity: '500 kg', city: 'Bengaluru', requiredBy: new Date(Date.now() + 86400000 * 30).toISOString(), message: 'Need carton packaging and same-week delivery.', status: 'Contacted' },
  { name: 'Karthik Rao', phone: '9222222222', company: 'Catering World', variety: 'Totapuri Mango', quantity: '200 kg', city: 'Chennai', requiredBy: new Date(Date.now() + 86400000 * 10).toISOString(), message: 'Daily supply for catering.', status: 'New' },
  { name: 'Meena Iyer', phone: '9333333333', email: 'meena@giftsolutions.in', company: 'Gift Solutions India', variety: 'Premium Gift Hamper', quantity: '100 boxes', city: 'Mumbai', requiredBy: new Date(Date.now() + 86400000 * 20).toISOString(), message: 'Corporate gifting with custom branding.', status: 'New' }
]

// ══════════════════════════════════════════════════════════════
// SEED EXECUTION
// ══════════════════════════════════════════════════════════════

const fail = (message: string): never => { throw new SeedSafetyError(message) }

const printSafetyBanner = () => {
  if (!(hasForce && hasClear)) return
  console.log('============================================')
  console.log('⚠️  CLEARING SEEDED BUSINESS AND CUSTOMER DATA')
  console.log(`   Database : ${config.dbName}`)
  console.log(`   Environment : ${config.nodeEnv}`)
  console.log('============================================')
}

const assertSeedPolicyForRuntime = () => {
  try {
    assertSeedPolicy({
      nodeEnv: config.nodeEnv,
      enableSeed: config.enableSeed,
      hasForce,
      hasAllowProd: args.has('--allow-prod')
    })
    seedAdminCredentials = assertSeedAdminCredentials({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

const hasExistingData = async (): Promise<boolean> => {
  const counts = await Promise.all([
    Category.countDocuments(), Product.countDocuments(), Coupon.countDocuments(),
    Pincode.countDocuments(), BusinessHours.countDocuments(), Order.countDocuments(),
    PaymentTransaction.countDocuments(), PaymentWebhookEvent.countDocuments(),
    StockLog.countDocuments(), Complaint.countDocuments(), BulkEnquiry.countDocuments(),
    NotifyMe.countDocuments(), User.countDocuments()
  ])
  return counts.some((c) => c > 0)
}

const clearCollections = async () => {
  await Promise.all([
    Product.deleteMany({}), Category.deleteMany({}), Coupon.deleteMany({}),
    Pincode.deleteMany({}), BusinessHours.deleteMany({}), Order.deleteMany({}),
    PaymentTransaction.deleteMany({}), PaymentWebhookEvent.deleteMany({}),
    StockLog.deleteMany({}), Complaint.deleteMany({}), BulkEnquiry.deleteMany({}),
    NotifyMe.deleteMany({}),
    User.deleteMany({ role: 'customer' })
  ])
}

const upsertCategories = async (): Promise<Map<string, string>> => {
  for (const c of SEED_CATEGORIES) {
    await Category.updateOne({ slug: c.slug }, { $setOnInsert: c }, { upsert: true })
  }
  const cats = await Category.find({ slug: { $in: SEED_CATEGORIES.map((c) => c.slug) } }, { slug: 1 })
  const map = new Map<string, string>()
  for (const cat of cats) map.set(cat.slug, String(cat._id))
  return map
}

const upsertProducts = async (catMap: Map<string, string>): Promise<void> => {
  for (const p of SEED_PRODUCTS) {
    const categoryId = catMap.get(p.categorySlug)
    if (!categoryId) fail(`Missing category: ${p.categorySlug}`)
    await Product.updateOne(
      { slug: p.slug },
      { $setOnInsert: {
        name: p.name, slug: p.slug, category: categoryId, description: p.description,
        keyPoints: p.keyPoints, tags: p.tags, storageTips: p.storageTips,
        productTerms: p.productTerms, badge: p.badge, minimumQty: p.minimumQty,
        isFeatured: p.isFeatured, isActive: p.isActive, seasonalStatus: p.seasonalStatus,
        availableFrom: p.availableFrom, seasonNote: p.seasonNote,
        variants: p.variants, images: p.images, seo: p.seo
      } },
      { upsert: true }
    )
  }
}

const upsertCoupons = async (): Promise<void> => {
  for (const c of SEED_COUPONS) await Coupon.updateOne({ code: c.code }, { $setOnInsert: c }, { upsert: true })
}

const upsertPincodes = async (): Promise<void> => {
  for (const p of SEED_PINCODES) await Pincode.updateOne({ pincode: p.pincode }, { $setOnInsert: p }, { upsert: true })
}

const upsertBusinessHours = async (): Promise<void> => {
  for (const h of SEED_BUSINESS_HOURS) await BusinessHours.updateOne({ day: h.day }, { $setOnInsert: h }, { upsert: true })
}

const upsertSeedAdmin = async (): Promise<void> => {
  if (!seedAdminCredentials) throw new Error('Seed administrator credentials were not validated.')
  const existingUser = await User.findOne({ email: seedAdminCredentials.email })
  if (existingUser) {
    if (existingUser.role !== 'admin') {
      throw new Error('SEED_ADMIN_EMAIL is already assigned to a non-admin account.')
    }
    return
  }
  await User.create({
    name: 'Store Administrator',
    email: seedAdminCredentials.email,
    password: seedAdminCredentials.password,
    role: 'admin'
  })
}

const upsertBulkEnquiries = async (): Promise<void> => {
  for (const e of SEED_BULK_ENQUIRIES) {
    await BulkEnquiry.updateOne(
      { phone: e.phone, variety: e.variety },
      { $setOnInsert: e },
      { upsert: true }
    )
  }
}

const run = async (): Promise<void> => {
  try {
    assertSeedPolicyForRuntime()
    await connectDatabase()

    const existing = await hasExistingData()
    if (existing && !hasClear) fail('Database has data. Use --clear to wipe and re-seed.')
    if (existing && hasClear) { printSafetyBanner(); await clearCollections() }

    const categories = await upsertCategories()
    await upsertProducts(categories)
    await upsertCoupons()
    await upsertPincodes()
    await upsertBusinessHours()
    await upsertSeedAdmin()
    await upsertBulkEnquiries()

    const mangoCount = SEED_PRODUCTS.filter(p => p.categorySlug === 'mangoes').length
    const fruitCount = SEED_PRODUCTS.filter(p => p.categorySlug === 'fresh-fruits').length

    logger.info('Seed completed', { products: SEED_PRODUCTS.length, categories: SEED_CATEGORIES.length })
    console.log('')
    console.log('✅ Seed completed!')
    console.log(`   🥭 Mangoes: ${mangoCount} products`)
    console.log(`   🍎 Fresh Fruits: ${fruitCount} products`)
    console.log(`   📦 Total: ${SEED_PRODUCTS.length} products`)
    console.log(`   🏷️  ${SEED_COUPONS.length} coupons · 📍 ${SEED_PINCODES.length} pincodes`)
    console.log('')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Seed failed', { message })
    console.error(message)
    throw error
  } finally {
    await disconnectDatabase()
  }
}

run().then(() => process.exit(0)).catch(() => process.exit(1))
