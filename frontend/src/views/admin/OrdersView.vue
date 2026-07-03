<template>
  <div>
    <div class="flex items-center justify-between mb-6 gap-3">
      <h1 class="font-serif text-2xl">Orders 📋</h1>
      <button @click="exportCSV" class="btn btn-ghost btn-sm">⬇ CSV Export</button>
    </div>

    <!-- Filters -->
    <div class="card card-body mb-5 grid lg:grid-cols-4 md:grid-cols-2 gap-3 items-center">
      <input v-model="search" @input="debouncedLoad" placeholder="🔍 Search order, phone, name..." class="form-input py-2 text-sm"/>
      <select v-model="statusFilter" @change="syncAndLoad" class="form-input py-2 text-sm">
        <option value="">All Status</option>
        <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-model="paymentFilter" @change="syncAndLoad" class="form-input py-2 text-sm">
        <option value="">All Payment</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="failed">Failed</option>
      </select>
      <select v-model="typeFilter" @change="syncAndLoad" class="form-input py-2 text-sm">
        <option value="">All Types</option>
        <option value="home">Home Delivery</option>
        <option value="pickup">Farm Pickup</option>
      </select>
      <input v-model="customerFilter" @input="debouncedLoad" placeholder="Customer name" class="form-input py-2 text-sm"/>
      <input v-model="phoneFilter" @input="debouncedLoad" placeholder="Phone number" class="form-input py-2 text-sm"/>
      <input v-model="orderNumberFilter" @input="debouncedLoad" placeholder="Order number" class="form-input py-2 text-sm"/>
      <div class="flex gap-2">
        <input v-model="dateFrom" @change="syncAndLoad" type="date" class="form-input py-2 text-sm"/>
        <input v-model="dateTo" @change="syncAndLoad" type="date" class="form-input py-2 text-sm"/>
      </div>
      <span class="text-xs text-gray-400 lg:col-span-4">{{ total }} orders</span>
    </div>

    <!-- Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-6 space-y-2">
        <div v-for="i in 8" :key="i" class="h-12 bg-gray-100 rounded animate-pulse"></div>
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Order</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Customer</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Items</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Amount</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Payment</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Date</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="order in orders" :key="order._id" class="hover:bg-gray-50 cursor-pointer" @click="router.push(`/admin/orders/${order._id}`)">
            <td class="px-4 py-3"><span class="font-bold text-green text-xs">{{ order.orderNumber }}</span><div class="text-[10px] text-gray-400">{{ order.deliveryType==='pickup'?'🏪 Pickup':'🚚 Delivery' }}</div></td>
            <td class="px-4 py-3"><div class="font-medium">{{ order.customer.name }}</div><div class="text-xs text-gray-400">{{ order.customer.phone }}</div></td>
            <td class="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{{ order.items.map(i=>i.name).join(', ') }}</td>
            <td class="px-4 py-3 font-bold">₹{{ order.total }}</td>
            <td class="px-4 py-3 text-xs">{{ order.paymentMethod }}</td>
            <td class="px-4 py-3"><span :class="`status-${order.status}`">{{ order.status }}</span></td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ fmtDate(order.createdAt) }}</td>
            <td class="px-4 py-3" @click.stop>
              <div class="flex items-center gap-2 justify-end">
                <a :href="waLink(order)" target="_blank" class="text-green text-lg" title="WhatsApp">💬</a>
                <router-link :to="`/admin/orders/${order._id}`" class="text-xs text-gray-500 underline">Open</router-link>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading && !orders.length" class="p-12 text-center text-gray-400">No orders found</div>
      <!-- Pagination -->
      <div v-if="totalPages>1" class="flex justify-center gap-2 p-4 border-t border-gray-100">
        <button v-for="p in totalPages" :key="p" @click="goPage(p)"
          :class="['w-8 h-8 rounded-lg text-xs font-semibold', p===page?'bg-green text-white':'bg-gray-100 hover:bg-gray-200']">{{ p }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const router       = useRouter()
const route        = useRoute()
const toast        = useToastStore()
const orders       = ref([])
const loading      = ref(true)
const total        = ref(0)
const page         = ref(1)
const search       = ref('')
const statusFilter = ref('')
const paymentFilter = ref('')
const typeFilter   = ref('')
const customerFilter = ref('')
const phoneFilter = ref('')
const orderNumberFilter = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const limit        = 20
const totalPages   = computed(() => Math.ceil(total.value / limit))
const statuses     = ['New','Confirmed','Packed','Shipped','Delivered','Cancelled','Pickup Ready','Picked-Up']

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})
const waLink  = (o) => `https://wa.me/91${o.customer.phone}?text=${encodeURIComponent(`Hi ${o.customer.name}! Update on your order ${o.orderNumber}.`)}`

let t
const debouncedLoad = () => { clearTimeout(t); t = setTimeout(load, 400) }

const syncQuery = () => {
  router.replace({ query: { ...route.query, page: page.value || 1, search: search.value || undefined, status: statusFilter.value || undefined, paymentStatus: paymentFilter.value || undefined, deliveryType: typeFilter.value || undefined, customerName: customerFilter.value || undefined, phone: phoneFilter.value || undefined, orderNumber: orderNumberFilter.value || undefined, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined } })
}

const syncAndLoad = async () => { page.value = 1; syncQuery(); await load() }

const load = async (resetPage=true) => {
  if (resetPage) page.value=1; loading.value=true
  try {
    const { data } = await api.get('/admin/orders', { params: { page:page.value, limit, search:search.value, status:statusFilter.value, paymentStatus: paymentFilter.value, deliveryType:typeFilter.value, customerName:customerFilter.value, phone:phoneFilter.value, orderNumber:orderNumberFilter.value, dateFrom:dateFrom.value, dateTo:dateTo.value } })
    orders.value = data.orders; total.value = data.total
  } finally { loading.value=false }
}

const goPage = (p) => { page.value=p; syncQuery(); load(false) }

const exportCSV = async () => {
  try {
    const res = await api.get('/admin/orders', {
      params: {
        format: 'csv',
        search: search.value,
        status: statusFilter.value,
        paymentStatus: paymentFilter.value,
        deliveryType: typeFilter.value,
        customerName: customerFilter.value,
        phone: phoneFilter.value,
        orderNumber: orderNumberFilter.value,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value
      },
      responseType: 'blob'
    })

    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Filtered orders exported successfully.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to export orders.')
  }
}

onMounted(async () => {
  const query = route.query
  search.value = query.search || ''
  statusFilter.value = query.status || ''
  paymentFilter.value = query.paymentStatus || ''
  typeFilter.value = query.deliveryType || ''
  customerFilter.value = query.customerName || ''
  phoneFilter.value = query.phone || ''
  orderNumberFilter.value = query.orderNumber || ''
  dateFrom.value = query.dateFrom || ''
  dateTo.value = query.dateTo || ''
  page.value = Number(query.page || 1)
  await load(false)
})
</script>
