# MagiliniFarms Test Cases

This matrix translates the requirements and edge cases in `MAGILINIFARMS-ANALYSIS-REPORT.md` into verifiable checks. It includes planned integration and end-to-end cases as well as scenarios covered by the current isolated automated tests. Cases marked **Integration/E2E** require the corresponding database, provider sandbox, or browser test setup; they are not claimed as automated by the current unit suite.

## Run current automated tests

Unit tests are kept separate from application source under `backend/tests` and `frontend/tests`.

```bash
cd backend
npm test

cd ../frontend
npm test
```

## Unit and model cases

| ID | Scenario | Expected result | Current coverage |
|---|---|---|---|
| UT-01 | Convert kg, g, and piece labels that contain a weight | Return the correct kilogram amount; unparseable labels return zero | Automated: backend weight tests |
| UT-02 | Enable Direct UPI at the exact minimum, above it, or without a configured VPA | Only a subtotal strictly above ₹2,000 and a configured VPA enables Direct UPI | Automated: backend payment-policy tests |
| UT-03 | Expire an old pending online order | Filter includes online methods, pending payment, New status, and orders older than expiry | Automated: backend payment-policy tests |
| UT-04 | Ensure pay-at-farm orders are not expired by the online payment job | Pay-at-farm is excluded | Automated: backend payment-policy tests |
| UT-05 | Determine product stock status for absent/empty variants and zero stock | Report out-of-stock without throwing | Automated: backend Product model tests |
| UT-06 | Determine product stock status when any variant has 1–10 units | Report low-stock | Automated: add/maintain model test |
| UT-07 | Determine product stock status when every variant has more than 10 units | Report in-stock | Automated: add/maintain model test |
| UT-08 | Reject seed execution in production, without explicit enablement, without `--force`, or with a production override | Reject each unsafe invocation with the relevant policy error | Automated: seed-policy tests |
| UT-09 | Validate registration, login, reset-password, profile, and address payloads at valid and invalid boundaries | Accept valid values; reject missing required values, malformed email/phone/pincode, short password, and invalid address type | Automated: backend API-validator tests |
| UT-10 | Validate order/payment IDs, Razorpay signature fields, UPI reference length/characters, and optional UPI confirmation reference | Accept valid payloads; reject missing IDs/signature and malformed references | Automated: backend API-validator tests |
| UT-11 | Validate coupon apply/admin coupon, admin pincode, product variants, and stock adjustment | Accept valid values; reject negative amounts/stock, invalid enums, malformed JSON, empty variants, and invalid usage limits | Automated: backend API-validator tests |
| UT-12 | Validate required fields, email, phone, pincode, minimum length, and positive numbers in the browser | Return true only for valid values and handle empty/null inputs consistently | Automated: frontend validator tests |
| UT-13 | Validate a form with multiple field rules | Return an errors object containing the first failure per field, or an empty object when all pass | Automated: frontend validator tests |
| UT-14 | Select notification behavior for configured and missing providers | Correct provider is selected; unavailable delivery is reported without claiming delivery | Automated: notification service tests; expand with provider mocks |
| UT-15 | Enforce schema required fields, enums, unique indexes, snapshots, and coupon constraints | Invalid documents fail validation; schema indexes and defaults hold | Automated: model validation; database uniqueness and review eligibility remain integration |

## Authentication and account API

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| AUTH-01 | Register with valid details; register with duplicate email | First request creates one account; duplicate returns a conflict without creating another | Unit + Integration |
| AUTH-02 | Register with missing name, malformed email/phone, weak password, or mismatched confirmation | Request is rejected with field-level validation; no account is created | Unit + Integration |
| AUTH-03 | Login with correct password, incorrect password, unknown email, or blocked account | Only an active account with correct credentials receives a session; other cases use safe, consistent errors | Unit + Integration |
| AUTH-04 | Fetch current user with valid, missing, malformed, and expired credentials | Valid session returns the caller's account; invalid credentials are unauthorized | Integration |
| AUTH-05 | Logout and then reuse the prior session/token | Session is cleared/revoked according to the auth contract; protected endpoints reject it | Integration |
| AUTH-06 | Request reset for known and unknown email; redeem valid, expired, reused, or malformed token | Response does not disclose account existence; token is one-time and expired tokens cannot change password | Unit + Integration |
| AUTH-07 | Change/reset password while another session exists | Password change succeeds only with a valid reset; sessions are revoked if required by the security contract | Integration |
| AUTH-08 | Customer accesses another customer's address, profile, or order | Access is denied; no other customer's personal data is returned or changed | Integration |
| AUTH-09 | Submit CSRF, hostile CORS origin, NoSQL operator, XSS payload, or repeated login attempts | Requests are rejected/neutralized/rate-limited according to middleware policy | Integration/Security |

## Catalog, cart, delivery, and checkout

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| SHOP-01 | Browse products with no filters, category/search filters, sort, and pagination | Correct active products and stable page metadata are returned | Unit + Integration |
| SHOP-02 | Browse with invalid page/limit/sort or no matching products | Safe validation error or empty result; no server error | Integration |
| SHOP-03 | Load a product by valid, unknown, inactive, and malformed ID/slug | Only eligible products are shown; invalid identifiers use the standard not-found/error contract | Unit + Integration |
| SHOP-04 | Add, update, remove, persist, and restore cart entries | Quantities and selected variants remain consistent; invalid or removed products are reconciled | Frontend/E2E |
| SHOP-05 | Merge a persisted guest cart after login | Duplicate variants combine according to cart rules; unavailable items are surfaced | Frontend/E2E |
| DEL-01 | Check a serviceable, unserviceable, unknown, malformed, and inactive pincode | Correct delivery eligibility, fee, and estimate are returned; invalid input is rejected | Unit + Integration |
| DEL-02 | Delivery provider/cache succeeds, misses, times out, or fails | Cached/provider/fallback behavior is deterministic and errors are visible without false serviceability | Integration |
| CHECK-01 | Checkout valid cart/address and supported delivery date/pickup | Server-calculated quote is shown and order proceeds only when all eligibility rules pass | Integration/E2E |
| CHECK-02 | Submit empty cart, invalid quantity, missing variant, below-minimum quantity, or unavailable stock | Checkout is rejected before payment; customer receives actionable availability/validation feedback | Integration |
| CHECK-03 | Change price, stock, coupon, or delivery availability after quote creation | Stale quote is rejected and updated totals/availability are shown before payment | Integration |
| CHECK-04 | Submit duplicate checkout requests with the same idempotency key or double-click Pay | Same quote/order is returned; no duplicate order or charge is created | Integration/E2E |
| CHECK-05 | Try pickup/date rules, unsupported delivery day, or a pincode/address mismatch | Invalid fulfillment selection is rejected before payment | Integration |

## Coupons, orders, inventory, and payments

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| ORDER-01 | Apply valid, expired, exhausted, below-minimum, per-user-exhausted, and unknown coupon | Only eligible coupons discount the server-calculated amount; all other cases explain rejection | Integration |
| ORDER-02 | Redeem a coupon concurrently at its usage limit; cancel an order using a coupon | Limit is enforced atomically; cancellation restores eligibility only according to policy | Integration |
| ORDER-03 | Create an order when price changes or stock becomes unavailable during checkout | No stale-price order or oversell; reservation/quote conflict is returned | Integration |
| INV-01 | Two customers buy the last unit concurrently | At most one reservation/purchase succeeds; stock never becomes negative | Integration/Concurrency |
| INV-02 | Expire/cancel a reservation; repeat cancellation or stock restoration | Reserved stock releases exactly once; duplicate events do not over-restore | Integration |
| INV-03 | Admin adjusts stock concurrently with checkout or another adjustment | Atomic update/audit behavior prevents silent overwrite and records actor/reason | Integration |
| PAY-01 | Create Razorpay order with expected amount and currency | Provider order matches server-side quote; client-supplied totals are ignored | Integration/Provider sandbox |
| PAY-02 | Verify valid signature, invalid signature, wrong amount/currency, and mismatched order owner | Only authentic matching payments confirm the correct order | Integration/Provider sandbox |
| PAY-03 | Process original raw webhook bytes with valid/invalid signature and duplicate event ID | Authentic event is applied once; reserialized-body signatures fail; invalid event is rejected; duplicate is a no-op | Automated + Integration/Provider sandbox |
| PAY-04 | Browser payment failure, authorized-but-not-captured, captured webhook after API failure, and ambiguous order-creation timeout | Order state follows provider-confirmed state; captured unmatched events remain visible for reconciliation; ambiguous creates are not blindly retried | Integration/Provider sandbox |
| PAY-05 | Payment succeeds but browser closes, network drops, or API response fails | Refresh/status lookup or webhook reconciles the same order; no duplicate charge/order | E2E/Provider sandbox |
| PAY-06 | Process failed, refunded, partial-refund, and repeated refund events | State and refund amounts reconcile exactly once; invalid transitions are rejected | Integration/Provider sandbox |
| PAY-07 | Pending online payment expires; pending pay-at-farm order is checked by the expiry job | Only eligible pending online orders expire; pay-at-farm orders remain unchanged | Automated policy + Integration |
| ORDER-04 | Customer requests tracking for own, another customer's, unknown, or malformed order | Only authorized/minimized tracking information is exposed | Integration/Security |
| ORDER-05 | Attempt every allowed and disallowed order status transition | Valid transitions succeed; invalid transitions are rejected and recorded | Integration |

## Support, reviews, and admin

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| SUPPORT-01 | Submit valid/invalid complaint and list complaint details | Complaint is recorded with correct owner/status; other users' complaints remain private | Integration/E2E |
| SUPPORT-02 | Bulk enquiry with valid, missing, and malformed contact/product fields | Valid enquiry is recorded and notified; invalid payload receives validation errors | Integration |
| REVIEW-01 | Eligible purchaser submits a review; guest/non-purchaser submits one; same user submits twice | Eligibility, moderation, and duplicate policy are enforced | Integration |
| ADMIN-01 | Customer accesses admin route/API; admin accesses protected operations | Customer is forbidden; authorized admin succeeds; unauthenticated request is unauthorized | Integration/Security |
| ADMIN-02 | Create/update/delete product, category, coupon, pincode, and business hours with valid/invalid payloads | Valid changes persist; invalid fields, mass assignment, and unauthorized updates are rejected | Integration |
| ADMIN-03 | Admin lists/filters customers, orders, complaints, enquiries, and stock logs | Filters, pagination, data ownership, and response shape are consistent | Integration |
| ADMIN-04 | Fulfill/cancel/refund an order and manually adjust stock | Legal state transitions, audit trail, inventory release, and refund status remain consistent | Integration/E2E |
| ADMIN-05 | Upload allowed image, oversized file, unsupported type, and provider-failing image | Only allowed uploads persist; failure is surfaced and partial product mutation/orphaned media is handled | Integration |

## Frontend and end-to-end

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| UI-01 | Every form receives valid input, missing values, malformed values, and server validation errors | Correct inline errors are shown; valid submission sends expected payload | Automated helper + component |
| UI-02 | Cart, checkout, login, and admin screens render loading, empty, error, and success states | Each state is understandable, actionable, and does not show stale success data | Component/E2E |
| UI-03 | Repeat submit/pay clicks; lose network during submission; retry | Submit is guarded while pending; retry is safe and does not duplicate the operation | Component/E2E |
| UI-04 | Address/pincode, coupon, payment-pending, and payment-retry workflows | User selections/errors remain consistent with the server's latest quote/status | Component/E2E |
| E2E-01 | Register → login → browse → cart → delivery → coupon → test payment → order confirmation → tracking | One order is created with correct amount, ownership, inventory, and status | E2E |
| E2E-02 | Purchase → verify eligibility → submit review/complaint | Support/review workflows attach to the correct customer/order | E2E |
| E2E-03 | Admin login → fulfill/refund order → adjust stock → inspect customer/order history | Admin actions are authorized, audited, and reflected in customer-visible state | E2E |
| A11Y-01 | Keyboard-only navigation, labels/error announcements, focus order, contrast, and small viewport | Core flows remain usable with keyboard and assistive technology and on mobile | Manual/Accessibility automation |
| SEO-01 | Product/legal pages, metadata, canonical links, structured data, sitemap | Public pages expose correct crawlable metadata without leaking private/admin data | Integration/Manual |

## Operational and failure recovery

| ID | Scenario | Expected result | Coverage |
|---|---|---|---|
| OPS-01 | Production starts with missing/invalid required environment values | Process fails fast with safe, actionable configuration errors | Integration |
| OPS-02 | Readiness/health with database connected, disconnected, or pool exhausted | Health accurately reports dependency availability; mutation endpoints fail closed | Integration |
| OPS-03 | Database outage during checkout/order/payment mutation | No partial order, payment, or stock mutation remains; service reports failure | Integration |
| OPS-04 | Email/WhatsApp provider unavailable, times out, or rejects a notification | Customer order remains successful; delivery failure is tracked/retryable and not reported as delivered | Automated simulation + Integration |
| OPS-05 | Scheduled job fails or notification backlog grows | Failure is observable/alertable and retry does not duplicate customer actions | Integration |
| OPS-06 | Backup restore, deployment rollback, build, and production smoke test | Data is recoverable and release gate catches failed build/health checks | Operational/Manual |
| OPS-07 | Telemetry receives auth/payment/order errors | Metrics omit secrets and raw personal/payment data while exposing actionable error counts | Integration/Security |

## Source-file coverage index

The following index maps every application source file under `backend/src` and `frontend/src` to focused tests. **Automated** means an executable test currently exists; **Planned** is a concrete test case for the corresponding integration, component, or end-to-end suite. Tests listed as planned are not represented as already implemented.

### Backend source files

| Source file | Test cases and expected results | Coverage |
|---|---|---|
| `backend/src/bootstrap.ts` | Start in test/development with valid configuration; verify one server startup and database initialization. Start with invalid configuration or database connection failure; verify explicit failure and no false-ready state. | Planned: startup integration |
| `backend/src/server.ts` | Verify security/CORS/body parsing/routes/error handling/404 middleware order; allowed origin succeeds, disallowed origin is rejected, unknown path returns the standard 404, health/readiness reflects database availability. | Planned: API integration |
| `backend/src/config/cloudinary.js` | Verify product and complaint uploads use the correct storage and destinations; accept allowed image uploads within size/count limits; reject oversized files, excess files, and invalid content types. | Planned: upload integration |
| `backend/src/config/database.ts` | Connect successfully once; handle missing/invalid URI and connection failure with diagnostics that mask credentials; disconnect cleanly when connected and when already disconnected. | Planned: database integration |
| `backend/src/config/env.ts` | Parse valid environment configurations for development/test/production; reject missing required secrets, invalid ports/URLs/booleans; reject unsafe environment/database mismatches; ensure logged URI diagnostics never reveal credentials. | Planned: config unit/integration |
| `backend/src/controllers/authController.js` | Cover registration normalization/password mismatch/duplicate email, login success and failure cases, admin login failure, reset-token expiry and use, current-user response, and logout cookie clearing. | Automated: controller unit |
| `backend/src/controllers/customerController.js` | Cover profile normalization/duplicate email, profile and address reads, default-address selection, deleting the default address, and missing/foreign address IDs. | Automated: controller unit |
| `backend/src/controllers/miscController.js` | Normalize coupon code and cap percentage discount; remaining public/admin actions remain planned. | Automated: controller unit (partial) |
| `backend/src/controllers/orderController.js` | Reject missing/invalid idempotency keys, replay an identical request, and reject key reuse with a different request hash; full quote/order and lifecycle scenarios remain planned. | Automated: controller unit (partial) |
| `backend/src/controllers/paymentController.js` | Cover Direct UPI reference ownership and validation, invalid Razorpay order/verification inputs, and missing webhook secret; provider/database flows remain planned. | Automated: controller unit (partial) |
| `backend/src/controllers/productController.js` | Cover active product listing/search/filter/sort/pagination, category and detail lookup, creation/validation/uploads, and archive behavior; remaining admin CRUD scenarios remain planned. | Automated: controller unit (partial) |
| `backend/src/middleware/auth.js` | Authenticate a Bearer token, reject missing/blocked credentials, allow invalid optional credentials through anonymously, and enforce role guards. | Automated: middleware unit (partial) |
| `backend/src/middleware/errorHandler.js` | Map application/validation/duplicate/JWT errors, forward async failures, hide server error details, and format 404 responses. | Automated: middleware unit |
| `backend/src/middleware/rateLimiter.js` | Stay below and cross each login/register/reset/API/payment/upload limit; assert allowed requests pass, excess requests return the configured 429 response, and separate limiter policies do not interfere. | Planned: middleware integration |
| `backend/src/middleware/validate.js` | Parse valid data, assign transformed request parts, format Zod issues as 422, and forward non-Zod errors. | Automated: middleware unit |
| `backend/src/middleware/xssProtection.js` | Sanitize nested body/query/params strings while preserving other values. | Automated: middleware unit |
| `backend/src/models/Category.js` | Check defaults and required name/slug validation; unique-index behavior remains planned. | Automated: model validation (partial) |
| `backend/src/models/index.js` | Exercise shared model exports through service/controller tests; complete registration/duplicate-import checks remain planned. | Automated: indirect; Planned: registry unit |
| `backend/src/models/Order.js` | Check payment/fulfillment defaults, enum validation, and new inventory/idempotency fields; complete snapshot and database-index cases remain planned. | Automated: model validation (partial) |
| `backend/src/models/Product.js` | Validate required fields, unique lowercase slug, variant/image/season enums and defaults; stock virtual returns out-of-stock for none/zero, low-stock at 1–10, and in-stock when all variants exceed ten. | Automated: stock-status and schema-validation tests; database uniqueness remains planned |
| `backend/src/models/User.js` | Check email/name normalization, defaults, required fields, role validation, password comparison, and reset-token digest/expiry behavior; serialization cases remain planned. | Automated: model validation (partial) |
| `backend/src/routes/index.js` | Assert representative public/protected route declarations and middleware order without importing application infrastructure. | Automated: route declaration unit (partial) |
| `backend/src/scripts/seed-policy.ts` | Allow only non-production seed when enabled and forced; reject production, missing enablement/force, and production override. | Automated: seed-policy tests |
| `backend/src/scripts/seed-safe.ts` | With each prohibited policy combination, verify no database writes occur; with allowed flags, seed only permitted records; ensure dry-run/status output does not expose secrets and existing records are not deleted. | Planned: script integration |
| `backend/src/scripts/verify-seed.ts` | Verify correct seeded database reports expected records; empty/wrong database reports failure; database errors exit non-zero without printing credentials. | Planned: script integration |
| `backend/src/services/deliveryService.js` | Reject malformed pincodes with 400; honor cached serviceability overrides; cache postal results and derive zones; report upstream/malformed/not-found errors with correct status. | Automated: mocked service unit |
| `backend/src/services/invoiceService.js` | Generate valid PDF content for delivery and pickup orders with optional totals; handle stream failures. | Automated: service unit (PDF validity and fulfillment variants); stream failures remain planned |
| `backend/src/services/notificationService.js` | Simulate notification providers; verify configured WhatsApp request content and ensure provider failure is not reported as delivered; test order/status/low-stock/complaint/bulk/season message templates. | Automated: console simulation, provider success/failure mocks, and notification event templates |
| `backend/src/services/email/emailService.js` | Test non-production console fallback and password-reset message content; SMTP provider cases remain planned. | Automated: service unit (partial) |
| `backend/src/services/inventoryService.js` | Merge repeated variant rows and reject conflicting prices before reservation. | Automated: service unit (partial) |
| `backend/src/services/razorpayService.js` | Verify webhook signatures against exact raw bytes and compare payment signatures safely. | Automated: service unit |
| `backend/src/services/manualPaymentService.js` | Cover manual UPI and pay-at-farm confirmation, fulfillment status preservation, invalid/expired reservations, and transaction recording. | Automated: mocked service unit |
| `backend/src/services/refundService.js` | Cover ineligible/no-op refunds, manual-payment reconciliation, unknown and processed refund webhooks, and manual refund confirmation. | Automated: mocked service unit; provider/database integration remains planned |
| `backend/src/utils/httpError.ts` | Verify each helper constructs the expected status/message/errors and response helpers preserve their contracts. | Automated: utility unit |
| `backend/src/utils/logger.ts` | Write structured entries and trim Morgan stream lines using an isolated temporary log directory. | Automated: utility unit (partial) |
| `backend/src/utils/paymentPolicy.js` | Direct UPI is enabled only above ₹2,000 with configured VPA; expiry filter includes only pending online methods/New orders older than expiry and excludes pay-at-farm. | Automated: payment-policy tests |
| `backend/src/utils/response.ts` | Verify success/error response keys and defaults; provided extra fields merge as expected. | Automated: utility unit |
| `backend/src/utils/weight.js` | Convert supported kg/g labels and decimals; return zero for unsupported or empty values. | Automated: backend and frontend unit |
| `backend/src/validators/apiValidators.js` | Valid and invalid inputs for auth, profile/address, payment, UPI, coupon, pincode, product variants/stock, admin pincode, and admin coupon schemas. | Automated: API-validator tests |

### Backend test source files

| Test file | Cases it must keep executable | Coverage |
|---|---|---|
| `backend/tests/controllers/controllers.test.ts` | Cover generic forgot-password response, malformed product variants, order idempotency validation/replay/conflict, configured Direct UPI options, and coupon normalization/discount/eligibility limits. | Automated |
| `backend/tests/models/Product.test.ts` | Missing/null variants, zero stock, low stock boundary (10), and all variants above the low-stock threshold. | Automated |
| `backend/tests/models/modelValidation.test.ts` | User, category, product, order, and coupon defaults and schema validation; password comparison/reset-token digest and expiry; order snapshot requirements and partial idempotency index. | Automated |
| `backend/tests/controllers/authController.test.ts` | Registration, login, reset-password, current-user, and logout success/error cases. | Automated |
| `backend/tests/controllers/customerController.test.ts` | Profile/address reads and updates, default-address lifecycle, duplicate email, and missing/foreign address IDs. | Automated |
| `backend/tests/controllers/paymentController.test.ts` | Direct UPI reference validation/ownership, malformed Razorpay requests, and missing webhook configuration. | Automated |
| `backend/tests/controllers/productController.test.ts` | Public listing filters/pagination, category/detail lookup, creation/upload validation, and archive behavior. | Automated |
| `backend/tests/scripts/seed-policy.test.ts` | Explicitly enabled/forced non-production allowed; production, override, missing enablement, or missing force rejected. | Automated |
| `backend/tests/services/notificationService.test.ts` | Console SMS and WhatsApp results/logs say simulated rather than delivered, and environment variables/console methods are restored after each test. | Automated |
| `backend/tests/services/invoiceService.test.ts` | Delivery and pickup invoice paths produce non-empty PDF documents. | Automated |
| `backend/tests/services/manualPaymentService.test.ts` | Manual UPI and pay-at-farm confirmation, order state preservation, reservation expiry, and invalid-state rejection. | Automated |
| `backend/tests/services/refundService.test.ts` | Refund eligibility, manual-payment reconciliation, webhook handling, and manual refund confirmation. | Automated |
| `backend/tests/utils/paymentPolicy.test.ts` | Direct UPI threshold/configuration boundaries and exact pending-online-order expiry filter. | Automated |
| `backend/tests/utils/weight.test.ts` | kg/g/piece-embedded weights and unsupported label conversion. | Automated |
| `backend/tests/validators/apiValidators.test.ts` | Valid/invalid boundaries for all schemas currently exported by the validator module. | Automated |

### Frontend source files

| Source file | Test cases and expected results | Coverage |
|---|---|---|
| `frontend/src/App.vue` | Mount app; verify global toast rendering and persisted cart initialization. | Automated: component unit |
| `frontend/src/main.js` | Install Pinia/router and mount root application. | Automated: bootstrap unit |
| `frontend/src/components/layout/AppFooter.vue` | Verify footer contact/business details and policy navigation. | Automated: component unit (partial) |
| `frontend/src/components/layout/AppNavbar.vue` | Verify public links/cart count, mobile/search menu, authenticated admin actions, and logout navigation. | Automated: component unit (partial) |
| `frontend/src/components/payment/DirectUpiPayment.vue` | Load options; encode UPI URI; validate/submit UTR; display unavailable and previously-submitted states. | Automated: component unit (partial) |
| `frontend/src/components/shop/ProductCard.vue` | Render pricing/discount; add available variant; validate and submit notify flow; navigate to product. | Automated: component unit (partial) |
| `frontend/src/components/ui/PasswordInput.vue` | Toggle visibility, preserve value, forward attributes, and emit model updates. | Automated: component unit |
| `frontend/src/lib/api.js` | Normalize API base URLs; configure credentials/JSON header; dispatch auth-expired only for protected 401 responses. | Automated: unit |
| `frontend/src/lib/validators.js` | Required/email/phone/pincode/minimum-length/positive-number boundary cases; report first failing rule per field and no errors when all pass. | Automated: frontend validator tests |
| `frontend/src/lib/weight.js` | Convert kg/g/decimal/piece labels and unsupported values consistently with backend. | Automated: unit |
| `frontend/src/router/index.js` | Verify route registration, guest/customer/admin guard redirects, return URL, and scroll behavior. | Automated: router unit |
| `frontend/src/stores/index.js` | Cover auth, cart persistence/stock bounds/totals, toasts, product/category loading/cache, and pincode persistence/errors. | Automated: store unit |
| `frontend/src/views/AboutView.vue` | Render story content and key public facts. | Automated: static-view unit (partial) |
| `frontend/src/views/AccountView.vue` | Exercise profile/address loading, validation, and editing with API mocks. | Automated: view unit |
| `frontend/src/views/BulkView.vue` | Validate and submit bulk enquiry with mocked API. | Automated: view unit |
| `frontend/src/views/CartView.vue` | Render cart state and exercise coupon/quantity interactions. | Automated: view unit |
| `frontend/src/views/CheckoutSuccessView.vue` | Render success/pending payment state and order summary with mocked API/router. | Automated: view unit |
| `frontend/src/views/CheckoutView.vue` | Exercise checkout validation and payment/delivery state with mocked dependencies. | Automated: view unit (partial) |
| `frontend/src/views/ComplaintView.vue` | Validate complaint fields/photo requirement and submit multipart form. | Automated: view unit (partial) |
| `frontend/src/views/ContactView.vue` | Validate and submit contact form using mocked API. | Automated: view unit |
| `frontend/src/views/FaqView.vue` | Toggle an FAQ answer and verify expanded/collapsed content. | Automated: static-view unit |
| `frontend/src/views/ForgotPasswordView.vue` | Validate email and display reset-request confirmation after success. | Automated: auth-view unit |
| `frontend/src/views/HomeView.vue` | Render featured/catalog content using mocked stores/API. | Automated: view unit |
| `frontend/src/views/LoginView.vue` | Validate credentials, submit success, and honor redirect query. | Automated: auth-view unit |
| `frontend/src/views/NotFoundView.vue` | Render not-found content and home/shop navigation. | Automated: static-view unit |
| `frontend/src/views/OrderDetailView.vue` | Render customer order detail and handle mocked loading/error states. | Automated: view unit |
| `frontend/src/views/PrivacyView.vue` | Render privacy heading and policy content. | Automated: static-view unit |
| `frontend/src/views/ProductView.vue` | Load product/variant state and exercise add-to-cart behavior with mocks. | Automated: view unit |
| `frontend/src/views/RegisterView.vue` | Validate registration and submit normalized user details. | Automated: auth-view unit |
| `frontend/src/views/ResetPasswordView.vue` | Validate and submit new password with route token. | Automated: auth-view unit |
| `frontend/src/views/ReturnsView.vue` | Render return policy and complaint navigation. | Automated: static-view unit |
| `frontend/src/views/ShopView.vue` | Exercise mocked catalog search/filter/pagination states. | Automated: view unit |
| `frontend/src/views/TermsView.vue` | Render terms heading and policy content. | Automated: static-view unit |
| `frontend/src/views/TrackView.vue` | Validate tracking input and display mocked order status. | Automated: view unit |
| `frontend/src/views/admin/AdminLayout.vue` | Require admin session; render admin navigation and logout behavior. | Automated: view unit |
| `frontend/src/views/admin/AdminLoginView.vue` | Validate credentials and redirect after successful authentication. | Automated: view unit |
| `frontend/src/views/admin/BulkEnquiriesView.vue` | Load and render enquiries; update status; surface failed update without claiming success. | Automated: component unit (partial) |
| `frontend/src/views/admin/BusinessHoursView.vue` | Load/edit/save hours; surface API errors and clear the saving state. | Automated: component unit (partial); interval validation is not implemented in the view |
| `frontend/src/views/admin/CategoriesView.vue` | Validate required fields; submit category; surface duplicate/API errors without false success. | Automated: component unit (partial) |
| `frontend/src/views/admin/ComplaintsView.vue` | Load complaint details and photos; update resolution status. | Automated: component unit (partial) |
| `frontend/src/views/admin/CouponsView.vue` | Validate required code/value; submit coupon; surface duplicate/API errors without clearing the form. | Automated: component unit (partial) |
| `frontend/src/views/admin/CustomersView.vue` | Render customer data and send matching block action. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/DashboardView.vue` | Render dashboard summary metrics and recent order data. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/OrderDetailView.vue` | Render order details and exercise status/payment actions with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/OrdersView.vue` | Render and interact with order list using mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/PincodesView.vue` | Exercise pincode list and editing with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/ProductFormView.vue` | Validate product form and submit create/edit state with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/ProductsView.vue` | Render product list and exercise product actions with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/ReviewsView.vue` | Render review list and exercise moderation with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/StockLogsView.vue` | Render stock adjustment log data with mocked API. | Automated: admin view unit (partial) |
| `frontend/src/views/admin/PaymentReconciliationView.vue` | Render reconciliation records and empty state; show API errors and recover on retry. | Automated: admin view unit |

### Executable test source files

| Test file | Cases it must keep executable | Coverage |
|---|---|---|
| `backend/tests/**/*.test.ts` | Controller, middleware, model, route, service, utility, validator, and seed-policy unit cases. | Automated |
| `frontend/tests/**/*.test.js` | Bootstrap, app, components, API/weight/validation utilities, router, stores, and public/admin views, including payment reconciliation. | Automated |

### Coverage boundary

The source-file index records the behavior checked by the current isolated suites; entries marked partial do not cover every scenario listed in their row. Backend database transactions and live provider/webhook flows, full application startup, browser E2E, concurrency, and operational cases still require integration infrastructure and are not claimed as unit coverage. Generated files under `frontend/dist` and installed dependencies are intentionally excluded from source-file coverage.
