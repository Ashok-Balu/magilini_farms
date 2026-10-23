<!-- TrackView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[60px] sm:mt-[68px]">
      <h1>Track Your Order 🚚</h1>
      <p>Sign in with your customer account to view order tracking</p>
    </div>
    <div class="max-w-xl mx-auto px-6 py-12">
      <div class="card card-body">
        <div v-if="auth.isCustomer" class="flex gap-3 mb-6">
          <input v-model="trackId" placeholder="e.g. NM-000001" class="form-input flex-1" @keyup.enter="track"/>
          <button @click="track" :disabled="tracking" class="btn btn-primary shrink-0">
            <span v-if="tracking" class="spinner"></span>{{ tracking ? 'Tracking…' : 'Track' }}
          </button>
        </div>
        <div v-else class="text-center">
          <p class="text-sm text-gray-600 mb-4">Order numbers are not access credentials. Sign in to verify you own the order before viewing its delivery details.</p>
          <RouterLink to="/login" class="btn btn-primary">Sign in</RouterLink>
        </div>
        <div v-if="order" class="mt-2">
          <div class="flex items-center justify-between mb-5">
            <div>
              <div class="font-bold text-green text-lg">{{ order.orderNumber }}</div>
            </div>
            <span :class="`status-${order.status}`">{{ order.status }}</span>
          </div>
          <div class="relative pl-8">
            <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
            <div v-for="s in allStatuses" :key="s" class="relative mb-6">
              <div :class="['absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                isDone(s)?'bg-green text-white':isCurrent(s)?'bg-mango text-gray-900':'bg-gray-200 text-gray-400']">
                {{ isDone(s)?'✓': statusIcons[s] || '○' }}
              </div>
              <div :class="['font-semibold text-sm',isCurrent(s)?'text-mango':isDone(s)?'text-green':'text-gray-400']">{{ formatStatus(s) }}</div>
              <div v-if="getTime(s)" class="text-xs text-gray-400">{{ getTime(s) }}</div>
            </div>
          </div>
          <div v-if="order.courierTracking" class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm mb-3">
            🚚 <strong>{{ order.courierName }}</strong> · Tracking: {{ order.courierTracking }}
          </div>
          <button v-if="auth.isCustomer" @click="downloadInvoice" :disabled="downloadingInvoice" class="btn btn-ghost w-full mb-3">
            <span v-if="downloadingInvoice" class="spinner"></span>{{ downloadingInvoice ? 'Preparing…' : '⬇ Download Invoice' }}
          </button>
          <p v-else class="text-xs text-center text-gray-500 mb-3">Sign in with your customer account to download the invoice.</p>
          <a :href="`https://wa.me/919943996614?text=Hi! I have a query about order ${order.orderNumber}`" target="_blank" class="btn btn-wa w-full mt-4">💬 Ask on WhatsApp</a>
        </div>
        <p v-if="notFound" class="text-red-500 text-sm text-center">Order not found. Please check your order number.</p>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useAuthStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'
const auth = useAuthStore()
const toast = useToastStore()
const trackId = ref(''); const order = ref(null); const notFound = ref(false)
const tracking = ref(false); const downloadingInvoice = ref(false)
const allStatuses = ['New','Confirmed','Packed','Shipped','Delivered','Pickup-Ready','Picked-Up','Cancelled']
const statusIcons = { New:'🆕', Confirmed:'✅', Packed:'📦', Shipped:'🚚', Delivered:'🎉', 'Pickup-Ready':'🏪', 'Picked-Up':'🙌', Cancelled:'❌' }
const sIdx = (s) => allStatuses.indexOf(s)
const curIdx = computed(() => sIdx(order.value?.status||'New'))
const isDone = (s) => sIdx(s)<curIdx.value; const isCurrent = (s) => sIdx(s)===curIdx.value
const formatStatus = (s) => s === 'Pickup-Ready' ? 'Pickup Ready' : s === 'Picked-Up' ? 'Picked Up' : s
const getTime = (s) => { const h = order.value?.statusHistory?.find(h=>h.status===s); return h ? new Date(h.time).toLocaleDateString('en-IN') : '' }
const track = async () => {
  if (!trackId.value.trim()) { toast.error('Please enter an order number.'); return }
  notFound.value = false
  tracking.value = true
  try {
    const { data } = await api.get(`/orders/track/${trackId.value.toUpperCase()}`)
    order.value = data.order
  } catch {
    order.value = null
    notFound.value = true
    toast.error('Order not found. Please check your order number.')
  } finally {
    tracking.value = false
  }
}
const downloadInvoice = async () => {
  if (!order.value?.orderNumber) return
  downloadingInvoice.value = true
  try {
    const res = await api.get(`/orders/track/${order.value.orderNumber}/invoice`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const a   = document.createElement('a')
    a.href = url
    a.download = `MagiliniFarms-${order.value.orderNumber}.pdf`
    a.click()
  } catch {
    toast.error('Failed to download invoice.')
  } finally {
    downloadingInvoice.value = false
  }
}
</script>
