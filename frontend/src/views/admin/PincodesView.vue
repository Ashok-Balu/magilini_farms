<template>
  <div>
    <div class="flex items-center justify-between mb-6"><h1 class="font-serif text-2xl">Pincodes 📍</h1><button @click="showForm=true" class="btn btn-primary btn-sm">+ Add Pincode</button></div>
    <div class="card card-body mb-4">
      <div class="text-sm text-gray-500 space-y-1">
        <div>🟢 <strong>Tamil Nadu:</strong> ₹80 · 1-2 days</div>
        <div>🔵 <strong>South India:</strong> ₹120 · 2-3 days</div>
        <div>🟡 <strong>Rest of India:</strong> ₹180 · 3-4 days</div>
      </div>
    </div>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">PIN</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">City</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Zone</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Fee</th><th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Days</th><th class="px-4 py-3"></th></tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in pincodes" :key="p._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-mono font-bold">{{ p.pincode }}</td>
            <td class="px-4 py-3">{{ p.city }}</td>
            <td class="px-4 py-3 text-xs capitalize text-gray-500">{{ p.zone }}</td>
            <td class="px-4 py-3 font-semibold text-green">₹{{ p.deliveryFee }}</td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ p.estimatedDays }}</td>
            <td class="px-4 py-3 flex gap-2">
              <button @click="edit(p)" class="text-green hover:underline text-xs">Edit</button>
              <button @click="remove(p._id)" class="text-red-400 hover:text-red-600 text-xs">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!pincodes.length" class="p-12 text-center text-gray-400">No pincodes yet — run the seed script to add defaults</div>
    </div>
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 class="font-semibold">{{ editingId ? 'Edit Pincode' : 'Add Pincode' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2"><label class="form-label">PIN Code *</label><input v-model="nf.pincode" class="form-input" maxlength="6" placeholder="600001"/></div>
          <div><label class="form-label">City *</label><input v-model="nf.city" class="form-input" placeholder="Chennai"/></div>
          <div><label class="form-label">State *</label><input v-model="nf.state" class="form-input" placeholder="Tamil Nadu"/></div>
          <div><label class="form-label">Zone</label><select v-model="nf.zone" class="form-input"><option value="tamil-nadu">Tamil Nadu</option><option value="south-india">South India</option><option value="rest-india">Rest of India</option></select></div>
          <div><label class="form-label">Fee (₹)</label><input v-model.number="nf.deliveryFee" type="number" class="form-input" placeholder="80"/></div>
          <div class="col-span-2"><label class="form-label">Est. Days</label><input v-model="nf.estimatedDays" class="form-input" placeholder="1-2 days"/></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="nf.isActive" type="checkbox" class="accent-green"/> Active</label>
        <div class="flex gap-3"><button @click="showForm=false" class="btn btn-ghost flex-1 btn-sm">Cancel</button><button @click="createOrUpdate" class="btn btn-primary flex-1 btn-sm">{{ editingId ? 'Save' : 'Add' }}</button></div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
const pincodes = ref([]); const showForm = ref(false)
const editingId = ref('')
const nf = ref({ pincode:'',city:'',state:'',zone:'tamil-nadu',deliveryFee:80,estimatedDays:'1-2 days',isActive:true })
const load   = async () => { const {data}=await api.get('/admin/pincodes'); pincodes.value=data.pincodes }
const remove = async (id) => { if(confirm('Remove pincode?')) { await api.delete(`/admin/pincodes/${id}`); await load() } }
const edit = (p) => { editingId.value = p._id; nf.value = { pincode:p.pincode, city:p.city, state:p.state, zone:p.zone, deliveryFee:p.deliveryFee, estimatedDays:p.estimatedDays, isActive: p.isActive }; showForm.value = true }
const createOrUpdate = async () => { if (editingId.value) await api.put(`/admin/pincodes/${editingId.value}`,nf.value); else await api.post('/admin/pincodes',nf.value); showForm.value=false; editingId.value=''; nf.value={ pincode:'',city:'',state:'',zone:'tamil-nadu',deliveryFee:80,estimatedDays:'1-2 days',isActive:true }; await load() }
onMounted(load)
</script>
