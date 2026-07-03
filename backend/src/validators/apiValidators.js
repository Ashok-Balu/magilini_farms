import { z } from 'zod'

const phoneSchema = z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits')
const otpSchema = z.string().regex(/^\d{4}$/, 'OTP must be exactly 4 digits')
const emailSchema = z.string().email('Email format is invalid')

export const authSendOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema
  })
})

export const authVerifyOtpSchema = z.object({
  body: z.object({
    phone: phoneSchema,
    otp: otpSchema
  })
})

export const authCompleteProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required').optional(),
    email: emailSchema.optional(),
    address: z.any().optional()
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
    orderId: z.string().min(1, 'orderId is required')
  })
})

export const paymentVerifySchema = z.object({
  body: z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
    orderId: z.string().min(1)
  })
})

export const paymentConfirmUpiSchema = z.object({
  body: z.object({
    orderId: z.string().min(1),
    upiRef: z.string().min(1).optional()
  })
})

export const couponApplySchema = z.object({
  body: z.object({
    code: z.string().trim().min(1),
    subtotal: z.coerce.number().min(0)
  })
})

export const pincodeCheckSchema = z.object({
  params: z.object({
    pin: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits')
  })
})

const numberLike = z.union([z.number(), z.string().regex(/^\d+(\.\d+)?$/)]).transform(Number)

const variantSchema = z.object({
  weight: z.string().trim().min(1, 'Variant weight is required'),
  price: numberLike.refine((v) => v > 0, 'Price must be greater than zero'),
  mrp: numberLike.refine((v) => v > 0, 'MRP must be greater than zero'),
  stock: numberLike.refine((v) => v >= 0, 'Stock cannot be negative')
})

export const adminProductCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Product name is required'),
    category: z.string().trim().min(1, 'Category is required'),
    description: z.string().trim().min(1, 'Description is required'),
    variants: z.string().transform((value, ctx) => {
      try {
        return JSON.parse(value)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Variants must be valid JSON' })
        return z.NEVER
      }
    }).pipe(z.array(variantSchema).min(1))
  }).passthrough()
})

export const adminProductStockSchema = z.object({
  body: z.object({
    variantId: z.string().trim().min(1, 'variantId is required'),
    stock: z.coerce.number().min(0, 'Stock cannot be negative'),
    note: z.string().optional()
  })
})

export const adminPincodeSchema = z.object({
  body: z.object({
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    zone: z.enum(['tamil-nadu', 'south-india', 'rest-india']),
    deliveryFee: z.coerce.number().min(0),
    estimatedDays: z.string().trim().min(1)
  })
})

export const adminCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1),
    type: z.enum(['percent', 'flat', 'delivery']),
    value: z.coerce.number().min(0),
    minOrderAmount: z.coerce.number().min(0).optional(),
    maxDiscount: z.coerce.number().min(0).optional(),
    usageLimit: z.coerce.number().int().positive().optional(),
    perUserLimit: z.coerce.number().int().positive().optional(),
    expiresAt: z.string().optional()
  })
})
