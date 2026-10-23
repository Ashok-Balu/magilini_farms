<template>
  <div class="max-w-xl">
    <h1 class="font-serif text-2xl mb-6">Business Hours 🕐</h1>
    <div class="card card-body space-y-4">
      <div v-for="h in hours" :key="h.day" class="border-b border-gray-100 pb-4 last:border-0">
        <div class="flex items-center justify-between mb-2">
          <span class="font-semibold capitalize text-sm">{{ h.day }}</span>
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" v-model="h.isOpen" class="accent-green w-4 h-4"/>
            {{ h.isOpen ? 'Open' : 'Closed' }}
          </label>
        </div>
        <div v-if="h.isOpen" class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label text-[10px]">Open</label>
            <input v-model="h.openTime" type="time" class="form-input py-1.5 text-xs"/>
          </div>
          <div>
            <label class="form-label text-[10px]">Close</label>
            <input v-model="h.closeTime" type="time" class="form-input py-1.5 text-xs"/>
          </div>
          <div>
            <label class="form-label text-[10px]">Pickup Open</label>
            <input v-model="h.pickupOpenTime" type="time" class="form-input py-1.5 text-xs"/>
          </div>
          <div>
            <label class="form-label text-[10px]">Pickup Close</label>
            <input v-model="h.pickupCloseTime" type="time" class="form-input py-1.5 text-xs"/>
          </div>
        </div>
      </div>
      <button @click="save" :disabled="saving" class="btn btn-primary w-full">
        <span v-if="saving" class="spinner"></span>{{ saving?'Saving…':'Save Hours' }}
      </button>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'
const toast = useToastStore()
const hours = ref([]); const saving = ref(false)
const load = async () => { try { const {data}=await api.get('/business-hours'); hours.value=data.hours } catch { toast.error('Failed to load business hours.') } }
const save = async () => {
  saving.value=true
  try { await api.patch('/admin/business-hours',{hours:hours.value}); toast.success('Business hours saved!') }
  catch (err) { toast.error(err.response?.data?.message || 'Failed to save business hours.') }
  finally { saving.value=false }
}
onMounted(load)
</script>
