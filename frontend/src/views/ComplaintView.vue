<!-- ComplaintView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>Report Damaged Goods 📸</h1><p>Submit within 24 hours of delivery</p></div>
    <div class="max-w-lg mx-auto px-6 py-12">
      <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
        ⚠️ Submitting a complaint does not guarantee any refund or replacement. All sales are final. We review each case individually as a goodwill gesture.
      </div>
      <div v-if="!success" class="card card-body space-y-4">
        <div><label class="form-label">Order Number *</label><input v-model="form.orderId" class="form-input" placeholder="NM-000001 (check your WhatsApp)"/></div>
        <div><label class="form-label">Your Phone *</label><input v-model="form.phone" class="form-input" placeholder="9876543210"/></div>
        <div><label class="form-label">Delivery Date *</label><input v-model="form.deliveryDate" type="date" class="form-input"/></div>
        <div><label class="form-label">Describe the issue *</label><textarea v-model="form.description" class="form-input resize-none h-24" placeholder="Describe exactly what damage occurred..."></textarea></div>
        <div>
          <label class="form-label">Photos (required, max 3)</label>
          <input type="file" accept="image/*" multiple @change="onFiles" class="form-input py-2"/>
          <p class="text-xs text-gray-400 mt-1">Attach clear photos showing the damage</p>
        </div>
        <button @click="submit" :disabled="loading" class="btn btn-primary w-full">{{ loading?'Submitting...':'Submit Complaint →' }}</button>
        <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
      </div>
      <div v-else class="card card-body text-center py-10">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="font-serif text-2xl mb-2">Complaint Submitted</h2>
        <p class="text-gray-500 text-sm mb-4">Reference: <strong class="text-green">{{ complaintRef }}</strong></p>
        <p class="text-gray-500 text-sm mb-6">We will review within 24 hours and contact you on WhatsApp.</p>
        <router-link to="/" class="btn btn-primary btn-sm">Back to Home</router-link>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
import api from '@/lib/api.js'
const form = ref({ orderId:'', phone:'', deliveryDate:'', description:'' })
const files = ref([]); const loading = ref(false); const success = ref(false); const error = ref(''); const complaintRef = ref('')
const onFiles = (e) => { files.value = Array.from(e.target.files).slice(0,3) }
const submit = async () => {
  error.value = ''
  if (!form.value.orderId||!form.value.phone||!form.value.deliveryDate||!form.value.description) { error.value='Please fill all required fields.'; return }
  loading.value = true
  try {
    const fd = new FormData()
    Object.entries(form.value).forEach(([k,v]) => fd.append(k,v))
    files.value.forEach(f => fd.append('photos',f))
    const { data } = await api.post('/complaints', fd, { headers:{'Content-Type':'multipart/form-data'} })
    complaintRef.value = data.complaintNumber; success.value = true
  } catch (err) { error.value = err.response?.data?.message || 'Failed to submit. Please WhatsApp us directly.' }
  finally { loading.value = false }
}
</script>
