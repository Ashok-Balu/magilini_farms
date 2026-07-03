<!-- OrderDetailView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px] max-w-2xl mx-auto px-6 py-10">
      <router-link to="/account" class="text-green text-sm font-semibold flex items-center gap-1 mb-6">← Back to Orders</router-link>
      <div v-if="loading" class="card card-body animate-pulse h-64"></div>
      <div v-else-if="order" class="space-y-5">
        <div class="card card-body">
          <div class="flex items-center justify-between mb-4">
            <h1 class="font-serif text-2xl">{{ order.orderNumber }}</h1>
            <span :class="`status-${order.status}`">{{ order.status }}</span>
          </div>
          <div class="text-xs text-gray-400 mb-4">Placed {{ fmtDate(order.createdAt) }}</div>
          <div v-for="item in order.items" :key="item.name" class="flex justify-between text-sm py-2 border-b border-gray-100">
            <span>{{ item.name }} {{ item.weight }} × {{ item.qty }}</span>
            <span class="font-semibold">₹{{ item.subtotal }}</span>
          </div>
          <div class="mt-4 space-y-1 text-sm">
            <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{{ order.subtotal }}</span></div>
            <div v-if="order.couponDiscount" class="flex justify-between text-green"><span>Discount</span><span>−₹{{ order.couponDiscount }}</span></div>
            <div v-if="order.packagingFee" class="flex justify-between text-gray-500"><span>Gift Packing</span><span>₹{{ order.packagingFee }}</span></div>
            <div class="flex justify-between text-gray-500"><span>Delivery</span><span>{{ order.deliveryFee ? '₹'+order.deliveryFee : 'FREE' }}</span></div>
            <div class="flex justify-between font-bold text-base border-t border-gray-100 pt-2"><span>Total</span><span>₹{{ order.total }}</span></div>
          </div>
        </div>

        <!-- Tracking Timeline -->
        <div class="card card-body">
          <h3 class="font-semibold mb-4">Order Tracking</h3>
          <div class="relative pl-8">
            <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div v-for="s in statuses" :key="s" class="relative mb-6">
              <div :class="['absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs',
                isDone(s)?'bg-green text-white': isCurrent(s)?'bg-mango text-gray-900':'bg-gray-200 text-gray-400']">
                {{ isDone(s)?'✓':sIcon(s) }}
              </div>
              <div :class="['font-semibold text-sm', isCurrent(s)?'text-mango':isDone(s)?'text-green':'text-gray-400']">{{ formatStatus(s) }}</div>
              <div v-if="isDone(s)||isCurrent(s)" class="text-xs text-gray-400">{{ getTime(s) }}</div>
            </div>
          </div>
          <div v-if="order.courierTracking" class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
            🚚 <strong>{{ order.courierName }}</strong> · Tracking: {{ order.courierTracking }}
          </div>
        </div>

        <div class="flex gap-3">
          <a :href="waLink" target="_blank" class="btn btn-wa flex-1">💬 WhatsApp Support</a>
          <a @click="downloadInvoice" class="btn btn-ghost flex-1 cursor-pointer">⬇ Invoice PDF</a>
        </div>

        <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 text-center">
          ⚠️ Orders cannot be cancelled · No returns or replacements
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import api from '@/lib/api.js'

const route   = useRoute()
const order   = ref(null)
const loading = ref(true)

const statuses = ['New','Confirmed','Packed','Shipped','Delivered','Pickup-Ready','Picked-Up','Cancelled']
const sIdx     = (s) => statuses.indexOf(s)
const curIdx   = computed(() => sIdx(order.value?.status || 'New'))
const isDone   = (s) => sIdx(s) < curIdx.value
const isCurrent = (s) => sIdx(s) === curIdx.value
const sIcon    = (s) => ({ New:'🆕',Confirmed:'✅',Packed:'📦',Shipped:'🚚',Delivered:'🎉','Pickup-Ready':'🏪','Picked-Up':'🙌',Cancelled:'❌' }[s]||'○')
const formatStatus = (s) => s === 'Pickup-Ready' ? 'Pickup Ready' : s === 'Picked-Up' ? 'Picked Up' : s
const getTime  = (s) => { const h = order.value?.statusHistory?.find(h=>h.status===s); return h ? fmtDate(h.time) : '' }
const fmtDate  = (d) => new Date(d).toLocaleDateString('en-IN',{ day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' })
const waLink   = computed(() => `https://wa.me/919999999999?text=${encodeURIComponent(`Hi! Query about order ${order.value?.orderNumber}`)}`)

const downloadInvoice = async () => {
  const res = await api.get(`/orders/${route.params.id}/invoice`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a   = document.createElement('a'); a.href = url; a.download = `MagiliniFarms-${order.value?.orderNumber}.pdf`; a.click()
}

onMounted(async () => {
  const { data } = await api.get(`/orders/${route.params.id}`)
  order.value = data.order; loading.value = false
})
</script>

