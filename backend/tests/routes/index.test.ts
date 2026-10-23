import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const routeSource = readFileSync(new URL('../../src/routes/index.js', import.meta.url), 'utf8')

const routeDeclaration = (method: string, path: string) => {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = routeSource.match(new RegExp(`router\\.${method}\\s*\\(\\s*['"]${escapedPath}['"]([^\\n]*)`))
  return match?.[1]
}

test('API route declarations wire public, validated, and protected handlers', () => {
  assert.match(routeDeclaration('get', '/products') || '', /apiLimiter\s*,\s*validateRequest\(productListQuerySchema\)\s*,\s*product\.getProducts/)
  assert.match(
    routeDeclaration('post', '/orders') || '',
    /protect\s*,\s*customerOnly\s*,\s*validateRequest\(orderCreateSchema\)\s*,\s*order\.placeOrder/
  )
  assert.match(
    routeDeclaration('post', '/auth/register') || '',
    /registerLimiter\s*,\s*validateRequest\(authRegisterSchema\)\s*,\s*auth\.register/
  )
  assert.match(
    routeDeclaration('post', '/payment/verify') || '',
    /protect\s*,\s*customerOnly\s*,\s*paymentLimiter\s*,\s*validateRequest\(paymentVerifySchema\)\s*,\s*payment\.verifyPayment/
  )
  assert.match(
    routeDeclaration('post', '/admin/products') || '',
    /protect\s*,\s*adminOnly\s*,\s*uploadProductImages\.array\('images', 5\)\s*,\s*validateRequest\(adminProductCreateSchema\)\s*,\s*product\.createProduct/
  )
  assert.match(
    routeDeclaration('patch', '/admin/orders/:id/status') || '',
    /protect\s*,\s*adminOnly\s*,\s*validateRequest\(idParamsSchema\)\s*,\s*validateRequest\(orderStatusSchema\)\s*,\s*order\.updateOrderStatus/
  )
  assert.match(
    routeDeclaration('put', '/admin/products/:id') || '',
    /validateRequest\(idParamsSchema\)\s*,\s*validateRequest\(adminProductUpdateSchema\)\s*,\s*product\.updateProduct/
  )
  assert.match(
    routeDeclaration('get', '/orders/track/:num') || '',
    /protect\s*,\s*customerOnly\s*,\s*apiLimiter\s*,\s*order\.trackOrder/
  )
  assert.match(
    routeDeclaration('get', '/orders/track/:num/invoice') || '',
    /protect\s*,\s*customerOnly\s*,\s*order\.trackOrderInvoice/
  )
  assert.match(
    routeDeclaration('get', '/admin/notifications') || '',
    /protect\s*,\s*adminOnly\s*,\s*validateRequest\(notificationListQuerySchema\)\s*,\s*misc\.adminGetNotificationDeliveries/
  )
  assert.match(
    routeDeclaration('post', '/admin/notifications/:id/retry') || '',
    /protect\s*,\s*adminOnly\s*,\s*validateRequest\(idParamsSchema\)\s*,\s*misc\.adminRetryNotification/
  )
  assert.match(
    routeDeclaration('get', '/admin/audit-logs') || '',
    /protect\s*,\s*adminOnly\s*,\s*validateRequest\(auditLogListQuerySchema\)\s*,\s*misc\.adminGetAuditLogs/
  )
})
