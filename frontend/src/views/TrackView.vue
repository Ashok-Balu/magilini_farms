<!-- TrackView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]">
      <h1>Track Your Order 🚚</h1>
      <p>Enter your order number to see live status</p>
    </div>
    <div class="max-w-xl mx-auto px-6 py-12">
      <div class="card card-body">
        <div class="flex gap-3 mb-6">
          <input v-model="trackId" placeholder="e.g. NM-000001" class="form-input flex-1" @keyup.enter="track"/>
          <button @click="track" class="btn btn-primary shrink-0">Track</button>
        </div>
        <div v-if="order" class="mt-2">
          <div class="flex items-center justify-between mb-5">
            <div>
              <div class="font-bold text-green text-lg">{{ order.orderNumber }}</div>
              <div class="text-xs text-gray-400">Customer: {{ order.customer?.name }}</div>
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
          <button @click="downloadInvoice" class="btn btn-ghost w-full mb-3">⬇ Download Invoice</button>
          <a :href="`https://wa.me/919999999999?text=Hi! I have a query about order ${order.orderNumber}`" target="_blank" class="btn btn-wa w-full mt-4">💬 Ask on WhatsApp</a>
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
import api from '@/lib/api.js'
const trackId = ref(''); const order = ref(null); const notFound = ref(false)
const allStatuses = ['New','Confirmed','Packed','Shipped','Delivered','Pickup-Ready','Picked-Up','Cancelled']
const statusIcons = { New:'🆕', Confirmed:'✅', Packed:'📦', Shipped:'🚚', Delivered:'🎉', 'Pickup-Ready':'🏪', 'Picked-Up':'🙌', Cancelled:'❌' }
const sIdx = (s) => allStatuses.indexOf(s)
const curIdx = computed(() => sIdx(order.value?.status||'New'))
const isDone = (s) => sIdx(s)<curIdx.value; const isCurrent = (s) => sIdx(s)===curIdx.value
const formatStatus = (s) => s === 'Pickup-Ready' ? 'Pickup Ready' : s === 'Picked-Up' ? 'Picked Up' : s
const getTime = (s) => { const h = order.value?.statusHistory?.find(h=>h.status===s); return h ? new Date(h.time).toLocaleDateString('en-IN') : '' }
const track = async () => { notFound.value=false; try { const {data} = await api.get(`/orders/track/${trackId.value.toUpperCase()}`); order.value=data.order } catch { order.value=null; notFound.value=true } }
const downloadInvoice = async () => {
  if (!order.value?.orderNumber) return
  const res = await api.get(`/orders/track/${order.value.orderNumber}/invoice`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a   = document.createElement('a')
  a.href = url
  a.download = `MagiliniFarms-${order.value.orderNumber}.pdf`
  a.click()
}
</script>
