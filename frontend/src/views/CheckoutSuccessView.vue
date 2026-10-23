<!-- CheckoutSuccessView -->
<template>
  <div>
    <AppNavbar/>
    <div class="mt-[60px] sm:mt-[68px] max-w-lg mx-auto px-6 py-16 text-center">
      <div class="card card-body">
        <div class="text-6xl mb-4 animate-bounce">✅</div>
        <h1 class="font-serif text-3xl mb-2">Order Placed!</h1>
        <p class="text-gray-500 mb-2">Thank you for your order.</p>
        <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 inline-block mb-6">
          <span class="font-bold text-green">{{ route.query.order }}</span>
        </div>
        <div v-if="isDirectUpi" class="mb-6 text-left">
          <div v-if="loadingDirectUpi" class="text-sm text-gray-500">Loading payment instructions…</div>
          <DirectUpiPayment v-else-if="directUpiOrder" :order="directUpiOrder"/>
          <p v-else class="text-sm text-red-600">Could not load payment instructions. Open this order from My Orders to retry.</p>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 text-left space-y-1">
          <div class="font-semibold">⚠️ Important reminders:</div>
          <div>• This order cannot be cancelled</div>
          <div>• No returns or replacements</div>
          <div>• You will receive WhatsApp updates</div>
        </div>
        <div class="flex flex-col gap-3">
          <a :href="waLink" target="_blank" class="btn btn-wa w-full">💬 Send Order to WhatsApp</a>
          <router-link to="/account" class="btn btn-primary w-full">📋 Track My Order</router-link>
          <router-link to="/shop" class="btn btn-ghost w-full">Continue Shopping 🥭</router-link>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import DirectUpiPayment from '@/components/payment/DirectUpiPayment.vue'
import api from '@/lib/api.js'
const route = useRoute()
const directUpiOrder = ref(null)
const loadingDirectUpi = ref(false)
const isDirectUpi = computed(() => route.query.payment === 'direct-upi')
const waLink = computed(() => {
  const msg = `Hi! I just placed order ${route.query.order}. Please confirm my order.`
  return `https://wa.me/919943996614?text=${encodeURIComponent(msg)}`
})

onMounted(async () => {
  if (!isDirectUpi.value || !route.query.orderId) return
  loadingDirectUpi.value = true
  try {
    const { data } = await api.get(`/orders/${route.query.orderId}`)
    if (data.order.paymentMethod === 'direct-upi' && data.order.status === 'New' && data.order.paymentStatus === 'pending') {
      directUpiOrder.value = data.order
    }
  } catch {
    directUpiOrder.value = null
  } finally {
    loadingDirectUpi.value = false
  }
})
</script>
