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
            <td class="px-4 py-3 font-mono font-bold">{{ p.pincode }}<div v-if="p.isServiceable===false" class="text-[10px] text-red-600 font-sans">Unserviceable</div></td>
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
          <div class="col-span-2">
            <label class="form-label">PIN Code *</label>
            <input v-model="nf.pincode" :class="['form-input', errors.pincode && 'is-invalid']" maxlength="6" placeholder="600001"/>
            <p v-if="errors.pincode" class="form-error">{{ errors.pincode }}</p>
          </div>
          <div>
            <label class="form-label">City *</label>
            <input v-model="nf.city" :class="['form-input', errors.city && 'is-invalid']" placeholder="Chennai"/>
            <p v-if="errors.city" class="form-error">{{ errors.city }}</p>
          </div>
          <div>
            <label class="form-label">State *</label>
            <input v-model="nf.state" :class="['form-input', errors.state && 'is-invalid']" placeholder="Tamil Nadu"/>
            <p v-if="errors.state" class="form-error">{{ errors.state }}</p>
          </div>
          <div><label class="form-label">Zone</label><select v-model="nf.zone" class="form-input"><option value="tamil-nadu">Tamil Nadu</option><option value="south-india">South India</option><option value="rest-india">Rest of India</option></select></div>
          <div><label class="form-label">Fee (₹)</label><input v-model.number="nf.deliveryFee" type="number" class="form-input" placeholder="80"/></div>
          <div class="col-span-2"><label class="form-label">Est. Days</label><input v-model="nf.estimatedDays" class="form-input" placeholder="1-2 days"/></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="nf.isServiceable" type="checkbox" class="accent-green"/> Deliver to this PIN</label>
        <div v-if="!nf.isServiceable"><label class="form-label">Customer-facing reason</label><input v-model="nf.reason" class="form-input" placeholder="Delivery temporarily unavailable"/></div>
        <label class="flex items-center gap-2 text-sm"><input v-model="nf.isActive" type="checkbox" class="accent-green"/> Use this PIN override</label>
        <div class="flex gap-3">
          <button @click="showForm=false" class="btn btn-ghost flex-1 btn-sm">Cancel</button>
          <button @click="createOrUpdate" :disabled="saving" class="btn btn-primary flex-1 btn-sm">
            <span v-if="saving" class="spinner"></span>{{ editingId ? 'Save' : 'Add' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'
import { isRequired, isPincode6, runValidation } from '@/lib/validators.js'
const toast = useToastStore()
const pincodes = ref([]); const showForm = ref(false); const saving = ref(false)
const editingId = ref('')
const errors = ref({})
const emptyForm = () => ({ pincode:'',city:'',state:'',zone:'tamil-nadu',deliveryFee:80,estimatedDays:'1-2 days',isServiceable:true,reason:'',isActive:true })
const nf = ref(emptyForm())
const load   = async () => { try { const {data}=await api.get('/admin/pincodes'); pincodes.value=data.pincodes } catch { toast.error('Failed to load pincodes.') } }
const remove = async (id) => {
  if(!confirm('Remove pincode?')) return
  try { await api.delete(`/admin/pincodes/${id}`); await load(); toast.success('Pincode removed.') }
  catch (err) { toast.error(err.response?.data?.message || 'Failed to remove pincode.') }
}
const edit = (p) => { errors.value = {}; editingId.value = p._id; nf.value = { pincode:p.pincode, city:p.city, state:p.state, zone:p.zone, deliveryFee:p.deliveryFee, estimatedDays:p.estimatedDays, isServiceable:p.isServiceable !== false, reason:p.reason || '', isActive: p.isActive !== false }; showForm.value = true }
const createOrUpdate = async () => {
  errors.value = runValidation(nf.value, {
    pincode: [[isPincode6, 'Pincode must be 6 digits.']],
    city: [[isRequired, 'City is required.']],
    state: [[isRequired, 'State is required.']]
  })
  if (Object.keys(errors.value).length) { toast.error('Please fix the highlighted fields.'); return }

  saving.value = true
  try {
    if (editingId.value) await api.put(`/admin/pincodes/${editingId.value}`,nf.value)
    else await api.post('/admin/pincodes',nf.value)
    toast.success(editingId.value ? 'Pincode updated.' : 'Pincode added.')
    showForm.value=false; editingId.value=''; nf.value=emptyForm()
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save pincode.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
