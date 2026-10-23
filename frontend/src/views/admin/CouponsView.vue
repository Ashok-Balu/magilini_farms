<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-2xl">Coupons 🏷️</h1>
      <button @click="showForm=true" class="btn btn-primary btn-sm">+ New Coupon</button>
    </div>
    <div class="card overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b"><tr>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Code</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Type</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Value</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Used</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Expires</th>
          <th class="text-left px-4 py-3 text-xs font-bold uppercase text-gray-400">Status</th>
          <th class="px-4 py-3"></th>
        </tr></thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in coupons" :key="c._id" class="hover:bg-gray-50">
            <td class="px-4 py-3 font-bold text-green">{{ c.code }}</td>
            <td class="px-4 py-3 capitalize">{{ c.type }}</td>
            <td class="px-4 py-3">{{ c.type==='percent'?c.value+'%':'₹'+c.value }}</td>
            <td class="px-4 py-3 text-gray-500">{{ c.usedCount }} / {{ c.usageLimit }}</td>
            <td class="px-4 py-3 text-xs text-gray-400">{{ c.expiresAt?fmtDate(c.expiresAt):'No expiry' }}</td>
            <td class="px-4 py-3"><button @click="toggle(c)" :class="['text-xs font-semibold px-2.5 py-1 rounded-full', c.isActive?'bg-green/10 text-green':'bg-red-100 text-red-600']">{{ c.isActive?'Active':'Inactive' }}</button></td>
            <td class="px-4 py-3 flex gap-2">
              <button @click="edit(c)" class="text-green hover:underline text-xs">Edit</button>
              <button @click="remove(c._id)" class="text-red-400 hover:text-red-600 text-xs">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!coupons.length" class="p-12 text-center text-gray-400">No coupons yet</div>
    </div>

    <!-- Add Coupon Modal -->
    <div v-if="showForm" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <h3 class="font-semibold">{{ editingId ? 'Edit Coupon' : 'New Coupon' }}</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="form-label">Code *</label>
            <input v-model="nf.code" :class="['form-input', errors.code && 'is-invalid']" placeholder="WELCOME20"/>
            <p v-if="errors.code" class="form-error">{{ errors.code }}</p>
          </div>
          <div><label class="form-label">Type</label><select v-model="nf.type" class="form-input"><option value="percent">Percent</option><option value="flat">Flat</option><option value="delivery">Free Delivery</option></select></div>
          <div>
            <label class="form-label">Value *</label>
            <input v-model.number="nf.value" type="number" :class="['form-input', errors.value && 'is-invalid']" placeholder="20"/>
            <p v-if="errors.value" class="form-error">{{ errors.value }}</p>
          </div>
          <div><label class="form-label">Min Order (₹)</label><input v-model.number="nf.minOrderAmount" type="number" class="form-input" placeholder="300"/></div>
          <div><label class="form-label">Max Discount (₹)</label><input v-model.number="nf.maxDiscount" type="number" class="form-input" placeholder="500"/></div>
          <div><label class="form-label">Usage Limit</label><input v-model.number="nf.usageLimit" type="number" class="form-input" placeholder="1000"/></div>
          <div class="col-span-2"><label class="form-label">Expires At</label><input v-model="nf.expiresAt" type="date" class="form-input"/></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input v-model="nf.isActive" type="checkbox" class="accent-green"/> Active</label>
        <div class="flex gap-3">
          <button @click="showForm=false" class="btn btn-ghost flex-1 btn-sm">Cancel</button>
          <button @click="createOrUpdate" :disabled="saving" class="btn btn-primary flex-1 btn-sm">
            <span v-if="saving" class="spinner"></span>{{ editingId ? 'Save' : 'Create' }}
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
import { isRequired, isPositiveNumber, runValidation } from '@/lib/validators.js'
const toast = useToastStore()
const coupons = ref([]); const showForm = ref(false); const saving = ref(false)
const editingId = ref('')
const errors = ref({})
const nf = ref({ code:'',type:'percent',value:'',minOrderAmount:0,maxDiscount:null,usageLimit:1000,expiresAt:'',isActive:true })
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN')
const load   = async () => { try { const {data}=await api.get('/admin/coupons'); coupons.value=data.coupons } catch { toast.error('Failed to load coupons.') } }
const toggle = async (c) => {
  try { await api.patch(`/admin/coupons/${c._id}`,{isActive:!c.isActive}); c.isActive=!c.isActive; toast.success(`Coupon ${c.isActive ? 'activated' : 'deactivated'}.`) }
  catch (err) { toast.error(err.response?.data?.message || 'Failed to update coupon.') }
}
const remove = async (id) => {
  if(!confirm('Delete coupon?')) return
  try { await api.delete(`/admin/coupons/${id}`); await load(); toast.success('Coupon deleted.') }
  catch (err) { toast.error(err.response?.data?.message || 'Failed to delete coupon.') }
}
const edit = (c) => { errors.value = {}; editingId.value = c._id; nf.value = { code:c.code, type:c.type, value:c.value, minOrderAmount:c.minOrderAmount, maxDiscount:c.maxDiscount, usageLimit:c.usageLimit, expiresAt: c.expiresAt ? String(c.expiresAt).slice(0,10) : '', isActive: c.isActive }; showForm.value = true }
const createOrUpdate = async () => {
  errors.value = runValidation(nf.value, {
    code: [[isRequired, 'Coupon code is required.']],
    value: [[isPositiveNumber, 'Enter a value greater than zero.']]
  })
  if (Object.keys(errors.value).length) { toast.error('Please fix the highlighted fields.'); return }

  saving.value = true
  try {
    if (editingId.value) await api.put(`/admin/coupons/${editingId.value}`,nf.value)
    else await api.post('/admin/coupons',nf.value)
    toast.success(editingId.value ? 'Coupon updated.' : 'Coupon created.')
    showForm.value=false; editingId.value=''; nf.value={ code:'',type:'percent',value:'',minOrderAmount:0,maxDiscount:null,usageLimit:1000,expiresAt:'',isActive:true }
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save coupon.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
