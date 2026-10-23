# MagiliniFarms

Vue 3 frontend and Node.js/Express backend for the MagiliniFarms commerce platform.

## Project Structure

```text
magilini-farms/
├── backend/
└── frontend/
```

## Backend Setup

```bash
cd backend
npm install
# Review .env.development, .env.test, and .env.production
npm run dev       # Starts development on port 5000
npm run test      # Starts testing on port 5001
npm run start     # Starts production configuration
```

## Frontend Setup

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5000/api" > .env
npm test
npm run dev
```

## Environment Configuration

The backend uses one file per environment:

| File | Purpose | Database |
|---|---|---|
| `backend/.env.development` | Development | `magilinifarms_dev` |
| `backend/.env.test` | Local testing | `magilinifarms_test` |
| `backend/.env.production` | Production | `magilinifarms_prod` |

Available backend scripts:

```bash
cd backend
npm run dev
npm run test
npm run start
npm run seed -- --force
```

Each startup prints the active environment and selected database before the MongoDB connection is opened.
The backend enforces `magilinifarms_dev`, `magilinifarms_test`, and `magilinifarms_prod` for the matching `NODE_ENV`; unknown environment names and mismatches stop startup. Development/test must use Razorpay test keys, while production must use live keys. Never copy credentials from one environment into another.

Seed safety is manual and never runs automatically. Use:

```bash
npm run seed -- --force
```

Seeding is disabled by default (`ENABLE_SEED=false`); explicitly enable it only for the intended non-production run and turn it off again afterward. Existing records are retained unless `--clear` is also supplied. `--clear` deletes catalog, coupon, pincode, business-hours, order/payment, stock-log, complaint, bulk-enquiry, notify-me, and customer-user data; admin users, reviews, notification deliveries, and audit logs are not cleared.

Seed safety:

- Requires `ENABLE_SEED=true`
- Requires `--force`
- Always blocked in `production`
- Inserts the bundled initial catalog only after the explicit safety checks pass
- Leaves existing data untouched unless the destructive `--clear` option is explicitly added
- Refuses to run on a non-empty database unless `--clear` is explicitly supplied
- Refuses production even if `ENABLE_SEED=true`, `--force`, or `--clear` is supplied

`GET /health` reports liveness; `GET /ready` returns HTTP 503 unless MongoDB is connected. SIGINT/SIGTERM stop the expiry job, close the HTTP server, and disconnect MongoDB.

External request deadlines are bounded: Razorpay 15 seconds, Cloudinary 30 seconds, WhatsApp 10 seconds, SMTP connection/greeting 10 seconds and socket 20 seconds, postal lookup 5 seconds, and browser reverse geocoding 10 seconds. Payment-session creation and refund requests are not automatically retried after ambiguous timeouts; reconcile them before retrying to avoid duplicate gateway operations.

## Backend Variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string for the active environment |
| `DB_NAME` | MongoDB database name for the active environment |
| `ENABLE_SEED` | Enables manual seed command when set to `true` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Explicit administrator credentials required for a manual seed; never use production |
| `FREE_DELIVERY_MIN` | Server-authoritative subtotal threshold for free delivery; `0` disables it |
| `PORT` | API port for the active environment |
| `API_BASE_URL` | Canonical API base URL for the active environment |
| `FRONTEND_URL` | Allowed frontend origin for CORS |
| `CORS_ORIGINS` | Comma-separated exact browser origins; production origins must use HTTPS |
| `TRUST_PROXY` / `TRUST_PROXY_HOPS` | Explicit reverse-proxy trust configuration |
| `JWT_SECRET` | JWT signing secret |
| `RAZORPAY_KEY_ID` | Razorpay key id |
| `RAZORPAY_KEY_SECRET` | Razorpay API and checkout-signature verification secret |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay webhook signing secret; required when Razorpay keys are configured |
| `UPI_ID` | Farm VPA used for Direct UPI orders above ₹2,000 |
| `UPI_NAME` | Payee name displayed in UPI apps |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials; all three Cloudinary values are required in production |
| `TWILIO_ACCOUNT_SID` | Legacy/unused setting; the SMS helper currently simulates delivery and does not call Twilio |
| `WA_API_URL` / `WA_API_KEY` | WhatsApp provider endpoint and credential; production endpoint must use HTTPS |
| `ADMIN_WA_NUMBER` | Admin WhatsApp number with country code |
| `ENABLE_REAL_NOTIFICATIONS` | Allows WhatsApp delivery in development/test when `true`; production sends with configured provider credentials |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` | SMTP server settings |
| `EMAIL_USER` / `EMAIL_PASS` | SMTP credentials; required together and required in production |

Razorpay webhooks use `POST /api/payment/webhook`. Configure the same webhook secret in Razorpay and `RAZORPAY_WEBHOOK_SECRET`; the endpoint verifies the original request bytes before using the signed event. Enable payment-captured, payment-failed, refund-processed and refund-failed events. Ambiguous order-creation timeouts are held for reconciliation rather than retried as a new gateway order; review unresolved attempts and webhook events in Admin → Payment Reconciliation.

Authentication uses email and password. Password-reset email delivery in production requires `EMAIL_USER` and `EMAIL_PASS`; reset links are never written to production console logs when SMTP is unavailable. Logout and successful password reset revoke all existing JWT sessions. Cookie-authenticated mutations require an `Origin` matching the configured CORS origins. The current authentication routes do not use OTP; the documented Twilio setting is retained as legacy configuration and is not part of login or registration.

Order tracking requires a signed-in customer account and only returns orders owned by that account; an order number is not authorization. Invoice downloads and complaint/order resources are likewise owner-scoped, while admin resources require the admin role. Product catalog images remain public by design. New complaint photos use authenticated Cloudinary delivery and complaint APIs provide five-minute signed download URLs to the customer owner or an admin. Complaint images uploaded before this change remain public Cloudinary assets and require a one-time access-mode migration. Request logs and notification simulation logs do not include request URLs, email addresses, phone numbers, or message contents.

## API Validation and Order Rules

Mutating API routes validate request bodies, route IDs, and list-query bounds before controller access. Object schemas discard unknown fields, so clients cannot set server-owned order totals, payment state, roles, stock metadata, or other model fields through mass assignment. Order pricing, coupon discounts, delivery charges, packaging fees, and inventory reservations are calculated and checked by the backend against current catalog and delivery records. Order-creation retries require an idempotency key; duplicate coupon reservations are guarded atomically with order creation.

Product weights require an explicit mass unit. Supported labels such as `250 g`, `1 kg (3-4 pcs)`, and `1 piece (~1.5 kg)` convert to kilograms without treating grams as kilograms; ambiguous or malformed labels are rejected. Quantities and stock are whole numbers, monetary inputs must be finite and cent-safe, and dates are validated as calendar dates or explicit timestamps. Cancellation restores one coupon redemption (and one matching `usedBy` entry) inside the same transaction as the order cancellation, even when a customer has placed multiple orders using the same coupon.

## Delivery and Location

Home delivery is authorized only for PIN codes explicitly marked serviceable in Admin → Pincodes. Postal API metadata can populate an inactive-for-delivery PIN record, but does not itself enable delivery; an administrator must review and enable it. Per-PIN fee and estimated delivery days are editable in the Pincodes admin page. The backend checks serviceability again when an order is created. Pickup weekdays are checked against Admin → Business Hours, including rejection when a weekday schedule is missing or closed.

Browser location is optional. Checkout and the homepage validate reverse-geocoding responses and require the customer to confirm the detected PIN/address before applying it. Location permission denial, unavailable coordinates, and reverse-geocoding failures leave manual entry available.

Current hardcoded configuration candidates include zone fallback fees/estimates (₹80/1–2 days for Tamil Nadu, ₹120/2–3 days for South India, ₹180/3–4 days elsewhere), postal/reverse-geocoding timeouts (5/10 seconds), minimum order weight (`MIN_ORDER_KG`, default 3), gift packaging fee (₹50), direct-UPI minimum (₹2,000), and delivery/pickup lead-time rules. Only the per-PIN fee/estimate and weekly business hours currently have admin controls. Pickup holiday closures and daily pickup-capacity limits are not modeled. Consider moving global defaults into admin store settings and adding an admin-managed holiday calendar and a clearly defined capacity policy before relying on date-specific pickup commitments.

## Admin Access

Admin access must come from the real database for the selected environment. There are no built-in administrator credentials. To create a seeded administrator, supply SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD for the explicit, non-production seed command; see [backend/.seed-setup.md](./backend/.seed-setup.md).

## Deployment

Frontend deployment:

```bash
cd frontend
npm run build
```

Backend deployment:

```text
1. Push backend/ to GitHub
2. Create the hosted service
3. Install dependencies with npm install
4. Start with npm run start
5. Configure backend/.env.production values in the host environment
```

MongoDB deployment target:

```text
Use the existing Atlas cluster
Use magilinifarms_prod for production
```
