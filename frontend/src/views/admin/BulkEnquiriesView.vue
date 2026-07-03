<template>
  <div>
    <h1 class="font-serif text-2xl mb-6">Bulk Enquiries 📦</h1>
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-5 space-y-2"><div v-for="i in 4" :key="i" class="h-12 bg-gray-100 rounded animate-pulse"></div></div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Name</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Phone</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Variety</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Qty</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">City</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Status</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Date</th>
          <th class="px-4 py-3"></th>
        </tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="e in enquiries" :key="e._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-medium">{{ e.name }}<div v-if="e.company" class="text-xs text-gray-400">{{ e.company }}</div></td>
            <td class="px-4 py-3">{{ e.phone }}</td>
            <td class="px-4 py-3 text-gray-600">{{ e.variety }}</td>
            <td class="px-4 py-3 font-semibold text-green">{{ e.quantity }}</td>
            <td class="px-4 py-3 text-gray-500">{{ e.city }}</td>
            <td class="px-4 py-3">
              <select :value="e.status" @change="updateStatus(e._id,$event.target.value)" class="text-xs border border-gray-200 rounded-lg px-2 py-1">
                <option v-for="s in ['New','Contacted','Converted','Closed']" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ fmtDate(e.createdAt) }}</td>
            <td class="px-4 py-3">
              <a :href="`https://wa.me/91${e.phone}?text=${encodeURIComponent('Hi '+e.name+'! Regarding your bulk mango enquiry.')}`" target="_blank" class="text-green text-lg">💬</a>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading&&!enquiries.length" class="p-12 text-center text-gray-400">No bulk enquiries yet</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
const enquiries = ref([]); const loading = ref(true)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN')
const load = async () => { loading.value=true; try { const {data}=await api.get('/admin/bulk-enquiries'); enquiries.value=data.enquiries } finally { loading.value=false } }
const updateStatus = async (id,status) => { await api.patch(`/admin/bulk-enquiries/${id}`,{status}) }
onMounted(load)
</script>
