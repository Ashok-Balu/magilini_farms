import { Router } from 'express'
import { logger } from '../utils/logger.js'
import { protect, adminOnly, customerOnly, allowSessionOrVerification } from '../middleware/auth.js'
import { otpLimiter, loginLimiter, apiLimiter, paymentLimiter } from '../middleware/rateLimiter.js'
import { uploadProductImages, uploadComplaintPhotos } from '../config/cloudinary.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateRequest } from '../middleware/validate.js'
import {
  authSendOtpSchema,
  authVerifyOtpSchema,
  authCompleteProfileSchema,
  adminLoginSchema,
  paymentCreateOrderSchema,
  paymentVerifySchema,
  paymentConfirmUpiSchema,
  couponApplySchema,
  pincodeCheckSchema,
  adminProductCreateSchema,
  adminProductStockSchema,
  adminPincodeSchema,
  adminCouponSchema
} from '../validators/apiValidators.js'

import * as auth    from '../controllers/authController.js'
import * as product from '../controllers/productController.js'
import * as order   from '../controllers/orderController.js'
import * as payment from '../controllers/paymentController.js'
import * as misc    from '../controllers/miscController.js'
import Category from '../models/Category.js'
import Product  from '../models/Product.js'

const router = Router()

// ── AUTH ──────────────────────────────────────────────────
router.post('/auth/send-otp',         otpLimiter, validateRequest(authSendOtpSchema), auth.sendOtp)
router.post('/auth/verify-otp',       loginLimiter, validateRequest(authVerifyOtpSchema), auth.verifyOtp)
router.post('/auth/dev/clear-otp',    auth.clearDevOtpRecords)
// Temporary debug endpoint: returns cookies sent by the client
router.get('/debug/cookies', apiLimiter, (req, res) => {
  try {
    logger.info('Debug cookies request', { ip: req.ip, cookies: req.cookies || {}, origin: req.headers.origin })
  } catch (err) {
    // ignore logging errors
  }
  res.json({ success: true, cookies: req.cookies || {} })
})
router.post('/auth/complete-profile', allowSessionOrVerification, validateRequest(authCompleteProfileSchema), auth.completeProfile)
router.post('/auth/admin-login',      loginLimiter, validateRequest(adminLoginSchema), auth.adminLogin)
router.get ('/auth/me',               protect,       auth.getMe)
router.post('/auth/logout',                         auth.logout)

// ── CATEGORIES (public) ───────────────────────────────────
router.get('/categories', asyncHandler(async (_, res) => {
  const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1 })
  res.json({ success: true, categories: cats })
}))

// ── PRODUCTS (public) ─────────────────────────────────────
router.get('/products',           apiLimiter, product.getProducts)
router.get('/products/featured',  apiLimiter, product.getFeaturedProducts)
router.get('/products/top-selling', apiLimiter, product.getTopSellingProducts)
router.get('/products/:slug',     apiLimiter, product.getProduct)

// ── DELIVERY ──────────────────────────────────────────────
router.get('/delivery/check/:pin', apiLimiter, validateRequest(pincodeCheckSchema), misc.checkPincode)

// ── ORDERS ────────────────────────────────────────────────
router.post('/orders',             protect, customerOnly, order.placeOrder)
router.get ('/orders/my',          protect, customerOnly, order.getMyOrders)
router.get ('/orders/track/:num',  apiLimiter, order.trackOrder)
router.get ('/orders/track/:num/invoice', apiLimiter, order.trackOrderInvoice)
router.get ('/orders/:id',         protect, customerOnly, order.getOrder)
router.get ('/orders/:id/invoice', protect, customerOnly, order.downloadInvoice)

// ── PAYMENT ───────────────────────────────────────────────
router.post('/payment/create-order', protect, customerOnly, paymentLimiter, validateRequest(paymentCreateOrderSchema), payment.createPaymentOrder)
router.post('/payment/verify',       protect, customerOnly, paymentLimiter, validateRequest(paymentVerifySchema), payment.verifyPayment)
router.post('/payment/webhook',      paymentLimiter, payment.paymentWebhook)
router.post('/payment/confirm-upi',  protect, adminOnly, validateRequest(paymentConfirmUpiSchema), payment.confirmDirectUPI)

// ── COUPONS ───────────────────────────────────────────────
router.post('/coupons/apply', protect, customerOnly, validateRequest(couponApplySchema), misc.applyCoupon)

// ── COMPLAINTS ────────────────────────────────────────────
router.post('/complaints',    protect, customerOnly, uploadComplaintPhotos.array('photos', 3), misc.submitComplaint)
router.get ('/complaints/my', protect, customerOnly, misc.getMyComplaints)

// ── BULK ENQUIRY ──────────────────────────────────────────
router.post('/bulk-enquiry', apiLimiter, misc.submitBulkEnquiry)

// ── NOTIFY ME ─────────────────────────────────────────────
router.post('/notify-me', apiLimiter, misc.registerNotifyMe)

// ── BUSINESS HOURS ────────────────────────────────────────
router.get('/business-hours', misc.getBusinessHours)

// ══════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════

router.get('/admin/stats', protect, adminOnly, order.getDashboardStats)
router.get('/admin/dashboard', protect, adminOnly, order.getDashboardStats)

// Products
router.get   ('/admin/products',     protect, adminOnly, product.adminGetProducts)
router.get   ('/admin/products/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).populate('category')
  if (!p) return res.status(404).json({ success: false, message: 'Product not found.' })
  res.json({ success: true, product: p })
}))
router.post  ('/admin/products',              protect, adminOnly, uploadProductImages.array('images', 5), validateRequest(adminProductCreateSchema), product.createProduct)
router.put   ('/admin/products/:id',          protect, adminOnly, uploadProductImages.array('images', 5), product.updateProduct)
router.patch ('/admin/products/:id',          protect, adminOnly, uploadProductImages.array('images', 5), product.updateProduct)
router.patch ('/admin/products/:id/stock',    protect, adminOnly, validateRequest(adminProductStockSchema), product.updateStock)
router.patch ('/admin/products/:id/seasonal', protect, adminOnly, product.updateSeasonalStatus)
router.delete('/admin/products/:id',          protect, adminOnly, product.deleteProduct)

// Categories
router.get   ('/admin/categories',     protect, adminOnly, misc.adminGetCategories)
router.post  ('/admin/categories',     protect, adminOnly, misc.adminCreateCategory)
router.put   ('/admin/categories/:id', protect, adminOnly, misc.adminUpdateCategory)
router.patch ('/admin/categories/:id', protect, adminOnly, misc.adminUpdateCategory)
router.delete('/admin/categories/:id', protect, adminOnly, misc.adminDeleteCategory)

// Orders
router.get  ('/admin/orders',              protect, adminOnly, order.adminGetOrders)
router.get  ('/admin/orders/:id',          protect, adminOnly, order.adminGetOrder)
router.patch('/admin/orders/:id/status',   protect, adminOnly, order.updateOrderStatus)
router.patch('/admin/orders/:id/payment',  protect, adminOnly, order.updateOrderPayment)
router.get  ('/admin/orders/:id/invoice',  protect, adminOnly, order.adminDownloadInvoice)

// Customers
router.get  ('/admin/customers',            protect, adminOnly, misc.adminGetCustomers)
router.get  ('/admin/customers/:id',        protect, adminOnly, misc.adminGetCustomer)
router.patch('/admin/customers/:id/block',  protect, adminOnly, misc.adminToggleBlock)

// Coupons
router.get   ('/admin/coupons',     protect, adminOnly, misc.adminGetCoupons)
router.post  ('/admin/coupons',     protect, adminOnly, validateRequest(adminCouponSchema), misc.adminCreateCoupon)
router.put   ('/admin/coupons/:id', protect, adminOnly, validateRequest(adminCouponSchema), misc.adminUpdateCoupon)
router.patch ('/admin/coupons/:id', protect, adminOnly, validateRequest(adminCouponSchema), misc.adminUpdateCoupon)
router.delete('/admin/coupons/:id', protect, adminOnly, misc.adminDeleteCoupon)

// Pincodes
router.get   ('/admin/pincodes',     protect, adminOnly, misc.adminGetPincodes)
router.post  ('/admin/pincodes',     protect, adminOnly, validateRequest(adminPincodeSchema), misc.adminCreatePincode)
router.put   ('/admin/pincodes/:id', protect, adminOnly, validateRequest(adminPincodeSchema), misc.adminUpdatePincode)
router.patch ('/admin/pincodes/:id', protect, adminOnly, validateRequest(adminPincodeSchema), misc.adminUpdatePincode)
router.delete('/admin/pincodes/:id', protect, adminOnly, misc.adminDeletePincode)

// Complaints
router.get  ('/admin/complaints',     protect, adminOnly, misc.adminGetComplaints)
router.get  ('/admin/complaints/:id', protect, adminOnly, misc.adminGetComplaint)
router.patch('/admin/complaints/:id', protect, adminOnly, misc.adminUpdateComplaint)

// Bulk Enquiries
router.get  ('/admin/bulk-enquiries',     protect, adminOnly, misc.adminGetBulkEnquiries)
router.patch('/admin/bulk-enquiries/:id', protect, adminOnly, misc.adminUpdateBulkEnquiry)

// Business Hours
router.get('/admin/business-hours', protect, adminOnly, misc.adminGetBusinessHours)
router.put('/admin/business-hours', protect, adminOnly, misc.adminUpdateBusinessHours)
router.patch('/admin/business-hours', protect, adminOnly, misc.adminUpdateBusinessHours)

// Stock Logs
router.get('/admin/stock-logs', protect, adminOnly, misc.adminGetStockLogs)

export default router
