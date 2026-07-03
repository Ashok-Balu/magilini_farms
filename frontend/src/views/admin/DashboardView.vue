<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-2xl">Dashboard 📊</h1>
      <button @click="load" class="btn btn-ghost btn-sm">Refresh</button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div v-for="s in statCards" :key="s.label" :class="['card card-body', s.highlight ? 'bg-green text-white' : '']">
        <div :class="['text-xs font-bold tracking-widest uppercase mb-1', s.highlight ? 'text-white/60' : 'text-gray-400']">{{ s.label }}</div>
        <div :class="['text-2xl font-bold', s.highlight ? 'text-mango' : 'text-gray-900']">{{ s.value }}</div>
        <div :class="['text-xs mt-1', s.highlight ? 'text-white/50' : 'text-gray-400']">{{ s.sub }}</div>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockProducts.length" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
      <div class="font-semibold text-amber-800 mb-3">⚠️ Low Stock Alert</div>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <router-link v-for="p in lowStockProducts" :key="p._id" :to="`/admin/products/${p._id}`" class="bg-white rounded-xl p-3 border border-amber-100 hover:shadow-sm transition-shadow">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold text-sm text-gray-900">{{ p.name }}</div>
              <div class="text-xs text-gray-400">{{ p.category?.name }}</div>
            </div>
            <span class="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Low Stock</span>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="v in p.variants.filter(v=>v.stock<=10)" :key="v._id" class="badge bg-amber-100 text-amber-800">{{ v.weight }} · {{ v.stock }}</span>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="card">
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="font-semibold">Recent Orders</h2>
        <router-link to="/admin/orders" class="text-green text-sm font-medium">View All →</router-link>
      </div>
      <div v-if="loadingOrders" class="p-5">
        <div v-for="i in 5" :key="i" class="h-12 bg-gray-100 rounded-xl mb-2 animate-pulse"></div>
      </div>
      <div v-else class="divide-y divide-gray-50">
        <div v-for="order in recentOrders" :key="order._id" @click="router.push(`/admin/orders/${order._id}`)"
          class="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors">
          <div>
            <div class="font-semibold text-sm text-green">{{ order.orderNumber }}</div>
            <div class="text-xs text-gray-400">{{ order.customer.name }} · {{ order.customer.phone }}</div>
            <div class="text-[11px] text-gray-400 mt-0.5">{{ new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-sm">₹{{ order.total }}</div>
            <div class="flex gap-1 justify-end mt-1">
              <span :class="`status-${order.status} text-[10px]`">{{ order.status }}</span>
              <span class="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-500">{{ order.paymentStatus }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const router         = useRouter()
const toast          = useToastStore()
const stats          = ref({})
const recentOrders   = ref([])
const lowStockProducts = ref([])
const loadingOrders  = ref(true)
const loadingStats    = ref(true)

const statCards = computed(() => [
  { label: 'Total Revenue', value: `₹${(stats.value.totalRevenue||0).toLocaleString()}`, sub: 'All time', highlight: true },
  { label: 'Total Orders',  value: stats.value.totalOrders||0, sub: `${stats.value.pendingOrders||0} pending` },
  { label: "Today's Orders",value: stats.value.todayOrders||0, sub: 'new today' },
  { label: 'Customers',     value: stats.value.totalCustomers||0, sub: 'registered' },
])

const load = async () => {
  try {
    loadingOrders.value = true
    loadingStats.value = true
    const { data } = await api.get('/admin/dashboard')
    stats.value = data.stats
    recentOrders.value = data.recentOrders || []
    lowStockProducts.value = data.lowStockProducts || []
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to refresh dashboard.')
  } finally {
    loadingOrders.value = false
    loadingStats.value = false
  }
}

let refreshTimer
const onWindowFocus = () => { load() }

onMounted(() => {
  load()
  refreshTimer = window.setInterval(load, 45000)
  window.addEventListener('focus', onWindowFocus)
  document.addEventListener('visibilitychange', onWindowFocus)
})

onBeforeUnmount(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
  window.removeEventListener('focus', onWindowFocus)
  document.removeEventListener('visibilitychange', onWindowFocus)
})
</script>
