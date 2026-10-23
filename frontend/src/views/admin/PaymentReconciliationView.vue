<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="font-serif text-2xl text-gray-900">Payment Reconciliation</h1>
        <p class="text-sm text-gray-500 mt-1">{{ orders.length + transactions.length + attempts.length + webhookEvents.length }} exceptions require review</p>
      </div>
      <button @click="load" :disabled="loading" class="btn btn-ghost btn-sm">↻ Refresh</button>
    </div>

    <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>
    <div v-if="loading" class="card card-body text-sm text-gray-500">Loading payment records…</div>
    <div v-else-if="!orders.length && !transactions.length && !attempts.length && !webhookEvents.length" class="card card-body text-center text-sm text-gray-500">No payment exceptions need review.</div>

    <div v-if="orders.length" class="mb-8">
      <h2 class="font-semibold mb-3">Orders requiring attention</h2>
      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">Order</th><th class="px-4 py-3">Customer</th><th class="px-4 py-3">Payment</th><th class="px-4 py-3">Amount</th><th class="px-4 py-3">Reason</th><th class="px-4 py-3"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="order in orders" :key="order._id">
              <td class="px-4 py-3 font-semibold">{{ order.orderNumber }}</td>
              <td class="px-4 py-3">{{ order.customer?.name }}</td>
              <td class="px-4 py-3">{{ order.paymentStatus }}</td>
              <td class="px-4 py-3">₹{{ order.total }}</td>
              <td class="px-4 py-3">{{ order.refundRequired ? 'Refund required' : 'Pending past reservation window' }}</td>
              <td class="px-4 py-3"><router-link :to="`/admin/orders/${order._id}`" class="text-green font-semibold hover:underline">Review</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="attempts.length" class="mb-8">
      <h2 class="font-semibold mb-3">Gateway attempts needing review</h2>
      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">Order</th><th class="px-4 py-3">Attempt</th><th class="px-4 py-3">State</th><th class="px-4 py-3">Gateway order</th><th class="px-4 py-3"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="attempt in attempts" :key="attempt._id">
              <td class="px-4 py-3">{{ attempt.orderId }}</td><td class="px-4 py-3">{{ attempt.attemptNumber }}</td><td class="px-4 py-3">{{ attempt.status }}<span v-if="attempt.failureMessage"> · {{ attempt.failureMessage }}</span></td><td class="px-4 py-3">{{ attempt.providerOrderId || 'Not recorded' }}</td><td class="px-4 py-3"><router-link :to="`/admin/orders/${attempt.orderId}`" class="text-green font-semibold hover:underline">Review</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="webhookEvents.length" class="mb-8">
      <h2 class="font-semibold mb-3">Webhook events requiring reconciliation</h2>
      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">Event</th><th class="px-4 py-3">State</th><th class="px-4 py-3">Payment</th><th class="px-4 py-3">Gateway order</th><th class="px-4 py-3">Gateway status / amount</th><th class="px-4 py-3"></th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="event in webhookEvents" :key="event._id">
              <td class="px-4 py-3">{{ event.eventType }}<div class="text-xs text-gray-400">{{ event.eventId }}</div></td>
              <td class="px-4 py-3">{{ event.status }}</td>
              <td class="px-4 py-3">{{ event.paymentId || '—' }}</td>
              <td class="px-4 py-3">{{ event.providerOrderId || '—' }}</td>
              <td class="px-4 py-3">{{ event.gatewayPaymentStatus || '—' }}<span v-if="event.paymentAmountMinor != null"> · {{ event.paymentCurrency }} {{ (event.paymentAmountMinor / 100).toFixed(2) }}</span></td>
              <td class="px-4 py-3"><router-link v-if="event.orderId" :to="`/admin/orders/${event.orderId}`" class="text-green font-semibold hover:underline">Review</router-link></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="transactions.length">
      <h2 class="font-semibold mb-3">Refund and payment transactions</h2>
      <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th class="px-4 py-3">Order</th><th class="px-4 py-3">Provider payment</th><th class="px-4 py-3">Payment</th><th class="px-4 py-3">Refund</th><th class="px-4 py-3">Amount</th></tr></thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="transaction in transactions" :key="transaction._id">
              <td class="px-4 py-3"><router-link :to="`/admin/orders/${transaction.orderId}`" class="text-green font-semibold hover:underline">{{ transaction.orderNumber }}</router-link></td><td class="px-4 py-3">{{ transaction.providerPaymentId || '—' }}</td><td class="px-4 py-3">{{ transaction.status }}</td><td class="px-4 py-3">{{ transaction.refundStatus }}</td><td class="px-4 py-3">{{ transaction.currency }} {{ transaction.amount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '@/lib/api.js'

const orders = ref([])
const transactions = ref([])
const attempts = ref([])
const webhookEvents = ref([])
const loading = ref(true)
const error = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/payment-reconciliation')
    orders.value = data.orders || []
    transactions.value = data.transactions || []
    attempts.value = data.attempts || []
    webhookEvents.value = data.webhookEvents || []
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load payment reconciliation records.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
