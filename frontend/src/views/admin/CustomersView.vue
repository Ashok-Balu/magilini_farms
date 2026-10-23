<!-- CustomersView.vue -->
<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-2xl">Customers 👥</h1>
      <span class="text-xs text-gray-400">{{ total }} customers</span>
    </div>
    <div class="card card-body mb-5">
      <input v-model="search" @input="debouncedLoad" placeholder="🔍 Search name or phone..." class="form-input py-2 text-sm max-w-md"/>
    </div>
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-5 space-y-2"><div v-for="i in 6" :key="i" class="h-12 bg-gray-100 rounded animate-pulse"></div></div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Name</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Phone</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Email</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Joined</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Status</th>
        </tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in customers" :key="c._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ c.name }}</td>
            <td class="px-4 py-3 text-gray-600">{{ c.phone }}</td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ c.email || '—' }}</td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ fmtDate(c.createdAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="c.isBlocked?'badge bg-red-100 text-red-600':'badge bg-green/10 text-green'">{{ c.isBlocked?'Blocked':'Active' }}</span>
                <button @click="toggleBlock(c)" class="text-xs underline text-gray-500">{{ c.isBlocked ? 'Unblock' : 'Block' }}</button>
              </div>
              <div class="text-[10px] text-gray-400 mt-1">Orders: {{ c.ordersCount || 0 }} · Spent: ₹{{ (c.totalSpent || 0).toLocaleString() }}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading&&!customers.length" class="p-12 text-center text-gray-400">No customers yet</div>
      <div v-if="totalPages>1" class="flex justify-center gap-2 p-4 border-t border-gray-100">
        <button v-for="p in totalPages" :key="p" @click="goPage(p)"
          :class="['w-8 h-8 rounded-lg text-xs font-semibold', p===page?'bg-green text-white':'bg-gray-100 hover:bg-gray-200']">{{ p }}</button>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'
const toast = useToastStore()
const customers = ref([]); const loading = ref(true); const search = ref(''); const total = ref(0); const page = ref(1); const limit = 20; const totalPages = ref(1)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})
let t; const debouncedLoad = () => { clearTimeout(t); t=setTimeout(load,400) }
const load = async () => { loading.value=true; try { const {data}=await api.get('/admin/customers',{params:{search:search.value,page:page.value,limit}}); customers.value=data.customers; total.value=data.total; totalPages.value=Math.ceil((data.total||0)/limit)||1 } catch { toast.error('Failed to load customers.') } finally { loading.value=false } }
const goPage = (p) => { page.value = p; load() }
const toggleBlock = async (c) => {
  const isBlocked = !c.isBlocked
  try { await api.patch(`/admin/customers/${c._id}/block`, { isBlocked }); await load(); toast.success(`Customer ${isBlocked ? 'blocked' : 'unblocked'}.`) }
  catch (err) { toast.error(err.response?.data?.message || 'Failed to update customer.') }
}
onMounted(load)
</script>
