import { Router } from 'express'
import { protect, adminOnly, customerOnly, optionalAuth } from '../middleware/auth.js'
import { loginLimiter, registerLimiter, forgotPasswordLimiter, apiLimiter, paymentLimiter } from '../middleware/rateLimiter.js'
import { uploadProductImages, uploadComplaintPhotos } from '../config/cloudinary.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validateRequest } from '../middleware/validate.js'
import {
  authRegisterSchema,
  authLoginSchema,
  authForgotPasswordSchema,
  authResetPasswordSchema,
  customerProfileUpdateSchema,
  addressSchema,
  adminLoginSchema,
  paymentCreateOrderSchema,
  paymentVerifySchema,
  paymentConfirmUpiSchema,
  paymentSubmitUpiReferenceSchema,
  couponApplySchema,
  pincodeCheckSchema,
  adminProductCreateSchema,
  adminProductUpdateSchema,
  adminProductStockSchema,
  adminPincodeSchema,
  adminCouponSchema,
  idParamsSchema,
  paginationQuerySchema,
  productListQuerySchema,
  adminProductListQuerySchema,
  adminOrderListQuerySchema,
  orderCreateSchema,
  cancelOrderSchema,
  orderStatusSchema,
  orderPaymentSchema,
  refundSchema,
  complaintSchema,
  bulkEnquirySchema,
  notifyMeSchema,
  adminNotifySchema,
  complaintUpdateSchema,
  bulkEnquiryUpdateSchema,
  categorySchema,
  categoryUpdateSchema,
  businessHoursSchema,
  publicReviewSchema,
  adminReviewCreateSchema,
  adminReviewUpdateSchema,
  productSeasonalSchema,
  notificationListQuerySchema,
  auditLogListQuerySchema,
  reviewListQuerySchema,
  stockLogListQuerySchema,
  notifySubscriberListQuerySchema,
  customerListQuerySchema,
  customerBlockSchema
} from '../validators/apiValidators.js'

import * as auth     from '../controllers/authController.js'
import * as customer from '../controllers/customerController.js'
import * as product from '../controllers/productController.js'
import * as order   from '../controllers/orderController.js'
import * as payment from '../controllers/paymentController.js'
import * as misc    from '../controllers/miscController.js'
import Category from '../models/Category.js'
import Product  from '../models/Product.js'

const router = Router()

// ── AUTH ──────────────────────────────────────────────────
router.post('/auth/register',         registerLimiter, validateRequest(authRegisterSchema), auth.register)
router.post('/auth/login',            loginLimiter, validateRequest(authLoginSchema), auth.login)
router.post('/auth/forgot-password',  forgotPasswordLimiter, validateRequest(authForgotPasswordSchema), auth.forgotPassword)
router.post('/auth/reset-password',   loginLimiter, validateRequest(authResetPasswordSchema), auth.resetPassword)
router.post('/auth/admin-login',      loginLimiter, validateRequest(adminLoginSchema), auth.adminLogin)
router.get ('/auth/me',               protect,       auth.getMe)
router.post('/auth/logout',           protect,       auth.logout)

// ── CUSTOMER PROFILE & ADDRESS BOOK ───────────────────────
router.get   ('/customer/profile',              protect, customerOnly, customer.getProfile)
router.patch ('/customer/profile',              protect, customerOnly, validateRequest(customerProfileUpdateSchema), customer.updateProfile)
router.get   ('/customer/addresses',            protect, customerOnly, customer.getAddresses)
router.post  ('/customer/addresses',            protect, customerOnly, validateRequest(addressSchema), customer.addAddress)
router.put   ('/customer/addresses/:id',        protect, customerOnly, validateRequest(idParamsSchema), validateRequest(addressSchema), customer.updateAddress)
router.delete('/customer/addresses/:id',        protect, customerOnly, validateRequest(idParamsSchema), customer.deleteAddress)
router.post  ('/customer/addresses/:id/default',protect, customerOnly, validateRequest(idParamsSchema), customer.setDefaultAddress)

// ── CATEGORIES (public) ───────────────────────────────────
router.get('/store-settings', misc.getStoreSettings)
router.get('/categories', asyncHandler(async (_, res) => {
  const cats = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).limit(100)
  res.json({ success: true, categories: cats })
}))

// ── PRODUCTS (public) ─────────────────────────────────────
router.get('/products',           apiLimiter, validateRequest(productListQuerySchema), product.getProducts)
router.get('/products/featured',  apiLimiter, product.getFeaturedProducts)
router.get('/products/top-selling', apiLimiter, product.getTopSellingProducts)
router.get('/products/:slug',     apiLimiter, product.getProduct)

// ── DELIVERY ──────────────────────────────────────────────
router.get('/delivery/check/:pin', apiLimiter, validateRequest(pincodeCheckSchema), misc.checkPincode)

// ── ORDERS ────────────────────────────────────────────────
router.post('/orders',             protect, customerOnly, validateRequest(orderCreateSchema), order.placeOrder)
router.post('/orders/:id/cancel',  protect, customerOnly, validateRequest(idParamsSchema), validateRequest(cancelOrderSchema), order.cancelMyOrder)
router.get ('/orders/my',          protect, customerOnly, validateRequest(paginationQuerySchema), order.getMyOrders)
router.get ('/orders/track/:num',  protect, customerOnly, apiLimiter, order.trackOrder)
router.get ('/orders/track/:num/invoice', protect, customerOnly, order.trackOrderInvoice)
router.get ('/orders/:id',         protect, customerOnly, validateRequest(idParamsSchema), order.getOrder)
router.get ('/orders/:id/invoice', protect, customerOnly, validateRequest(idParamsSchema), order.downloadInvoice)

// ── PAYMENT ───────────────────────────────────────────────
router.post('/payment/create-order', protect, customerOnly, paymentLimiter, validateRequest(paymentCreateOrderSchema), payment.createPaymentOrder)
router.post('/payment/verify',       protect, customerOnly, paymentLimiter, validateRequest(paymentVerifySchema), payment.verifyPayment)
router.post('/payment/webhook',      paymentLimiter, payment.paymentWebhook)
router.post('/payment/confirm-upi',  protect, adminOnly, validateRequest(paymentConfirmUpiSchema), payment.confirmDirectUPI)
router.get('/admin/payment-reconciliation', protect, adminOnly, payment.getPaymentReconciliation)
router.post('/admin/orders/:id/refund', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(refundSchema), payment.processOrderRefundAdmin)
router.get ('/payment/options',                       payment.getPaymentOptions)
router.post('/payment/submit-upi-reference', protect, customerOnly, paymentLimiter, validateRequest(paymentSubmitUpiReferenceSchema), payment.submitDirectUpiReference)

// ── COUPONS ───────────────────────────────────────────────
router.post('/coupons/apply', optionalAuth, validateRequest(couponApplySchema), misc.applyCoupon)

// ── COMPLAINTS ────────────────────────────────────────────
router.post('/complaints',    protect, customerOnly, uploadComplaintPhotos.array('photos', 3), validateRequest(complaintSchema), misc.submitComplaint)
router.get  ('/complaints/my', protect, customerOnly, validateRequest(paginationQuerySchema), misc.getMyComplaints)

// ── BULK ENQUIRY ──────────────────────────────────────────
router.post('/bulk-enquiry', apiLimiter, validateRequest(bulkEnquirySchema), misc.submitBulkEnquiry)

// ── NOTIFY ME ─────────────────────────────────────────────
router.post('/notify-me', apiLimiter, validateRequest(notifyMeSchema), misc.registerNotifyMe)

// ── REVIEWS ──────────────────────────────────────────────
router.get('/products/:slug/reviews', apiLimiter, misc.getProductReviews)
router.post('/products/:slug/reviews', apiLimiter, validateRequest(publicReviewSchema), misc.submitReview)

// ── BUSINESS HOURS ────────────────────────────────────────
router.get('/business-hours', misc.getBusinessHours)

// ══════════════════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════════════════

router.get('/admin/stats', protect, adminOnly, order.getDashboardStats)
router.get('/admin/dashboard', protect, adminOnly, order.getDashboardStats)

// Products
router.get   ('/admin/products',     protect, adminOnly, validateRequest(adminProductListQuerySchema), product.adminGetProducts)
router.get   ('/admin/products/:id', protect, adminOnly, validateRequest(idParamsSchema), asyncHandler(async (req, res) => {
  const p = await Product.findById(req.params.id).populate('category')
  if (!p) return res.status(404).json({ success: false, message: 'Product not found.' })
  res.json({ success: true, product: p })
}))
router.post  ('/admin/products',              protect, adminOnly, uploadProductImages.array('images', 5), validateRequest(adminProductCreateSchema), product.createProduct)
router.put   ('/admin/products/:id',          protect, adminOnly, uploadProductImages.array('images', 5), validateRequest(idParamsSchema), validateRequest(adminProductUpdateSchema), product.updateProduct)
router.patch ('/admin/products/:id',          protect, adminOnly, uploadProductImages.array('images', 5), validateRequest(idParamsSchema), validateRequest(adminProductUpdateSchema), product.updateProduct)
router.patch ('/admin/products/:id/stock',    protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminProductStockSchema), product.updateStock)
router.patch ('/admin/products/:id/seasonal', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(productSeasonalSchema), product.updateSeasonalStatus)
router.delete('/admin/products/:id',          protect, adminOnly, validateRequest(idParamsSchema), product.deleteProduct)

// Categories
router.get   ('/admin/categories',     protect, adminOnly, validateRequest(paginationQuerySchema), misc.adminGetCategories)
router.post  ('/admin/categories',     protect, adminOnly, validateRequest(categorySchema), misc.adminCreateCategory)
router.put   ('/admin/categories/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(categoryUpdateSchema), misc.adminUpdateCategory)
router.patch ('/admin/categories/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(categoryUpdateSchema), misc.adminUpdateCategory)
router.delete('/admin/categories/:id', protect, adminOnly, validateRequest(idParamsSchema), misc.adminDeleteCategory)

// Orders
router.get  ('/admin/orders',              protect, adminOnly, validateRequest(adminOrderListQuerySchema), order.adminGetOrders)
router.get  ('/admin/orders/:id',          protect, adminOnly, validateRequest(idParamsSchema), order.adminGetOrder)
router.patch('/admin/orders/:id/status',   protect, adminOnly, validateRequest(idParamsSchema), validateRequest(orderStatusSchema), order.updateOrderStatus)
router.patch('/admin/orders/:id/payment',  protect, adminOnly, validateRequest(idParamsSchema), validateRequest(orderPaymentSchema), order.updateOrderPayment)
router.get  ('/admin/orders/:id/invoice',  protect, adminOnly, validateRequest(idParamsSchema), order.adminDownloadInvoice)

// Customers
router.get  ('/admin/customers',            protect, adminOnly, validateRequest(customerListQuerySchema), misc.adminGetCustomers)
router.get  ('/admin/customers/:id',        protect, adminOnly, validateRequest(idParamsSchema), validateRequest(paginationQuerySchema), misc.adminGetCustomer)
router.patch('/admin/customers/:id/block',  protect, adminOnly, validateRequest(idParamsSchema), validateRequest(customerBlockSchema), misc.adminToggleBlock)

// Coupons
router.get   ('/admin/coupons',     protect, adminOnly, validateRequest(paginationQuerySchema), misc.adminGetCoupons)
router.post  ('/admin/coupons',     protect, adminOnly, validateRequest(adminCouponSchema), misc.adminCreateCoupon)
router.put   ('/admin/coupons/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminCouponSchema), misc.adminUpdateCoupon)
router.patch ('/admin/coupons/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminCouponSchema), misc.adminUpdateCoupon)
router.delete('/admin/coupons/:id', protect, adminOnly, validateRequest(idParamsSchema), misc.adminDeleteCoupon)

// Pincodes
router.get   ('/admin/pincodes',     protect, adminOnly, validateRequest(paginationQuerySchema), misc.adminGetPincodes)
router.post  ('/admin/pincodes',     protect, adminOnly, validateRequest(adminPincodeSchema), misc.adminCreatePincode)
router.put   ('/admin/pincodes/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminPincodeSchema), misc.adminUpdatePincode)
router.patch ('/admin/pincodes/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminPincodeSchema), misc.adminUpdatePincode)
router.delete('/admin/pincodes/:id', protect, adminOnly, validateRequest(idParamsSchema), misc.adminDeletePincode)

// Complaints
router.get  ('/admin/complaints',     protect, adminOnly, validateRequest(paginationQuerySchema), misc.adminGetComplaints)
router.get  ('/admin/complaints/:id', protect, adminOnly, validateRequest(idParamsSchema), misc.adminGetComplaint)
router.patch('/admin/complaints/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(complaintUpdateSchema), misc.adminUpdateComplaint)

// Bulk Enquiries
router.get('/admin/bulk-enquiries',     protect, adminOnly, validateRequest(paginationQuerySchema), misc.adminGetBulkEnquiries)
router.patch('/admin/bulk-enquiries/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(bulkEnquiryUpdateSchema), misc.adminUpdateBulkEnquiry)

// Business Hours
router.get('/admin/business-hours', protect, adminOnly, misc.adminGetBusinessHours)
router.put('/admin/business-hours', protect, adminOnly, validateRequest(businessHoursSchema), misc.adminUpdateBusinessHours)
router.patch('/admin/business-hours', protect, adminOnly, validateRequest(businessHoursSchema), misc.adminUpdateBusinessHours)

// Stock Logs
router.get('/admin/stock-logs', protect, adminOnly, validateRequest(stockLogListQuerySchema), misc.adminGetStockLogs)

// Reviews
router.get('/admin/reviews', protect, adminOnly, validateRequest(reviewListQuerySchema), misc.adminGetReviews)
router.post('/admin/reviews', protect, adminOnly, validateRequest(adminReviewCreateSchema), misc.adminCreateReview)
router.patch('/admin/reviews/:id', protect, adminOnly, validateRequest(idParamsSchema), validateRequest(adminReviewUpdateSchema), misc.adminUpdateReview)
router.delete('/admin/reviews/:id', protect, adminOnly, validateRequest(idParamsSchema), misc.adminDeleteReview)

// Notify Me (admin)
router.get('/admin/notify-subscribers', protect, adminOnly, validateRequest(notifySubscriberListQuerySchema), misc.adminGetNotifySubscribers)
router.post('/admin/notify-send', protect, adminOnly, validateRequest(adminNotifySchema), misc.adminSendNotifications)
router.get('/admin/notifications', protect, adminOnly, validateRequest(notificationListQuerySchema), misc.adminGetNotificationDeliveries)
router.post('/admin/notifications/:id/retry', protect, adminOnly, validateRequest(idParamsSchema), misc.adminRetryNotification)
router.get('/admin/audit-logs', protect, adminOnly, validateRequest(auditLogListQuerySchema), misc.adminGetAuditLogs)

export default router
