<!-- ComplaintsView.vue -->
<template>
  <div>
    <h1 class="font-serif text-2xl mb-6">Complaints 📸</h1>
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-5 space-y-2"><div v-for="i in 4" :key="i" class="h-12 bg-gray-100 rounded animate-pulse"></div></div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Ref</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Order</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Phone</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Description</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Status</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Date</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in complaints" :key="c._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-bold text-green text-xs">{{ c.complaintNumber }}</td>
            <td class="px-4 py-3 text-xs">{{ c.orderId?.orderNumber || c.orderId }}</td>
            <td class="px-4 py-3">{{ c.phone }}</td>
            <td class="px-4 py-3 text-xs text-gray-500 max-w-[160px] truncate">{{ c.description }}</td>
            <td class="px-4 py-3">
              <select :value="c.status" @change="updateStatus(c._id,$event.target.value)" class="text-xs border border-gray-200 rounded-lg px-2 py-1">
                <option v-for="s in ['New','Reviewing','Resolved','Rejected']" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ fmtDate(c.createdAt) }}</td>
            <td class="px-4 py-3">
              <a v-if="c.photos?.length" :href="c.photos[0].url" target="_blank" class="text-green text-xs font-medium">📸 View</a>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading&&!complaints.length" class="p-12 text-center text-gray-400">No complaints received</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
const complaints = ref([]); const loading = ref(true)
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN')
const load = async () => { loading.value=true; try { const {data}=await api.get('/admin/complaints'); complaints.value=data.complaints } finally { loading.value=false } }
const updateStatus = async (id,status) => { await api.patch(`/admin/complaints/${id}`,{status}) }
onMounted(load)
</script>
