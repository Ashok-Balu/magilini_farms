import { z } from 'zod'
import { weightToKg } from '../utils/weight.js'

const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits')
const emailSchema = z.string().email('Email format is invalid')
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'A valid MongoDB ID is required')
const numericInput = z.union([
  z.number().finite(),
  z.string().trim().regex(/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i)
]).transform(Number).refine(Number.isFinite, 'Must be a finite number')
const moneyInput = numericInput.refine(value => Number.isSafeInteger(Math.round(value * 100)), 'Must be a valid amount with at most two decimal places')
const positiveInteger = numericInput.refine(value => Number.isSafeInteger(value) && value > 0, 'Must be a positive integer')
const nonNegativeInteger = numericInput.refine(value => Number.isSafeInteger(value) && value >= 0, 'Must be a non-negative integer')
const dateInput = z.string().trim().refine(value => {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  if (!dateOnly && !timestamp) return false
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) && (!dateOnly || parsed.toISOString().slice(0, 10) === value)
}, 'Must be a valid date')
const calendarDateInput = z.string().trim().refine(value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}, 'Must be a valid YYYY-MM-DD date')
const couponStartDate = dateInput.transform(value => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T00:00:00.000+05:30`)
  : new Date(value))
const couponEndDate = dateInput.transform(value => /^\d{4}-\d{2}-\d{2}$/.test(value)
  ? new Date(`${value}T23:59:59.999+05:30`)
  : new Date(value))
const jsonArray = (schema, message) => z.union([
  z.string().transform((value, ctx) => {
    try {
      return JSON.parse(value)
    } catch {
      ctx.addIssue({ code: 'custom', message })
      return z.NEVER
    }
  }),
  z.array(z.unknown())
]).pipe(z.array(schema))
const booleanInput = z.union([
  z.boolean(),
  z.enum(['true', 'false']).transform(value => value === 'true')
])

export const idParamsSchema = z.object({
  params: z.object({ id: objectIdSchema })
})

export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000, 'Page must be between 1 and 100000'),
    limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 100 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100, 'Limit must be between 1 and 100')
  }).passthrough()
})

export const authRegisterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
    phone: phoneSchema.optional().or(z.literal(''))
  })
})

export const authLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
  })
})

export const authForgotPasswordSchema = z.object({
  body: z.object({
    email: emailSchema
  })
})

export const authResetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordSchema
  })
})

export const customerProfileUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: emailSchema.optional(),
    phone: phoneSchema.optional().or(z.literal(''))
  })
})

export const addressSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    phone: phoneSchema,
    line1: z.string().trim().min(1, 'Address line 1 is required'),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(1, 'City is required'),
    district: z.string().trim().optional(),
    state: z.string().trim().min(1, 'State is required'),
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit Indian PIN code'),
    landmark: z.string().trim().optional(),
    type: z.enum(['home', 'office', 'other']).optional(),
    isDefault: z.boolean().optional()
  })
})

export const adminLoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
})

export const paymentCreateOrderSchema = z.object({
  body: z.object({
    orderId: objectIdSchema
  })
})

export const paymentVerifySchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    orderId: objectIdSchema
  })
})

export const paymentConfirmUpiSchema = z.object({
  body: z.object({
    orderId: objectIdSchema,
    upiRef: z.string().min(1).optional()
  })
})

export const paymentSubmitUpiReferenceSchema = z.object({
  body: z.object({
    orderId: objectIdSchema,
    upiRef: z.string().trim().min(6).max(50).regex(/^[a-zA-Z0-9-]+$/)
  })
})

export const couponApplySchema = z.object({
  body: z.object({
    code: z.string().trim().min(1).max(64),
    subtotal: moneyInput.refine(value => value >= 0, 'Subtotal cannot be negative')
  })
})

export const pincodeCheckSchema = z.object({
  params: z.object({
    pin: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit Indian PIN code')
  })
})

const variantFields = z.object({
  weight: z.string().trim().min(1, 'Variant weight is required').max(60)
    .refine(value => weightToKg(value) > 0, 'Variant weight must include a positive amount and an explicit g or kg unit'),
  price: moneyInput.refine((v) => v > 0, 'Price must be greater than zero'),
  mrp: moneyInput.refine((v) => v > 0, 'MRP must be greater than zero'),
  stock: nonNegativeInteger.default(0),
  isAvailable: booleanInput.optional(),
  _id: objectIdSchema.optional(),
  _initialStock: nonNegativeInteger.optional()
})
const withValidMrp = schema => schema.refine(variant => variant.mrp >= variant.price, 'MRP must be at least the selling price')
const variantSchema = withValidMrp(variantFields)
const newVariantSchema = withValidMrp(variantFields.omit({ _id: true, _initialStock: true }))

export const adminProductCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Product name is required').max(120),
    category: objectIdSchema,
    description: z.string().trim().min(1, 'Description is required').max(10000),
    keyPoints: jsonArray(z.string().trim().min(1).max(200), 'Key points must be valid JSON').optional(),
    storageTips: z.string().max(2000).optional(),
    productTerms: z.string().max(2000).optional(),
    tags: jsonArray(z.string().trim().min(1).max(50), 'Tags must be valid JSON').optional(),
    badge: z.string().max(60).optional(),
    minimumQty: positiveInteger.optional(),
    variants: jsonArray(newVariantSchema, 'Variants must be valid JSON')
      .refine(value => value.length >= 1 && value.length <= 50, 'Provide between 1 and 50 variants'),
    isFeatured: booleanInput.optional(),
    isActive: booleanInput.optional(),
    seasonalStatus: z.enum(['available', 'off-season', 'coming-soon']).optional(),
    availableFrom: z.union([calendarDateInput, z.literal('')]).optional(),
    seasonNote: z.string().max(500).optional(),
    seo: z.string().transform((value, ctx) => {
      try {
        return JSON.parse(value)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'SEO data must be valid JSON' })
        return z.NEVER
      }
    }).pipe(z.object({
      metaTitle: z.string().max(70).optional(),
      metaDescription: z.string().max(200).optional()
    })).optional()
  })
})

export const adminProductStockSchema = z.object({
  body: z.object({
    variantId: objectIdSchema,
    stock: nonNegativeInteger,
    note: z.string().trim().max(500).optional()
  })
})

export const productSeasonalSchema = z.object({
  body: z.object({
    seasonalStatus: z.enum(['available', 'off-season', 'coming-soon']),
    availableFrom: z.union([calendarDateInput, z.literal('')]).optional(),
    seasonNote: z.string().max(500).optional()
  })
})

export const adminProductUpdateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    category: objectIdSchema.optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    keyPoints: jsonArray(z.string().trim().min(1).max(200), 'Key points must be valid JSON').optional(),
    storageTips: z.string().max(2000).optional(),
    productTerms: z.string().max(2000).optional(),
    tags: jsonArray(z.string().trim().min(1).max(50), 'Tags must be valid JSON').optional(),
    badge: z.string().max(60).optional(),
    minimumQty: positiveInteger.optional(),
    variants: jsonArray(variantSchema, 'Variants must be valid JSON')
      .refine(value => value.length >= 1 && value.length <= 50, 'Provide between 1 and 50 variants').optional(),
    isFeatured: booleanInput.optional(),
    isActive: booleanInput.optional(),
    seasonalStatus: z.enum(['available', 'off-season', 'coming-soon']).optional(),
    availableFrom: z.union([calendarDateInput, z.literal('')]).optional(),
    seasonNote: z.string().max(500).optional(),
    seo: z.string().transform((value, ctx) => {
      try {
        return JSON.parse(value)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'SEO data must be valid JSON' })
        return z.NEVER
      }
    }).pipe(z.object({
      metaTitle: z.string().max(70).optional(),
      metaDescription: z.string().max(200).optional()
    })).optional(),
    existingImages: z.string().transform((value, ctx) => {
      try {
        return JSON.parse(value)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Existing images must be valid JSON' })
        return z.NEVER
      }
    }).pipe(z.array(z.object({
      url: z.string().url(),
      publicId: z.string().min(1).max(255)
    })).max(5)).optional()
  }).refine(body => Object.keys(body).length > 0, 'At least one product field is required')
})

export const adminPincodeSchema = z.object({
  body: z.object({
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit Indian PIN code'),
    city: z.string().trim().min(1),
    district: z.string().trim().optional(),
    state: z.string().trim().min(1),
    zone: z.enum(['tamil-nadu', 'south-india', 'rest-india']),
    deliveryFee: moneyInput.refine(value => value >= 0, 'Delivery fee cannot be negative'),
    estimatedDays: z.string().trim().min(1).max(40),
    isServiceable: z.boolean().optional(),
    reason: z.string().trim().optional(),
    priority: nonNegativeInteger.optional(),
    isActive: z.boolean().optional()
  })
})

export const adminCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
    type: z.enum(['percent', 'flat', 'delivery']),
    value: moneyInput.refine(value => value > 0, 'Coupon value must be positive'),
    minOrderAmount: moneyInput.refine(value => value >= 0, 'Minimum order amount cannot be negative').optional(),
    maxDiscount: moneyInput.refine(value => value > 0, 'Maximum discount must be positive').optional(),
    usageLimit: positiveInteger.optional(),
    perUserLimit: positiveInteger.optional(),
    validFrom: couponStartDate.optional(),
    expiresAt: couponEndDate.optional(),
    isActive: booleanInput.optional()
  }).superRefine((coupon, ctx) => {
    if (coupon.type === 'percent' && coupon.value > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percentage coupon cannot exceed 100%' })
    }
    if (coupon.validFrom && coupon.expiresAt && new Date(coupon.expiresAt) <= new Date(coupon.validFrom)) {
      ctx.addIssue({ code: 'custom', path: ['expiresAt'], message: 'Expiry must be after the start date' })
    }
  })
})

const deliveryAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
  landmark: z.string().trim().max(200).optional()
})

export const orderCreateSchema = z.object({
  body: z.object({
    deliveryType: z.enum(['home', 'pickup']),
    deliveryAddress: deliveryAddressSchema.optional(),
    pickupDate: calendarDateInput.optional(),
    items: z.array(z.object({
      productId: objectIdSchema,
      variantId: objectIdSchema,
      qty: positiveInteger.refine(value => value <= 10000, 'Quantity cannot exceed 10000')
    })).min(1).max(100),
    packaging: z.enum(['standard', 'gift']).optional(),
    giftMessage: z.string().max(100).optional(),
    orderNotes: z.string().max(200).optional(),
    preferredDeliveryDate: calendarDateInput.optional(),
    couponCode: z.string().trim().max(64).optional(),
    paymentMethod: z.enum(['razorpay-upi', 'razorpay-card', 'razorpay-nb', 'direct-upi', 'pay-at-farm'])
  }).superRefine((order, ctx) => {
    if (order.deliveryType === 'home' && !order.deliveryAddress) {
      ctx.addIssue({ code: 'custom', path: ['deliveryAddress'], message: 'Delivery address is required for home delivery' })
    }
    if (order.deliveryType === 'pickup' && !order.pickupDate) {
      ctx.addIssue({ code: 'custom', path: ['pickupDate'], message: 'Pickup date is required for farm pickup' })
    }
    if (order.paymentMethod === 'pay-at-farm' && order.deliveryType !== 'pickup') {
      ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Pay at farm is available only for farm pickup' })
    }
  })
})

export const cancelOrderSchema = z.object({
  body: z.object({ reason: z.string().trim().max(200).optional() })
})

export const orderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Pickup-Ready', 'Pickup Ready', 'Picked-Up']),
    note: z.string().trim().max(500).optional(),
    courierName: z.string().trim().max(100).optional(),
    courierTracking: z.string().trim().max(200).optional()
  })
})

export const orderPaymentSchema = z.object({
  body: z.object({
    utrNumber: z.string().trim().min(6).max(50).regex(/^[a-zA-Z0-9-]+$/).optional(),
    note: z.string().trim().max(500).optional()
  })
})

export const refundSchema = z.object({
  body: z.object({
    refundId: z.string().trim().max(100).optional(),
    providerPaymentId: z.string().trim().max(100).optional(),
    refundReference: z.string().trim().max(100).optional()
  })
})

export const complaintSchema = z.object({
  body: z.object({
    orderId: z.string().trim().min(1).max(64),
    deliveryDate: calendarDateInput,
    description: z.string().trim().min(1).max(3000),
    phone: phoneSchema.optional()
  })
})

export const bulkEnquirySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    phone: phoneSchema,
    email: emailSchema.optional().or(z.literal('')),
    company: z.string().trim().max(120).optional(),
    variety: z.string().trim().min(1).max(120),
    quantity: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
    requiredBy: calendarDateInput.optional(),
    message: z.string().trim().max(2000).optional()
  })
})

export const notifyMeSchema = z.object({
  body: z.object({ phone: phoneSchema, productId: objectIdSchema })
})

export const adminNotifySchema = z.object({
  body: z.object({ productId: objectIdSchema })
})

export const complaintUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['New', 'Reviewing', 'Resolved', 'Rejected']).optional(),
    adminNote: z.string().trim().max(1000).optional()
  }).refine(body => Object.keys(body).length > 0, 'At least one complaint field is required')
})

export const bulkEnquiryUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['New', 'Contacted', 'Converted', 'Closed']).optional()
  }).refine(body => Object.keys(body).length > 0, 'Status is required')
})

export const categorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    emoji: z.string().max(16).optional(),
    image: z.string().url().max(1000).optional().or(z.literal('')),
    isActive: booleanInput.optional(),
    sortOrder: nonNegativeInteger.optional()
  })
})

export const categoryUpdateSchema = z.object({
  body: categorySchema.shape.body.partial().refine(body => Object.keys(body).length > 0, 'At least one category field is required')
})

const businessHourSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  isOpen: booleanInput.optional(),
  openTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  closeTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  pickupOpenTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional(),
  pickupCloseTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).optional()
})

export const businessHoursSchema = z.object({
  body: z.object({ hours: z.array(businessHourSchema).min(1).max(7) }).superRefine(({ hours }, ctx) => {
    const days = hours.map(hour => hour.day)
    if (new Set(days).size !== days.length) {
      ctx.addIssue({ code: 'custom', path: ['hours'], message: 'Each day may be configured only once per request' })
    }
  })
})

export const publicReviewSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    location: z.string().trim().max(100).optional(),
    rating: positiveInteger.refine(value => value <= 5, 'Rating cannot exceed 5'),
    title: z.string().trim().max(150).optional(),
    comment: z.string().trim().min(1).max(3000)
  })
})

export const adminReviewCreateSchema = z.object({
  body: z.object({
    productId: objectIdSchema,
    name: z.string().trim().min(1).max(100),
    rating: positiveInteger.refine(value => value <= 5, 'Rating cannot exceed 5'),
    title: z.string().trim().max(150).optional(),
    comment: z.string().trim().min(1).max(3000),
    isVerifiedPurchase: booleanInput.optional()
  })
})

export const adminReviewUpdateSchema = z.object({
  body: z.object({
    isApproved: booleanInput.optional(),
    adminReply: z.string().trim().max(2000).optional()
  }).refine(body => Object.keys(body).length > 0, 'At least one review field is required')
})

const pageLimit = {
  page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
    .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000),
  limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 50 : Number(value))
    .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100)
}

export const notificationListQuerySchema = z.object({
  query: z.object({
    ...pageLimit,
    status: z.enum(['pending', 'sending', 'delivered', 'failed', 'simulated']).optional()
  })
})

export const auditLogListQuerySchema = z.object({
  query: z.object({
    ...pageLimit,
    action: z.string().trim().max(100).optional()
  })
})

export const reviewListQuerySchema = z.object({
  query: z.object({
    ...pageLimit,
    productId: objectIdSchema.optional(),
    approved: z.enum(['true', 'false']).optional()
  })
})

export const stockLogListQuerySchema = z.object({
  query: z.object({
    ...pageLimit,
    productId: objectIdSchema.optional()
  })
})

export const notifySubscriberListQuerySchema = z.object({
  query: z.object({ ...pageLimit, productId: objectIdSchema.optional() })
})

export const customerListQuerySchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000),
    limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 20 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100),
    search: z.string().trim().max(100).optional()
  })
})

export const customerBlockSchema = z.object({
  body: z.object({ isBlocked: z.boolean() })
})
export const productListQuerySchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000),
    limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 20 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100),
    category: z.string().max(120).optional(),
    search: z.string().trim().max(100).optional(),
    sort: z.enum(['price_asc', 'price_desc', 'newest', 'featured']).optional(),
    seasonal: z.enum(['available', 'off-season', 'coming-soon']).optional(),
    featured: z.enum(['true', 'false']).optional(),
    minPrice: numericInput.refine(value => value >= 0).optional(),
    maxPrice: numericInput.refine(value => value >= 0).optional()
  }).passthrough().superRefine((query, ctx) => {
    if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) {
      ctx.addIssue({ code: 'custom', path: ['maxPrice'], message: 'Maximum price must be at least the minimum price' })
    }
  })
})

export const adminProductListQuerySchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000),
    limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 20 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100),
    search: z.string().trim().max(100).optional(),
    category: z.string().max(120).optional(),
    stock: z.enum(['low', 'out']).optional(),
    seasonalStatus: z.enum(['available', 'off-season', 'coming-soon']).optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).passthrough()
})

export const adminOrderListQuerySchema = z.object({
  query: z.object({
    page: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 1 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100000),
    limit: z.union([z.string(), z.number()]).optional().transform(value => value === undefined ? 20 : Number(value))
      .refine(value => Number.isSafeInteger(value) && value >= 1 && value <= 100),
    status: z.enum(['New', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Pickup-Ready', 'Pickup Ready', 'Picked-Up']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refund_pending', 'refunded', 'refund_failed']).optional(),
    deliveryType: z.enum(['home', 'pickup']).optional(),
    search: z.string().trim().max(100).optional(),
    customerName: z.string().trim().max(100).optional(),
    phone: phoneSchema.optional(),
    orderNumber: z.string().trim().max(100).optional(),
    dateFrom: dateInput.optional(),
    dateTo: dateInput.optional(),
    format: z.enum(['csv']).optional()
  }).passthrough().superRefine((query, ctx) => {
    if (query.dateFrom && query.dateTo && new Date(query.dateFrom) > new Date(query.dateTo)) {
      ctx.addIssue({ code: 'custom', path: ['dateTo'], message: 'End date must not precede start date' })
    }
  })
})
