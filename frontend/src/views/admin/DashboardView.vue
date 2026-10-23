<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="font-serif text-3xl text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-400 mt-1">Welcome back, {{ auth.user?.name?.split(' ')[0] || 'Admin' }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-400">Last updated: {{ lastRefresh }}</span>
        <button @click="load" class="btn btn-ghost btn-sm">↻ Refresh</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green to-green-mid p-5 text-white shadow-lg">
        <div class="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div class="text-xs font-bold tracking-widest uppercase text-white/60 mb-1">Total Revenue</div>
        <div class="text-3xl font-bold text-mango">₹{{ formatNum(stats.totalRevenue || 0) }}</div>
        <div class="text-xs text-white/50 mt-1">All time earnings</div>
      </div>
      <div class="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Total Orders</div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.totalOrders || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1"><span class="text-amber-600 font-semibold">{{ stats.pendingOrders || 0 }}</span> pending</div>
      </div>
      <div class="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Today's Orders</div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.todayOrders || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1">₹{{ formatNum(stats.todayRevenue || 0) }} today</div>
      </div>
      <div class="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
        <div class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Customers</div>
        <div class="text-3xl font-bold text-gray-900">{{ stats.totalCustomers || 0 }}</div>
        <div class="text-xs text-gray-400 mt-1">registered users</div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      <router-link to="/admin/products/new" class="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 hover:border-green hover:shadow-sm transition-all">
        <span class="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center text-lg">➕</span>
        <span class="text-sm font-semibold text-gray-700">Add Product</span>
      </router-link>
      <router-link to="/admin/orders?status=New" class="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 hover:border-green hover:shadow-sm transition-all">
        <span class="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-lg">📦</span>
        <span class="text-sm font-semibold text-gray-700">New Orders</span>
      </router-link>
      <router-link to="/admin/bulk" class="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 hover:border-green hover:shadow-sm transition-all">
        <span class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-lg">📋</span>
        <span class="text-sm font-semibold text-gray-700">Bulk Enquiries</span>
      </router-link>
      <router-link to="/admin/complaints" class="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-4 hover:border-green hover:shadow-sm transition-all">
        <span class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-lg">⚠️</span>
        <span class="text-sm font-semibold text-gray-700">Complaints</span>
      </router-link>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="lowStockProducts.length" class="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-sm">⚠️</span>
          <h3 class="font-semibold text-amber-800">Low Stock Alert</h3>
        </div>
        <span class="text-xs text-amber-600 font-medium">{{ lowStockProducts.length }} products</span>
      </div>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        <router-link v-for="p in lowStockProducts" :key="p._id" :to="`/admin/products/${p._id}`" class="bg-white rounded-xl p-3 border border-amber-100 hover:shadow-sm transition-shadow">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg overflow-hidden bg-warm shrink-0">
                <img v-if="p.images?.[0]" :src="p.images[0].url" class="w-full h-full object-cover"/>
              </div>
              <div>
                <div class="font-semibold text-sm text-gray-900 line-clamp-1">{{ p.name }}</div>
                <div class="text-[10px] text-gray-400">{{ p.category?.name }}</div>
              </div>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-for="v in p.variants.filter(v=>v.stock<=10)" :key="v._id"
              :class="['text-[10px] px-2 py-0.5 rounded-full font-semibold', v.stock===0?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700']">
              {{ v.weight }}: {{ v.stock }} left
            </span>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="font-semibold text-gray-900">Recent Orders</h2>
        <router-link to="/admin/orders" class="text-green text-sm font-semibold hover:underline">View All →</router-link>
      </div>
      <div v-if="loadingOrders" class="p-6">
        <div v-for="i in 5" :key="i" class="h-14 bg-gray-50 rounded-xl mb-2 animate-pulse"></div>
      </div>
      <div v-else-if="!recentOrders.length" class="p-12 text-center text-gray-400 text-sm">No orders yet</div>
      <div v-else class="divide-y divide-gray-50">
        <div v-for="order in recentOrders" :key="order._id" @click="router.push(`/admin/orders/${order._id}`)"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center text-sm font-bold text-green">
              {{ order.deliveryType === 'pickup' ? '🏪' : '🚚' }}
            </div>
            <div>
              <div class="font-semibold text-sm text-gray-900">{{ order.orderNumber }}</div>
              <div class="text-xs text-gray-400">{{ order.customer.name }} · {{ order.customer.phone }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold text-sm text-gray-900">₹{{ order.total }}</div>
            <div class="flex gap-1.5 justify-end mt-1">
              <span :class="statusClass(order.status)">{{ order.status }}</span>
              <span :class="paymentClass(order.paymentStatus)">{{ order.paymentStatus }}</span>
            </div>
          </div>
          <div class="text-xs text-gray-400 hidden sm:block w-20 text-right">
            {{ fmtDate(order.createdAt) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api.js'
import { useAuthStore, useToastStore } from '@/stores/index.js'

const router         = useRouter()
const auth           = useAuthStore()
const toast          = useToastStore()
const stats          = ref({})
const recentOrders   = ref([])
const lowStockProducts = ref([])
const loadingOrders  = ref(true)
const lastRefresh    = ref('')

const formatNum = (n) => Number(n).toLocaleString('en-IN')
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const statusClass = (s) => {
  const map = { New: 'bg-blue-100 text-blue-700', Confirmed: 'bg-indigo-100 text-indigo-700', Packed: 'bg-purple-100 text-purple-700', Shipped: 'bg-cyan-100 text-cyan-700', Delivered: 'bg-green/10 text-green', Cancelled: 'bg-red-100 text-red-600', 'Pickup Ready': 'bg-amber-100 text-amber-700', 'Picked-Up': 'bg-green/10 text-green' }
  return `text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[s] || 'bg-gray-100 text-gray-600'}`
}
const paymentClass = (s) => {
  const map = { paid: 'bg-green/10 text-green', pending: 'bg-amber-100 text-amber-700', failed: 'bg-red-100 text-red-600' }
  return `text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[s] || 'bg-gray-100 text-gray-500'}`
}

const load = async () => {
  try {
    loadingOrders.value = true
    const { data } = await api.get('/admin/dashboard')
    stats.value = data.stats
    recentOrders.value = data.recentOrders || []
    lowStockProducts.value = data.lowStockProducts || []
    lastRefresh.value = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to load dashboard.')
  } finally {
    loadingOrders.value = false
  }
}

let refreshTimer
onMounted(() => {
  load()
  refreshTimer = setInterval(load, 60000)
})
onBeforeUnmount(() => { if (refreshTimer) clearInterval(refreshTimer) })
</script>
