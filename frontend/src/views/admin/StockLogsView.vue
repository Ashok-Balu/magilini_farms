<template>
  <div>
    <h1 class="font-serif text-2xl mb-6">Stock Logs 📈</h1>
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-5 space-y-2"><div v-for="i in 6" :key="i" class="h-10 bg-gray-100 rounded animate-pulse"></div></div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Product</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Weight</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Type</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Before</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Change</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">After</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Order</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Date</th>
        </tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="log in logs" :key="log._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ log.productName }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ log.variantWeight }}</td>
            <td class="px-4 py-3"><span :class="['text-xs font-semibold px-2 py-0.5 rounded-full', log.changeType==='order'?'bg-red-100 text-red-600':log.changeType==='manual'?'bg-blue-100 text-blue-700':'bg-green/10 text-green']">{{ log.changeType }}</span></td>
            <td class="px-4 py-3 text-gray-500">{{ log.quantityBefore }}</td>
            <td class="px-4 py-3 font-bold" :class="log.quantityChange<0?'text-red-500':'text-green'">{{ log.quantityChange>0?'+':'' }}{{ log.quantityChange }}</td>
            <td class="px-4 py-3 font-semibold">{{ log.quantityAfter }}</td>
            <td class="px-4 py-3 text-xs text-green">{{ log.orderId?.orderNumber || '—' }}</td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ fmtDate(log.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading&&!logs.length" class="p-12 text-center text-gray-400">No stock changes recorded yet</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
const logs = ref([]); const loading = ref(true)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
onMounted(async () => { try { const {data}=await api.get('/admin/stock-logs'); logs.value=data.logs } finally { loading.value=false } })
</script>
