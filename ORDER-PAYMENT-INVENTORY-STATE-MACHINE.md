# Order, Payment and Inventory State Machine Proposal

This is a design-only specification for the Magilini Farms order lifecycle. It is intentionally not implemented in runtime code yet. The objective is to make the state transitions explicit, enforceable, and auditable without allowing partial success or double-application of stock or payment actions.

## 1. Design goals

1. No stock is deducted unless the order is validly reserved.
2. A payment must be reconciled against the actual gateway response before the order is considered paid.
3. Duplicate requests, duplicate webhooks, duplicate payment callbacks, and retry loops are all made safe by idempotent keys and unique constraints.
4. Reservation expiry, cancellation, payment success, and refund processing cannot race into inconsistent stock states.
5. Historical records remain correct even when stock is released or refunded later.

## 2. Core invariants

- A product variant can only move from available to reserved/committed through a single atomic conditional update.
- A reserved order must either become `paid`/`confirmed` before expiry, or be cancelled and stock released before the reservation expires.
- A payment can be confirmed once per gateway payment ID and once per provider order ID.
- A webhook can be processed once per unique event ID and payload hash.
- Order numbers are globally unique.
- Refunds must not change inventory unless the business rule explicitly says the item should be restocked.

## 3. Order state machine

### Proposed persisted states

Order status:
- `new` — customer has placed order; awaiting payment or payment verification
- `confirmed` — payment captured and order accepted
- `packing` — warehouse/fulfillment started (optional future state)
- `shipped` — dispatched
- `delivered` — completed
- `cancel_requested` — cancellation initiated
- `cancelled` — cancelled before fulfillment
- `refund_pending` — cancellation/refund is being reconciled
- `refunded` — refund completed
- `failed` — unrecoverable workflow issue

Order payment state:
- `pending` — not yet paid
- `paid` — captured and accepted
- `refund_pending` — refund is in-flight
- `refunded` — fully refunded
- `failed` — payment rejected or unresolved

Order inventory state:
- `unreserved` — no stock blocked
- `reserved` — stock deducted from available stock but not yet committed to fulfillment
- `committed` — stock is now committed to confirmed order
- `released` — stock restored due to cancellation/expiry/refund

### State transition rules

- `new + pending + reserved` is the normal payment window.
- `new + pending + reserved` -> `cancelled + refunded/failed + released` on timeout or cancellation.
- `new + pending + reserved` -> `confirmed + paid + committed` only after reconciliation passes.
- `confirmed + paid + committed` -> `cancel_requested` -> `cancelled + refund_pending + released` if cancellation happens after confirmation.
- `cancelled` or `refunded` should never return to `confirmed`.
- Payment confirmation must be idempotent. Replaying the same payment or webhook must result in no second state mutation.

### Examples of valid transitions

| Current state | Event | Next state |
|---|---|---|
| `new`/`pending`/`reserved` | reservation timeout | `cancelled`/`failed`/`released` |
| `new`/`pending`/`reserved` | valid Razorpay capture | `confirmed`/`paid`/`committed` |
| `new`/`pending`/`reserved` | mismatched/late payment | `cancelled`/`refund_pending` |
| `confirmed`/`paid`/`committed` | fulfillment cancellation | `cancel_requested` -> `cancelled`/`refund_pending` |
| `cancelled` or `refund_pending` | refund completion | `refunded` |

## 4. Payment state machine

Payment attempt state (logical gateway session):
- `creating` — provider order is being created
- `created` — provider order exists, awaiting user payment
- `captured` — payment captured by provider
- `failed` — provider rejected the payment attempt
- `unknown` — provider outcome is ambiguous; must be reconciled
- `expired` — expired and no longer valid

Payment transaction state:
- `pending` — gateway response recorded but not yet reconciled
- `paid` — validated and accepted
- `failed` — failed or rejected
- `refund_pending` — refund initiated or required
- `refunded` — fully refunded
- `reconciliation_required` — mismatch or unverified state

### Payment approval rule

A payment is eligible to mark the order `paid` only if all of the following are true in one atomic transaction:

- Payment ID is unique in `PaymentTransaction`.
- Payment belongs to the same provider order ID as the stored `PaymentAttempt`.
- Payment amount equals the expected order total in minor units.
- Payment currency matches the expected currency (`INR` for this app).
- Payment status is `captured`.
- The order is still in the expected state (`new`, `pending`, `reserved`, not expired).

If any check fails, the payment must not mark the order as paid. It is either:
- rejected and left for review,
- refunded,
- or treated as `unknown` and queued for reconciliation.

## 5. Inventory state machine

Inventory lifecycle per variant and order:
- `available`
- `reserved`
- `committed`
- `released`
- `refunded_restocked`

### Transaction discipline

The product variant stock column must not be adjusted by ad hoc reads and writes. All writes need:
- a unique stock movement key,
- a conditional update using the current stock and variant identity,
- and a corresponding `StockLog` entry.

### Guardrails

- Reserve only if `isActive == true`, `seasonalStatus == available`, variant is available, and `stock >= qty`.
- Release only if the order is in a state that actually owns the reservation. Never release inventory twice for the same movement key.
- Only commit stock to fulfillment when payment is validated and the order is confirmed.
- Refunds must add stock back only under explicit business rules, not automatically for every refund path.

### Movement key strategy

Each stock movement should include a deterministic unique key such as:

`orderId:productId:variantId:movementType`

Example movement types:
- `reserve`
- `cancel_release`
- `expiry_release`
- `payment_mismatch_refund`
- `refund_restock`

A unique index on `(orderId, productId, variantId, movementType)` ensures release or re-stock cannot run twice for the same event.

## 6. Transaction and concurrency rules

### Required database transactions

1. Order placement transaction
   - validate cart, recompute price, insert order
   - reserve stock with atomic conditional update
   - create order status history
   - create payment attempt record with idempotency key
   - write `StockLog` entry
   - commit only if all succeed

2. Payment confirmation transaction
   - lock or update the specific order row in a transaction
   - fetch the `PaymentAttempt`
   - validate provider payment fields
   - insert `PaymentTransaction` only if it does not already exist
   - update order status from `new` to `confirmed` only once
   - mark inventory as `committed`

3. Cancellation / expiry transaction
   - lock the order row
   - verify order is still in a cancellable state
   - change order status to cancelled
   - set `inventoryStatus` to `released`
   - release stock with conditional update
   - write log and status history

4. Refund reconciliation transaction
   - read the provider refund status
   - load the original order/payment transaction
   - update refund state once
   - if business rules require it, restock inventory
   - preserve historical stock logs

### Required conditional updates

Use `findOneAndUpdate` / `updateOne` with predicates such as:
- order must still be `new` and `pending`
- payment status must still be `pending`
- inventory status must still be `reserved`
- inventory expiry must still be active
- stock must still be available at or above requested quantity
- a previous status transition must not already have occurred

This prevents the classic lost-update race where two workers both approve the same payment or release the same inventory.

## 7. Required unique indexes and idempotency keys

### Unique keys

- `orders.orderNumber` — globally unique order number
- `PaymentAttempt` unique by `(orderId, idempotencyKey)`
- `PaymentAttempt` unique by `(orderId, providerOrderId)` when provider order is assigned
- `PaymentTransaction` unique by `providerPaymentId` and optionally `(orderId, providerPaymentId)`
- `PaymentWebhookEvent` unique by `eventId`
- `PaymentWebhookEvent` unique by `(payloadHash, eventType)` if provider event IDs are not guaranteed unique across all retries
- `StockLog` unique by `(orderId, productId, variantId, movementType)` or a separate `movementKey` with unique index

### Idempotency keys

- `POST /api/payment/create-order` should require a valid `Idempotency-Key` header.
- `POST /api/payment/verify` should be idempotent for the same provider payment ID and provider order ID.
- Any admin retry or manual reconciliation endpoint should carry a request-scoped idempotency key for operation replay.

## 8. Razorpay integrity rules

The backend must verify the provider response against the expected object before marking the order paid. At minimum, compare:

- provider order ID matches `PaymentAttempt.providerOrderId`
- payment amount matches `order.total * 100`
- payment currency matches the expected currency (`INR`)
- payment status is `captured`
- payment belongs to the same order as the attempt record

This is the fundamental reconciliation rule:

`gateway_payment` must match the expected order before `paymentStatus = paid` is persisted.

Any mismatch should be treated as `reconciliation_required`, not as a successful capture.

## 9. Webhook and raw-body safety

Webhook verification must occur before any JSON parsing or body mutation. The application must:

- capture the raw request bytes in a buffer immediately,
- verify the HMAC using those exact bytes,
- reject the request if the secret is missing or the signature is invalid,
- parse JSON only after verification passes.

De-duplication for webhooks must use:
- `eventId` if present,
- otherwise a hash of the raw body payload,
- and a unique index on the deduplication key.

If the same event is delivered again, the processor must return success without applying duplicate processing logic.

## 10. Expiry and cancellation race handling

This is a critical concurrency area. A reservation can be expiring while a payment callback arrives or a user cancels the order.

### Required rules

- Both cancellation and expiry must use the same conditional transition check: only transition the order once from `new/pending/reserved` to a terminal cancelled state.
- The release step must be conditional and idempotent.
- A payment callback that lands after expiration must be reconciled against the order’s current state; it must not blindly flip the order to paid if the reservation is already cancelled.
- If a late payment capture arrives for an expired order, the system should either:
  - refund it,
  - or mark the order for manual review,
  - but never silently confirm the order against stale reservation state.

### Simultaneous workers

To avoid double-processing, both the expiry cron and the cancellation controller should use the same compare-and-swap condition and the same `movementKey` guard.

Example condition:

- order is `new`
- paymentStatus is `pending`
- inventoryStatus is `reserved`
- status transition is still valid under the current revision/timestamp

If a worker cannot acquire the state transition, it should exit without releasing stock twice.

## 11. Failure and retry semantics

### Gateway timeouts and ambiguous provider results

When Razorpay returns a timeout or otherwise ambiguous result:
- do not create a second order blindly,
- mark the attempt as `unknown` or `reconciliation_required`,
- keep the order in waiting state,
- require one admin/operator reconciliation or a safe retry path.

### Duplicate payment attempts

If the browser refreshes or the user resubmits the same order checkout, the system should reuse the same provider order when the attempt is still alive. If a prior attempt is already `creating` or `unknown`, the API should reject the new attempt with a reconciliation message rather than silently creating a second provider order.

## 12. Refund and stock restoration rules

Refunds are not always equivalent to inventory restocking. The app should explicitly define each refund scenario:

- order cancelled before payment captured -> no stock restock if order never committed inventory
- unpaid order expires -> release reserved stock
- payment captured but mismatched -> refund and release stock if order was still reserved
- confirmed order cancelled after payment -> refund and restock inventory according to business policy
- partial refund -> only the refunded line items are restocked if the business rule requires it

### Inventory refund rules

If the order is still in a reserved state, inventory release may be immediate.
If the order is already committed, then refund processing should either:
- re-enter inventory as return-to-stock only when the business rule says the item can be sold again, or
- leave stock as consumed and just record the refund event.

This must be explicit and auditable via `StockLog` history.

## 13. Suggested enforcement checklist

The following items are required before this state machine is considered production-safe:

- `Order` transition logic guarded by transaction and conditional mutation
- unique indexes on order numbers / payment ids / webhook ids / movement ids
- idempotency keys on all mutating payment endpoints
- raw-body verification before JSON parsing on the webhook endpoint
- invariant checks before `order.paymentStatus = paid`
- stock movement logs with unique movement keys
- single worker or compare-and-swap pattern for cancellation and expiry

## 14. Recommended implementation order

1. Add the formal state transition checks and unique indexes.
2. Add webhook deduplication and raw-body verification enforcement.
3. Harden payment confirmation to be strictly idempotent.
4. Add cancellation and expiry race protection.
5. Add refund and restock policy checks based on business rules.
6. Add integration tests covering concurrency and late-payment scenarios.

## 15. Final decision

This proposal is intentionally non-invasive and design-first. It does not add runtime enforcement yet, but it identifes the precise places where transactions, conditional updates, unique indexes, and idempotency keys are required to make the payment and inventory flow reliable.
