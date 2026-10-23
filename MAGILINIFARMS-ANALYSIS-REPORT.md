# MAGILINIFARMS Product, Functional, Technical and Production Readiness Analysis

**Audit mode:** Read-only repository analysis. No application source files were changed.
**Repository state:** The worktree already contains user changes and deleted/generated files. Findings describe the current worktree, not an assumed clean commit.
**Date:** 2026-09-19

## Executive Summary

MAGILINIFARMS has a meaningful working foundation: Vue 3/Vite customer and admin screens, Express/Mongoose APIs, email/password authentication, HttpOnly cookie JWTs, product/category management, pincode lookup and caching, Razorpay browser verification plus webhook handling, Cloudinary uploads, orders, stock logs, coupons, complaints, bulk enquiries, reviews, invoices, business hours, and manual seed safeguards.

It is not production-ready. The highest-risk blockers are:

- Orders are created and stock is decremented before online payment succeeds.
- Stock updates are read-modify-save operations without atomic reservation, so concurrent orders can oversell or overwrite stock.
- Public order-number tracking exposes customer/order data and public invoice download exposes a full invoice.
- Order, payment, coupon, stock, refund, and notification operations are not coordinated transactionally or idempotently.
- Razorpay webhook verification uses re-serialized JSON instead of the original raw request body; amount/currency reconciliation is absent.
- Password reset does not invalidate already issued sessions; cookie-authenticated mutations have no explicit CSRF defense.
- Review submission is public, unvalidated by route schema, rate-limited only by the broad API limiter, and auto-approved.
- Several admin mutation endpoints accept request bodies directly, creating mass-assignment and invalid-state risk.
- Complaint UI sends an order number while the backend expects a MongoDB `_id`; the submitted phone is ignored.
- No automated test/spec files exist; `npm run test` starts the server instead of running tests.
- OTP source modules were deleted in the current worktree, but OTP configuration, historical logs, README/privacy wording, and Twilio/SMS dependencies remain.
- Seed protection is improved but still includes a production bypass flag and hardcoded development credentials in source.

## 1. Existing Architecture

### Frontend

- Vue 3 with Vite, Vue Router, Pinia, Axios, Tailwind CSS.
- Lazy-loaded public routes for home, shop, product, cart, tracking, about, contact, FAQ, bulk, terms, privacy, returns, complaint, auth, checkout, account, and admin.
- Axios uses `withCredentials: true`; auth state is held in Pinia and rehydrated through `/auth/me`.
- Cart and pincode snapshots use `localStorage`; JWT is not stored there.
- Shared layout: navbar, footer, product card, password input, toast UI.
- Admin route guards exist in Vue, but backend authorization is the actual security boundary.

### Backend

- Node.js, Express, TypeScript bootstrap/config/server files, JavaScript controllers/models/services.
- MongoDB/Mongoose with models for User, Product, Category, Order and additional operational collections in `models/index.js`.
- JWT authentication, bcryptjs password hashing, cookie-parser, CORS, Helmet, compression, Mongo sanitize, XSS sanitization, rate limiting, Multer/Cloudinary, Razorpay, Nodemailer, PDFKit, cron.
- Routes are mounted under `/api`; global API limiter, error handler, not-found handler, health route and database connection are present.
- Environment selection supports development, test and production database names with database-safety checks.
- Manual seed script requires `ENABLE_SEED=true` and `--force`; production is rejected unless a production override flag is supplied.

## 2. Functionality Inventory

| Module | Current status | Evidence / assessment |
|---|---|---|
| Public storefront | Implemented foundation | Home, shop, product detail, categories, search, filter, sorting, pagination and lazy route loading exist. SEO metadata and structured data are incomplete. |
| Customer registration/login | Implemented, needs hardening | Email/password, bcrypt, blocked-user check, JWT cookie and logout exist. No OTP runtime flow remains in current source. |
| Forgot/reset password | Partially implemented | Has hashed one-time token and expiry, generic forgot response, email service. Session revocation, provider readiness and robust delivery/audit handling are missing. |
| Profile/address book | Partially implemented | CRUD and default address exist. No coordinates, address snapshot contract, ownership-independent validation, or concurrency protection for defaults. |
| Cart | Partially implemented | Guest/local cart and checkout payload exist. No server cart, login merge, stale-cart reconciliation UI, or reservation model. |
| Products/categories | Implemented foundation | Public/admin CRUD, variants, seasonal status, Cloudinary images, category filtering. Product schema lacks several requested merchandising fields and admin updates are too permissive. |
| Coupons | Partially implemented | Admin CRUD and preview/final validation exist. Usage updates are non-atomic; valid-from, delivery discount semantics, cancellation reversal and full audit are incomplete. |
| Delivery | Partially implemented | Pincode external lookup, cache, zones, charges and pickup UI exist. Admin-configured behavior is inconsistent and business configuration is hardcoded in service/controller. |
| Checkout | Partially implemented and unsafe | Server re-fetches products and recalculates prices, but creates order/decreases stock before payment and lacks complete request validation. |
| Payments | Partially implemented | Razorpay create, signature verify, webhook event dedupe and direct UPI admin confirmation exist. Refunds, failed/retry/reconciliation flows and raw webhook verification are missing. |
| Orders | Partially implemented | Snapshots, statuses, history, invoice and admin status updates exist. Lifecycle state machine, cancellation policy, payment consistency and inventory reservation are missing. |
| Tracking | Implemented but privacy-risky | Public order number tracking exists, including public invoice route. It exposes too much data and has no customer possession proof. |
| Inventory | Partially implemented | Stock, manual adjustment and logs exist. Atomic decrement/reservation, reserved/sold quantities, idempotent release and reconciliation do not. |
| Reviews | Implemented but unsafe | Public review creation and admin moderation UI/API exist. No verified purchase enforcement, duplicate constraint, attachment support, route schema, moderation default or abuse controls. |
| Complaints | Partially implemented and contract-broken | Authenticated complaint creation, photos, 24-hour window and admin workflow exist. UI/backend identifier mismatch, category/admin response/timestamps and notification persistence are incomplete. |
| Bulk enquiries | Partially implemented | Public submission and admin list/status update exist. Model/statuses differ from requested workflow and request validation is weak. |
| Notifications | Partially implemented | Email reset, WhatsApp abstraction and Twilio SMS exist. No durable notification log/queue/retry/provider status; SMS/OTP legacy must be isolated or removed. |
| Admin | Broad foundation | Dashboard, products, categories, orders, customers, coupons, pincodes, complaints, bulk, hours, stock logs and reviews exist. Settings, reports, delivery-zone editor, refunds and granular admin roles are missing. |
| Testing | Missing | No test/spec files found; `npm run test` starts `src/bootstrap.ts`. |
| Deployment/operations | Partial | Build/start scripts, health endpoint, env separation, logging, compression and cron exist. CI/CD, migrations/index checks, alerting, backups and rollback evidence are missing. |

## 3. Customer Requirements

### Discovery and product purchase

- Home must communicate farm identity, current availability, delivery/pickup coverage, trust signals and current products without hardcoded claims that require owner approval.
- Shop must support search, categories, filters, sort, pagination, active/seasonal/out-of-stock states, loading, empty, error and retry states.
- Product details must show name, slug URL, images, primary image, alt text, short/full description, variety, grade, origin, unit/weight, packaging, shelf life, availability, price/MRP, quantity bounds, stock state, delivery estimate, reviews and structured product data.
- Product images require upload, replace, delete, reorder, primary selection, metadata, Cloudinary transformations and responsive delivery.
- Cart must support add/remove/increase/decrease/clear, guest persistence, login merge, stale item/price/stock reconciliation and clear unavailable-item messaging.

### Checkout

- Customer selects saved/new address, home delivery or farm pickup, delivery date where available, packaging, notes and payment method.
- `USE MY LOCATION` must request browser permission, reverse geocode latitude/longitude, present the resolved address for confirmation, derive pincode and run the same serviceability check as manual entry.
- Backend must accept only product/variant IDs and quantities, reload active product data, validate integer bounds and availability, resolve delivery/coupon/business rules, and calculate subtotal, discount, delivery, tax if applicable and final total.
- The final server quote must be immutable or versioned for payment creation. Frontend totals are display-only.
- Payment initiation must not create a fulfilled order or permanently consume stock. Use a pending checkout/order plus atomic reservation with expiry, or create the order only after a verified payment intent, according to the selected payment architecture.
- Customer must be able to retry an abandoned/failed payment, understand payment-pending status, and recover after browser/network failure.

### Account, orders and support

- Profile: name, email, mobile, password change, account status and logout.
- Addresses: multiple records, Home/Work/Other, recipient name/phone, lines, landmark, city, district, state, pincode, latitude/longitude, default selection and validation.
- Orders: customer/order/payment/address/product/coupon snapshots, order number, status timeline, cancellation eligibility, invoice access, payment retry and support actions.
- Tracking: authenticated account view; public lookup, if retained, must require a secret possession token or equivalent and return minimal information.
- Reviews: only eligible purchasers, one policy-defined review per product/order, moderation, edit/delete policy and abuse reporting.
- Complaints: order, category, description, attachments, dates, customer-visible status, admin response and resolution notes.
- Bulk enquiry: name, company, email, phone, product/variety, quantity, requested date, location/message and workflow updates.

## 4. Admin Requirements

- Secure admin login with backend role enforcement, brute-force controls, session revocation and audit events.
- Dashboard metrics with defined business purpose: today’s orders/revenue, paid revenue, pending/failed payments, fulfillment distribution, low stock, top products and sales trend. Metrics must specify timezone and whether cancelled/refunded orders are excluded.
- Products: complete schema editing, image lifecycle/reordering/alt text, variants, unit-aware quantity rules, stock, seasonal windows, SEO, active state and audit history.
- Categories: name, slug, description/image if needed, active state, sort order, duplicate prevention and product dependency handling.
- Orders: search/filter/pagination/export, detail snapshots, payment state, legal cancellation/refund action, valid status transitions, courier details, delivery assignment and status history.
- Customers: search/filter, profile/order view, block/unblock only customer roles, privacy-minimized display, reason/audit trail.
- Coupons: full rule editor, date ranges, usage limits, per-customer limits, active state, validation preview and usage/audit reporting.
- Delivery: configurable zones, charges, free threshold, minimum order, exceptions, serviceable/non-serviceable overrides, estimated days and farm pickup. Defaults must be configuration, not code constants.
- Reviews/complaints/bulk: moderation, response, attachments, status workflows, internal notes, timestamps, assignment and notifications.
- Inventory: stock adjustment with reason, low-stock threshold, reservation/sold quantities, immutable stock ledger, reconciliation and export.
- Settings: farm identity, contact, address/map, business hours, delivery/payment/notification configuration and legal content references. Secrets remain deployment-managed, never admin-editable as plain values.
- Reports: orders/revenue/refunds/tax if applicable, products, inventory, customers and notification/payment failures with date/timezone filters.

## 5. Business Requirements and Decisions

The following are currently hardcoded or implied and require owner confirmation.

- **BUSINESS OWNER DECISION REQUIRED:** Minimum order: current code uses 3 kg, but products include pieces and grams. Define units and minimum rules per product/category or cart value.
- **BUSINESS OWNER DECISION REQUIRED:** Delivery zones, fees, estimated days, free-delivery threshold, minimum order, maximum order and whether all India is serviceable.
- **BUSINESS OWNER DECISION REQUIRED:** Farm pickup location, days/hours, lead time, missed pickup behavior and payment methods.
- **BUSINESS OWNER DECISION REQUIRED:** Cancellation window and who can cancel at each order/payment state.
- **BUSINESS OWNER DECISION REQUIRED:** Refund eligibility, damaged/fresh-produce evidence, refund method/timing and replacement policy.
- **BUSINESS OWNER DECISION REQUIRED:** Tax/GST applicability, invoice fields, tax-inclusive pricing and HSN/SAC requirements.
- **BUSINESS OWNER DECISION REQUIRED:** Coupon delivery discount semantics, stacking, usage counting at reservation/payment, and whether cancelled orders restore usage.
- **BUSINESS OWNER DECISION REQUIRED:** Seasonal product availability, substitutions, weight variance and acceptable produce-quality claims.
- **BUSINESS OWNER DECISION REQUIRED:** Delivery partner/process, tracking source, proof of delivery and failed delivery handling.
- **BUSINESS OWNER DECISION REQUIRED:** Notification opt-in/opt-out, WhatsApp provider/templates, email provider, operational fallback and support SLA.
- **BUSINESS OWNER DECISION REQUIRED:** Admin roles beyond one admin, approval requirements and audit retention.
- **BUSINESS OWNER DECISION REQUIRED:** Bulk enquiry quote validity, minimum quantities, payment terms and delivery commitments.
- **BUSINESS OWNER DECISION REQUIRED:** Legal wording and governing jurisdiction for privacy, terms, shipping, cancellation, refund, grievance and perishable-goods policy.

## 6. Current Incorrect/Risky Behavior

### P0 security and integrity

1. `placeOrder` recalculates server-side prices, which is correct, but creates the order and calls `decreaseStock` while `paymentStatus` is still pending. A dismissed/failed online payment leaves stock consumed. There is no general release/retry flow.
2. `decreaseStock` loads and saves a product per item and uses `Math.max(0, stock - qty)`. Concurrent requests can overwrite each other and a quantity greater than stock can be accepted.
3. Cancellation and hourly timeout can both restore stock; restoration is not idempotent or transactionally coupled to the state change.
4. Public `/orders/track/:num` exposes customer name, status history, courier and dates. Public invoice download by order number returns a complete invoice. Require authenticated ownership or a high-entropy tracking secret with minimal data.
5. Razorpay webhook signature validation uses `JSON.stringify(req.body)` after body parsing, not raw bytes. It does not reconcile amount/currency and does not fully process failed/refund/dispute events.
6. No CSRF token/origin defense exists for cookie-authenticated state-changing routes. Production uses `SameSite=None`, so this is a launch blocker unless an equivalent defense is added.
7. Generic admin updates accept `req.body` directly in multiple controllers. Use allow-listed schemas and `{ runValidators: true, ... }` on updates.
8. Public review creation is auto-approved and has no verified-purchase/duplicate/rate-limit contract.
9. Complaint UI sends a human order number while backend queries `_id`; the flow is broken. The UI phone is not used by the server.
10. Pincode `isActive` logic appears inverted: inactive records can fall back to a serviceable default rather than disabling delivery.

### P1 correctness and operations

- `parseFloat('250 g')` is treated as 250 kg and `parseFloat('1 piece')` as 1 kg; malformed weight can produce `NaN`. Store numeric quantity/unit separately.
- Order and complaint numbers use `countDocuments()+1`, which collides under concurrency and after deletion. Use a counter/sequence or collision-safe identifier.
- Order status accepts broad transitions; delivered orders can move backwards. Implement a state machine and actor/action rules.
- Cancellation of paid orders does not initiate or track a refund.
- Payment verification trusts signed browser payload without provider status/amount reconciliation; webhook processing can record an event before business processing succeeds.
- Coupon use increment is not atomic and may exceed global/per-user limits under concurrency.
- Direct UPI/pay-at-farm behavior is inconsistently represented: checkout labels pay-at-farm as successful while backend remains pending/new.
- Product deletion can orphan order references and historical product references; prefer archive/inactive for purchased products.
- Image update accepts client-provided existing image metadata and lacks explicit alt text/reorder model.
- Notification providers silently return success on console fallback; delivery success must be distinct from queued/simulated status.
- Notification calls occur synchronously in order/payment requests and can add latency or couple third-party outages to user actions.
- Seed script contains source credentials and a production override path. The README documents different admin credentials. Rotate and remove credentials from source; use a separately managed bootstrap process.
- Production env validation does not require payment, Cloudinary, SMTP and notification credentials even when corresponding features are advertised.
- Runtime modifies DNS resolvers to public DNS servers; remove this policy from application code unless infrastructure explicitly requires it.

## 7. Database Requirements

| Collection | Current state | Required fields/indexes/lifecycle |
|---|---|---|
| `users` | User model embeds addresses | `_id`, name, unique normalized email, phone, password hash, role, status/block reason, reset fields, session/version, timestamps. Index email/role. Consider separate addresses only if scale/query needs it. |
| `products` | Product with variants/images | Add explicit unit/quantity values, variety/grade/origin/packaging/shelf life, stock threshold, image alt/order/primary, SEO. Unique slug; indexes category/active/season/featured and searchable fields. Archive, do not hard-delete purchased products. |
| `categories` | Existing model | Unique slug, active, sort order, metadata and timestamps. Protect deletion when referenced. |
| `orders` | Snapshot-like customer/items/address fields | Add immutable quote/pricing version, tax, refund fields, reservation fields, payment references, delivery assignment/proof, cancellation/refund timestamps and actor. Index user/date/status/order number/payment provider IDs. |
| `payments` | `PaymentTransaction` exists | Provider intent/order/payment IDs, amount/currency, status history, verification source, raw event reference/hash, refund state and idempotency key. Unique provider event/payment identifiers. |
| `coupons` | Exists with `usedBy` array | Dates, rule constraints, usage counters, per-user ledger or unique redemption collection. Atomic redemption; index code/active/dates. |
| `reviews` | Exists | User/order/item references, unique eligibility constraint, moderation status, content timestamps, admin response/audit. Do not default public submissions to approved. |
| `complaints` | Exists | Category, customer-visible/admin status, response/resolution, delivery evidence, attachment metadata, SLA timestamps, assignment and audit. Unique number via sequence. |
| `addresses` | Embedded in user | Add latitude/longitude and normalized location fields; order must snapshot all necessary address/recipient values. |
| `pincodes` | Cache/override model | Unique pincode, postal metadata, zone/override mode, serviceability, fee, free threshold/ETA, reason, active semantics and source/update timestamps. Cache misses need duplicate-key handling. |
| `stock_logs` | Exists | Immutable ledger with admin/system actor, reason, before/after, reservation/order/payment reference. Add reconciliation and indexes product/variant/time. |
| `bulk_enquiries` | Exists with different statuses/fields | Add product reference, expected date, quote/status workflow, assigned owner, response/quote fields and contact timestamps. |
| `business_settings` | Missing | One versioned settings document for public business/delivery/pickup/legal references. Never store raw secrets here. |
| `notification_logs` | Missing | Channel/provider/template/recipient hash, event/order ID, status, attempts, provider ID, error, timestamps; redact sensitive content. |
| `sessions` or token version | Missing | Optional revocation/version strategy for logout/password reset/admin security. |
| `audit_logs` | Missing as durable model | Actor, action, resource, before/after summary, request correlation ID, IP/user agent policy, timestamp; never secrets. |
| `delivery_zones` | Missing | Zone rules, states/pincodes/geo policy, charges, thresholds, ETA, active version and priority. |

Use MongoDB transactions where supported for order/payment/stock/coupon state changes, and atomic conditional updates where a transaction is not appropriate. Add index verification to deployment.

## 8. API Inventory and Contract Requirements

All endpoints below are under `/api`. Existing authentication/role is stated; validation and response contracts need standardization.

### Public and customer APIs

| Method | Path | Current auth | Required contract/gaps |
|---|---|---|---|
| POST | `/auth/register` | Public | Email/password, name/mobile/confirm password, normalized email, rate limit, generic duplicate policy. |
| POST | `/auth/login` | Public | Email/password, blocked handling, session cookie, brute-force/audit. |
| POST | `/auth/logout` | Optional | Revoke/version session as well as clear cookie. |
| POST | `/auth/forgot-password` | Public | Generic response, hashed one-time token, email queue/provider status, rate limit. |
| POST | `/auth/reset-password` | Public | Token/password, one-time consume, revoke existing sessions. |
| POST | `/auth/admin-login` | Public | Separate admin policy/MFA decision, audit and lockout. |
| GET | `/auth/me` | Auth | Minimal user projection; no unnecessary address exposure. |
| GET/PATCH | `/customer/profile` | Customer | Allow-list, email-change verification decision, password change endpoint needed. |
| GET/POST/PUT/DELETE/POST default | `/customer/addresses...` | Customer | Add coordinates, safe allow-list, concurrency/default invariants. |
| GET | `/categories` | Public | Cache headers/pagination if needed. |
| GET | `/products`, `/products/featured`, `/products/top-selling`, `/products/:slug` | Public | Bound limit/page, regex escaping, indexes, search strategy, stable sort and SEO fields. |
| GET | `/delivery/check/:pin` | Public | Correct active/override semantics, provider timeout/cache, zone/business configuration. Add location reverse-geocode backend policy if required. |
| POST | `/orders` | Customer | Replace with quote/reservation/order contract; validate all fields, units, date, address, stock, coupon and idempotency. |
| GET | `/orders/my`, `/orders/:id` | Customer | Pagination, ownership, consistent snapshots. |
| GET | `/orders/track/:num` | Public | Remove sensitive fields or require tracking secret. |
| GET | `/orders/track/:num/invoice` | Public | Remove public access; authenticated/secret-protected. |
| POST | `/payment/create-order` | Customer | Verify pending order ownership/amount and idempotency; provider config required. |
| POST | `/payment/verify` | Customer | Verify signature, provider order ownership, amount/currency/status, idempotent transition. |
| POST | `/payment/webhook` | Provider | Raw-body signature, event dedupe, durable retry/reconciliation and all relevant events. |
| POST | `/payment/confirm-upi` | Admin | Allow-list, payment evidence, audit, idempotency and status rules. |
| POST | `/coupons/apply` | Optional customer | Treat subtotal as preview only; final server quote authoritative. |
| POST/GET | `/complaints`, `/complaints/my` | Customer | Use order ID or order number consistently, schema validation, categories/status response, attachment policy. |
| POST | `/bulk-enquiry` | Public | Complete schema, abuse/rate limit, consent and notification queue. |
| POST | `/notify-me` | Public/customer | Validate product/phone, consent, dedupe, unsubscribe/retention. |
| GET/POST | `/products/:slug/reviews` | GET public; POST should customer | Verified purchase, schema, moderation, duplicate rule and rate limit. |
| GET | `/business-hours` | Public | Business settings/version/cache. |

### Admin APIs

Existing admin paths cover stats/dashboard, products, categories, orders, customers, coupons, pincodes, complaints, bulk enquiries, business hours, stock logs, reviews and notify subscribers/sending. All currently use `protect` + `adminOnly`, which is a good baseline.

Required additions or redesigns:

- `GET/PATCH /admin/settings` for non-secret business settings.
- `GET/PATCH /admin/delivery-zones` and pincode exception management.
- `POST /admin/orders/:id/cancel`, `/refund`, `/payment-reconcile`, `/retry-notification` with idempotency.
- `GET /admin/reports/sales`, `/inventory`, `/payments`, `/notifications` with bounded filters.
- `GET /admin/audit-logs` with privacy-aware access.
- Explicit status transition API with allowed transition response and actor reason.
- Consistent pagination metadata: `page`, `limit`, `total`, `hasNext`.

### Response/error contract

Adopt one shape for every API:

```json
{
  "success": false,
  "message": "Product not found",
  "code": "PRODUCT_NOT_FOUND",
  "errors": []
}
```

Map 400 validation, 401 unauthenticated, 403 unauthorized/blocked, 404 missing, 409 conflict/idempotency/stock, 422 semantic validation, 429 rate limit, 500 internal and network/provider failures. Never expose stack traces, provider secrets, reset tokens, payment secrets or raw database errors.

## 9. Authentication and Security Requirements

### Already present

- bcryptjs hash cost 12 and password excluded by default.
- JWT in HttpOnly cookie with production secure flag.
- CORS allow-list with credentials.
- Admin middleware on admin routes.
- Helmet, compression, Mongo sanitize, XSS sanitization, rate limiters and request limits.
- Hashed reset token and 30-minute expiry.

### Required changes

- Remove OTP/SMS authentication semantics from configuration, docs, UI copy and logs. Retain WhatsApp only as an order-notification provider abstraction if business-approved; do not use SMS/Twilio for auth.
- Use a strong production JWT secret from secret management; never source credentials from seed code or committed env files.
- Choose a CSRF defense for cookie auth: synchronizer token/double-submit token plus Origin/Referer validation, or use a carefully justified same-site deployment strategy. `SameSite=None` requires explicit CSRF protection.
- Decide whether to remove Bearer-token support. If retained, define revocation and client storage policy; logout cannot invalidate already issued bearer tokens otherwise.
- Add session/token version or session collection and invalidate all sessions on password reset, block, logout policy and security events.
- Use strict schemas for every create/update; reject unknown fields where possible; run Mongoose validators on updates; escape regex search input and bound pagination/limits.
- Add admin lockout/risk controls, optional MFA decision, IP/user-agent audit and re-authentication for refunds/settings/role changes.
- Validate uploads by MIME sniffing/content policy, extension, dimensions, size, count and ownership; use separate folders and signed/private access for complaint evidence.
- Redact phone, email and address data in logs; never log passwords, JWTs, reset tokens, provider secrets or full payment payloads.
- Configure HSTS/secure headers in production and verify CSP does not break the Razorpay integration; pin or self-host the gateway loader policy as supported.
- Add dependency scanning, secret scanning, SAST, lockfile review and Git-history rotation. The audit found secret-bearing configuration names and historical OTP/payment activity; values are intentionally not reproduced here.

## 10. Payments and Order Lifecycle

### Required lifecycle

1. Customer submits a server quote request.
2. Server validates products, quantities, address, delivery, coupon and inventory; creates an idempotent quote/reservation.
3. Server creates Razorpay order for the exact server amount.
4. Customer pays.
5. Browser result is advisory only.
6. Backend verifies raw signature and provider order/payment relationship, amount and currency; webhook is authoritative/reconciling.
7. Atomic state transition marks payment captured, confirms order and finalizes inventory/coupon redemption.
8. Failed/dismissed/expired payment releases reservation and leaves retryable state.
9. Cancellation/refund calls Razorpay server-side, records refund state and handles refund webhooks.
10. Reconciliation job compares local pending/paid/refunded transactions with provider state.

### Order states

Use separate payment, fulfillment and refund states. A minimum fulfillment state machine is `Pending Payment -> Paid/Confirmed -> Processing -> Packed -> Shipped -> Out for Delivery -> Delivered`, with `Cancelled`, `Payment Failed`, `Refund Pending`, `Refunded`, and `Returned/Complaint` as policy-approved alternatives. Reject backward or impossible transitions and record every accepted transition with actor, reason and timestamp.

Each order must snapshot item name, variant/unit, price, quantity, product identifiers, customer contact, full delivery recipient/address, coupon rule/result, delivery rule/fee, tax, payment references and status history. Current catalog edits must not alter historical orders.

## 11. Delivery and Location Requirements

- Keep pincode lookup as a scalable cache-plus-external-resolution design; do not manually preload every Indian pincode.
- Store normalized postal data after a successful lookup, handle unique-key races, provider timeout and stale cache explicitly.
- Separate postal metadata from business serviceability override. `isActive` must not silently turn an explicit non-serviceable override into serviceable fallback.
- Delivery zones should be configurable by priority/rule, with pincode exception records for overrides.
- Return city, district, state, pincode, serviceability, fee, threshold, ETA and reason.
- Validate address/pincode consistency enough for risk control; customer confirms geocoded address rather than silently accepting it.
- Store latitude/longitude only with consent and define retention/privacy policy.
- Validate pickup/delivery date against timezone, business hours, holidays/capacity and minimum lead time.
- Define unavailable-location UX: clear reason, pickup option if eligible, no order creation until serviceable.
- Implement free-delivery threshold and minimum/maximum order from settings, not constants.

## 12. Notifications

Create a provider-neutral notification interface with durable records:

- Email: reset, order confirmation, payment confirmation, invoice, refund and important account events.
- WhatsApp: order placed/confirmed/packed/shipped/out-for-delivery/delivered/cancelled, subject to opt-in and template approval.
- Development: console/sandbox provider explicitly marked `simulated`, never reported as delivered.
- Production: transactional email and WhatsApp Business provider with retries, backoff, provider IDs, failure state, dead-letter/manual retry and monitoring.
- Notifications must be asynchronous from order/payment request paths and idempotent by event/template/recipient/order.
- Remove or isolate Twilio/SMS and all OTP logic. Do not use OTP for customer authentication.

## 13. UX, Accessibility and SEO

### UX gaps and requirements

- Existing pages generally have loading/empty/error patterns, but error recovery and consistency vary. Add a shared API error mapper and retry affordance.
- Checkout needs explicit server quote refresh, stale-cart conflict messaging, payment-pending/retry state and protection from duplicate submission.
- Account needs visible address selection/edit/delete/default confirmation, password change and order cancellation/refund state.
- Tracking/invoice privacy must be redesigned.
- Complaint form must use the same order identifier as the API and show eligible delivered orders where possible.
- Admin needs practical filters, pagination, confirmation for destructive actions, bulk actions where safe, audit context and responsive table behavior.
- Avoid hardcoded legal/fulfillment claims until owner/legal review. Current customer copy contains inconsistent refund/return promises and OTP wording.

### Accessibility

- Every input needs an associated visible label or accessible name and field-level error association.
- Ensure keyboard navigation, visible focus, correct button/disabled/loading semantics, modal focus trap/escape behavior, screen-reader status announcements, sufficient contrast, reduced-motion support and meaningful image alt text.
- Do not use color alone for stock/status/error; use text and icons with accessible names.
- Test mobile touch targets and desktop keyboard workflows.

### SEO

- Add route-specific title, description, canonical URL, Open Graph/Twitter metadata.
- Add Product, Offer, AggregateRating only from truthful data, and BreadcrumbList structured data.
- Generate sitemap and robots.txt for indexable public routes; exclude account/admin/cart/checkout.
- Keep slug URLs stable with redirects when a slug changes.
- Add server/prerender strategy if product metadata must be reliably crawled; client-only metadata is less robust for SEO.
- Optimize Cloudinary `srcset`/responsive sizes and meaningful alt text.

## 14. Performance and Operations

### Performance

- Bound all `page`/`limit` values and add indexes for actual query shapes.
- Replace regex-heavy unindexed search with escaped, indexed strategy or Atlas Search when scale warrants.
- Lazy load routes (already present), inspect bundle size, cache public catalog responses and avoid duplicate requests.
- Use Cloudinary responsive transforms, thumbnails and lazy loading.
- Use aggregation for dashboard metrics with explicit date/timezone filters and avoid repeated count queries.
- Add connection pool/timeouts, provider timeouts, graceful shutdown and job concurrency controls.

### Deployment

Target topology: `magilinifarms.in` frontend, `api.magilinifarms.in` backend, MongoDB Atlas, Cloudinary, Razorpay, transactional email and WhatsApp Business/API.

Required before launch:

- HTTPS/TLS, HSTS, DNS and certificate renewal.
- Exact production CORS origin and cookie domain/same-site plan.
- Separate `magilinifarms_dev`, `magilinifarms_test`, `magilinifarms_prod` with separate credentials and least privilege.
- Required production env validation for every enabled integration; fail fast rather than silently falling back.
- CI build, test, dependency/security scan, migration/index verification and deploy approval.
- Health/readiness endpoint that checks database and critical dependencies without leaking environment detail.
- Graceful shutdown, process manager/container policy, log retention, correlation IDs and rollback artifact.
- Never run seed on normal `dev`, `build` or `start`; production must reject all seed flags, including override bypasses. Bootstrap admin must be provisioned through a controlled one-time process.

## 15. Backup, Recovery and Monitoring

### Backup/recovery

- MongoDB Atlas continuous point-in-time backup plus periodic restore test to an isolated environment.
- Document RPO/RTO decisions: **BUSINESS OWNER DECISION REQUIRED**.
- Cloudinary asset retention/export strategy; preserve public IDs and product references.
- Store environment secrets in managed secret storage with controlled recovery access; do not commit backup copies.
- Write and test restore runbook: database restore, application redeploy, DNS/secret restoration, payment/notification reconciliation and customer communication.
- Maintain migration/index/version records and test rollback of application releases.

### Monitoring

Track API latency/error rate, auth failures, blocked accounts, database health/pool saturation, order creation/payment mismatch, payment failures/webhooks/reconciliation age, stock reservation failures, negative-stock invariant, refund failures, email/WhatsApp failure/retry queues, Cloudinary upload failures, cron/job failures, CPU/memory/disk and frontend JS errors.

Alert on payment/order inconsistency, repeated webhook failures, high 5xx/429, database disconnect, notification backlog, low inventory anomalies and failed backups. Never include secrets or raw personal/payment data in telemetry.

## 16. Testing Matrix

Automated Node.js test coverage and a frontend test command now cover several unit and validation scenarios. The full integration, concurrency, provider-sandbox, security, and end-to-end cases remain release requirements; see [TEST-CASES.md](./TEST-CASES.md) for the complete case matrix and current coverage status.

| Layer | Required scenarios |
|---|---|
| Unit | Price/tax/discount/delivery calculators; unit parsing; status transitions; password reset token; pincode zone rules; notification provider selection. |
| Model | Required fields, enums, unique indexes, password hashing, order snapshots, review eligibility, coupon constraints. |
| API integration | Registration/login/logout/me; blocked account; address ownership; product filters/pagination; delivery cache/provider failure; consistent error contract. |
| Checkout/order | Price change, stock unavailable, invalid quantity, stale quote, duplicate idempotency key, minimum/unit rules, coupon expiry/limits, pickup and date rules. |
| Inventory concurrency | Parallel purchases, atomic decrement, reservation expiry, cancellation/release exactly once, manual adjustment conflict and reconciliation. |
| Payment | Razorpay amount/currency/signature, raw webhook body, duplicate events, browser failure, captured webhook after request failure, failed/authorized/refunded/partial refund events, retry. |
| Auth/security | CSRF, CORS, NoSQL injection, XSS, upload limits/content, brute force, reset one-time use/session revocation, admin/customer authorization, public tracking privacy. |
| Frontend component | Cart persistence/merge, forms and errors, loading/empty/error/success states, duplicate clicks, address/pincode, coupon, payment pending/retry, admin tables/forms. |
| E2E | Register -> login -> browse -> cart -> delivery -> coupon -> Razorpay test payment -> order -> tracking -> review/complaint; admin fulfillment/refund/stock/customer workflows. |
| Operational | Build, production env fail-fast, seed rejection, health/readiness, backup restore, notification failure and rollback smoke tests. |

## 17. Real-World Edge Cases and Expected Behavior

- Browser closes during payment: provider/webhook reconciles; order remains pending until confirmed; reservation expires safely; customer can retry.
- Payment succeeds but API response fails: webhook/reconciliation confirms exactly once; customer sees order after refresh.
- Pay clicked twice: client disables button and server idempotency key returns the same quote/payment/order.
- Stock changes during checkout: atomic reservation returns a conflict with updated availability; no negative stock.
- Price/coupon changes: server quote invalidates and explains changed total before payment.
- Delivery becomes unavailable: final server check fails before payment; reservation is released.
- Network loss after order: idempotent status query/retry resolves rather than creating a duplicate.
- Duplicate webhook/status update: unique event/idempotency records make it a no-op.
- Paid order cancelled: policy determines eligibility; refund is created and tracked, stock restored once.
- Admin adjusts stock incorrectly: immutable audit and compensating adjustment, never silent overwrite.
- Image upload/provider failure: product mutation is not falsely reported complete; orphan cleanup/manual retry exists.
- Email/WhatsApp unavailable: order remains successful, notification is queued/failed separately, support can retry.
- Database outage: fail closed for checkout/payment mutation, health/readiness reports unavailable, no partial stock/order mutation.

## 18. Security and Secrets Audit Summary

The repository contains environment files, configuration names and historical logs related to MongoDB, JWT, Razorpay, Cloudinary, email, Twilio and WhatsApp. This report intentionally does not print values.

Required actions:

- Treat any credentials in `.env*`, logs, seed code or Git history as exposed until proven otherwise.
- Rotate MongoDB, JWT, Razorpay, Cloudinary, email, WhatsApp and Twilio credentials as applicable.
- Remove committed secrets and sensitive logs from tracked history using an approved repository-secret-remediation process.
- Add secret scanning and `.gitignore` rules; keep `.env.example` names/placeholders only.
- Remove hardcoded seed credentials and the README’s sample password. Use controlled admin bootstrap and forced password change.
- Review logs for OTP values, phone numbers, reset links, payment IDs and personal data; redact and rotate as needed.

## 19. Gap Analysis and Priority

| Feature | Current status | Required | Missing/incorrect | Risk | Priority | Recommended action |
|---|---|---|---|---|---|---|
| Auth | Email/password works | Secure sessions/reset | CSRF, bearer revocation, reset session invalidation, legacy OTP remnants | Account takeover | P0 | Finish auth hardening and remove OTP remnants |
| Products | CRUD/catalog works | Complete farm product model | Unit fields, strict admin validation, image metadata | Wrong prices/claims | P1 | Extend schema and contracts |
| Cart | Local cart | Merge/reconcile/reserve | No server cart/reservation | Stale/duplicate checkout | P1 | Add quote/reservation design |
| Checkout | Repricing exists | Atomic server total/payment flow | Order/stock before payment, incomplete validation | Oversell/revenue loss | P0 | Redesign order/payment boundary |
| Payments | Razorpay verify/webhook | Reconciliation/refunds | Raw-body, amount/currency, failure/refund gaps | Financial loss | P0 | Implement payment state machine/reconciliation |
| Orders | Snapshots/history | Valid lifecycle/cancel/refund | Broad transitions, public data, unsafe IDs | Privacy/fulfillment errors | P0 | Protect tracking and enforce transitions |
| Inventory | Stock/logs | Atomic reservation/ledger | Race/negative/duplicate restore | Overselling | P0 | Conditional atomic updates/transactions |
| Coupons | CRUD/preview/final check | Atomic redemption | Race/cancel restoration/delivery semantics | Discount abuse | P1 | Redemption ledger and atomic limits |
| Delivery | Pincode fallback/cache | Configurable rules | Inverted active behavior, hardcoded rules, date gaps | Failed delivery | P1 | Separate zones/overrides/settings |
| Reviews | Public/admin | Verified moderation | Auto-approved public spam | Trust/reputation | P1 | Authenticated eligibility/moderation |
| Complaints | Basic workflow | Correct support workflow | ID contract broken, missing category/response model | Unresolved customer issues | P1 | Align API/UI and add SLA/status model |
| Notifications | Providers exist | Durable async delivery | Console success, no log/retry, SMS legacy | Missed updates | P1 | Provider abstraction + notification logs/queue |
| Admin | Broad screens/APIs | Complete operations/settings/reports | Mass assignment, missing refunds/settings | Operational mistakes | P0 | Strict schemas/audit and missing modules |
| Security | Several middleware controls | Defense in depth | CSRF, upload/privacy/logging/secret issues | High | P0 | Security remediation and threat tests |
| Testing | None | Automated release gate | `npm test` is server start | Undetected regressions | P0 | Add unit/integration/E2E/security suites |
| SEO/accessibility | Basic UI | Crawlable/usable pages | Metadata/schema/sitemap/a11y gaps | Discoverability/exclusion | P2 | Add metadata and accessibility pass |
| Deployment | Scripts/env/health | Operated production | CI/CD, backup/monitoring/rollback | Outage/data loss | P0 | Production runbooks and release gates |
| Legal/trust | Pages exist | Approved accurate policies | Claims need owner/legal review | Consumer/legal risk | P1 | Replace placeholders after review |

## 20. Concrete Completion Estimate

Percentages reflect required capability present and reasonably functional in the current worktree, not visual completeness or code volume.

| Module | Completion |
|---|---:|
| Authentication | 65% |
| Products | 65% |
| Cart | 45% |
| Checkout | 35% |
| Payments | 45% |
| Orders | 50% |
| Delivery | 55% |
| Admin | 60% |
| Notifications | 35% |
| Security | 45% |
| Testing | 5% |
| Deployment | 40% |

## 21. Implementation Roadmap

### Phase 1: Foundation and security

- **Backend:** strict config schema, remove secret/OTP remnants, CSRF, request IDs, strict body schemas, safe updates, upload policy, error contract.
- **Frontend:** shared error/session handling, accessible form/control primitives, consistent loading/error states.
- **Database:** indexes, counter/idempotency/audit/notification collections.
- **Tests:** auth/admin/CSRF/NoSQL/XSS/upload/seed safety.
- **Acceptance:** no secrets in tracked files/history policy, production config fails fast, every admin route remains backend-protected, error shape is stable.

### Phase 2: Authentication

- **Backend:** email/password only, session version/revocation, password change/reset invalidation, admin policy.
- **Frontend:** registration/login/reset/account status and expired-session recovery.
- **Tests:** wrong password, blocked user, reset expiry/reuse, logout/session invalidation.
- **Acceptance:** all auth requirements pass without OTP or localStorage JWT.

### Phase 3: Products and categories

- **Backend/database:** unit-aware product/variant fields, image metadata, strict admin schemas, archive rules/indexes.
- **Frontend:** product editor, image reorder/alt, search/filter/sort/pagination and states.
- **Tests:** catalog queries, validation, image failures and historical order immutability.
- **Acceptance:** customer can discover accurate, responsive product data.

### Phase 4: Cart and checkout foundation

- **Backend:** server quote, idempotency, address validation, cart merge/reservation strategy, authoritative total.
- **Frontend:** stale-cart reconciliation, quote refresh, clear totals and duplicate-submit protection.
- **Database:** reservation/quote fields and indexes.
- **Tests:** price/stock/coupon conflicts and concurrency.
- **Acceptance:** no frontend value can alter final amount or stock outcome.

### Phase 5: Delivery

- **Backend:** configurable zones, pincode cache/override correctness, geolocation policy, date/business rules.
- **Frontend:** manual/geolocation flows with confirmation and unavailable handling.
- **Database:** zones/settings and postal indexes.
- **Tests:** provider failure, cache race, blocked pincode, pickup/date rules.
- **Acceptance:** serviceability and fee are deterministic and configurable.

### Phase 6: Payments

- **Backend:** raw webhook verification, provider reconciliation, idempotent payment state, failures/refunds.
- **Frontend:** retry/pending/failure/recovery UX.
- **Database:** payment/refund/event ledger.
- **Tests:** signatures, amounts, duplicate callbacks, browser failure and refund lifecycle.
- **Acceptance:** payment success is confirmed server-side and recoverable after any client failure.

### Phase 7: Orders and inventory

- **Backend:** state machine, atomic reservation/decrement/release, cancellation/refund rules, delivery assignment.
- **Database:** immutable snapshots, stock ledger and counters.
- **Frontend/admin:** timeline, retry/cancel/support, operational status controls.
- **Tests:** parallel orders, duplicate cancellation, historical data and transitions.
- **Acceptance:** no overselling, negative stock or double restoration under tested concurrency.

### Phase 8: Notifications

- **Backend:** provider abstraction, async queue/log/retry, opt-in and templates.
- **Frontend/admin:** notification status only where operationally useful.
- **Tests:** simulated provider, provider outage, retry/idempotency/redaction.
- **Acceptance:** simulated delivery is distinguishable from delivered; order success never depends on provider availability.

### Phase 9: Admin operations

- **Backend:** settings, delivery zones, reports, refunds, audit, strict schemas and permissions.
- **Frontend:** practical filters, pagination, confirmations, responsive data tables and error recovery.
- **Tests:** role boundaries and critical admin mutation audit.
- **Acceptance:** owner can operate products, orders, inventory, customers, delivery, promotions and support without database access.

### Phase 10: Reviews, complaints and bulk

- **Backend:** verified review eligibility, moderation, complaint categories/SLA/response, complete bulk workflow.
- **Frontend:** customer history/submission and admin queues.
- **Tests:** eligibility, duplicate abuse, attachment limits, complaint window and status notifications.
- **Acceptance:** support and trust workflows are end-to-end and auditable.

### Phase 11: Testing and release gates

- Add unit, integration, API, security, frontend and E2E suites; replace `npm run test`; add CI with coverage and build gates.
- **Acceptance:** critical flows pass in isolated test database with payment sandbox and no flaky release blockers.

### Phase 12: Performance, SEO and accessibility

- Add indexes/query review, caching, image transforms, metadata/structured data/sitemap, keyboard/screen-reader/contrast/reduced-motion fixes.
- **Acceptance:** agreed performance budgets, crawl checks and accessibility test checklist pass on mobile/desktop.

### Phase 13: Production deployment

- Configure domains/TLS/CORS/cookies, Atlas backups, Cloudinary, Razorpay production, email/WhatsApp, monitoring, alerts, rollback and restore runbooks.
- **Acceptance:** staging-to-production checklist, smoke test, backup restore test, payment webhook test, alert test and rollback rehearsal are documented and successful.

## 22. Definition of Done

The application is complete only when:

- Email/password registration, login, logout, blocked handling and one-time reset work securely; no OTP authentication remains.
- Customer can browse/search/filter/sort products, view accurate details and use a persistent/merged cart.
- Checkout uses server-authoritative prices, stock, coupons, delivery and totals; duplicate and stale submissions are safe.
- Manual pincode and consented location flows resolve/confirm address and serviceability; pickup and configured delivery rules work.
- Razorpay payments are verified by backend signature/provider state, webhook-reconciled, idempotent, retryable and refundable according to approved policy.
- Orders have immutable snapshots, safe lifecycle transitions, tracking privacy, invoices, cancellation/refund behavior and complete history.
- Inventory cannot go negative or oversell under concurrency; reservations, releases and stock logs reconcile exactly once.
- Customer receives durable, monitored email/WhatsApp notifications and can review/complain within approved rules.
- Admin can securely manage products, categories, stock, orders, customers, coupons, delivery, reviews, complaints, bulk enquiries, settings and useful reports.
- All admin APIs enforce backend authorization; strict schemas prevent mass assignment and audit critical actions.
- No secrets or sensitive tokens are exposed; credentials are rotated and managed outside source/history.
- Production cannot seed; dev/test/prod databases and credentials are separated.
- API errors, loading/empty/error/success states, mobile responsiveness, accessibility basics and SEO basics are verified.
- Unit, integration, API, security and E2E tests pass in CI; frontend/backend builds pass.
- HTTPS, CORS/cookie policy, health/readiness, logging, monitoring, alerts, backups, restore, rollback and troubleshooting documentation are tested.
- Legal/trust copy is reviewed and approved by the business owner/legal advisor; no unapproved claims remain.

## 23. Recommended Immediate Sequence

1. Freeze production launch and rotate any exposed credentials.
2. Fix order/payment/inventory boundaries and public tracking/invoice privacy.
3. Add CSRF/session revocation, strict admin schemas, payment raw-body verification and refund/reconciliation design.
4. Align complaint contracts, unit-aware quantity rules, delivery override semantics and status transitions.
5. Add automated tests before further feature expansion.
6. Resolve owner decisions, then implement the roadmap phase by phase with acceptance tests.
