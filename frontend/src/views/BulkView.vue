<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>Bulk & Corporate Orders 📦</h1><p>Special pricing for large orders — restaurants, corporates, events</p></div>
    <div class="max-w-3xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
      <div>
        <h2 class="font-serif text-2xl mb-4">Why Bulk Order?</h2>
        <div class="space-y-3 mb-6">
          <div v-for="b in benefits" :key="b" class="flex items-start gap-2 text-sm text-gray-600"><span class="text-green">✅</span>{{ b }}</div>
        </div>
        <div class="bg-green rounded-2xl p-5 text-white text-sm space-y-2">
          <div class="font-semibold text-base mb-2">Contact for Bulk Pricing</div>
          <div>📞 +91 9999999999</div>
          <div>💬 WhatsApp preferred</div>
          <div>📧 hello@MagiliniFarms.in</div>
        </div>
      </div>
      <div class="card card-body space-y-4">
        <h3 class="font-semibold">Submit Bulk Enquiry</h3>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="form-label">Name *</label><input v-model="form.name" class="form-input" placeholder="Your name"/></div>
          <div><label class="form-label">Phone *</label><input v-model="form.phone" class="form-input" placeholder="9876543210"/></div>
        </div>
        <div><label class="form-label">Email</label><input v-model="form.email" type="email" class="form-input" placeholder="you@company.com"/></div>
        <div><label class="form-label">Company (optional)</label><input v-model="form.company" class="form-input" placeholder="Company name"/></div>
        <div><label class="form-label">Variety Interested In *</label>
          <select v-model="form.variety" class="form-input">
            <option>Alphonso</option><option>Banganapalli</option><option>Neelam</option><option>Malgova</option><option>Mixed</option><option>Other</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="form-label">Quantity (kg) *</label><input v-model="form.quantity" class="form-input" placeholder="e.g. 50kg"/></div>
          <div><label class="form-label">Delivery City *</label><input v-model="form.city" class="form-input" placeholder="Chennai"/></div>
        </div>
        <div><label class="form-label">Required By</label><input v-model="form.requiredBy" type="date" class="form-input"/></div>
        <div><label class="form-label">Message</label><textarea v-model="form.message" class="form-input resize-none h-20" placeholder="Any special requirements..."></textarea></div>
        <button @click="submit" :disabled="loading" class="btn btn-primary w-full">{{ loading?'Submitting...':'Submit Enquiry →' }}</button>
        <p v-if="success" class="text-green text-sm text-center">✅ Enquiry submitted! We will contact you within 24 hours.</p>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
import api from '@/lib/api.js'
const form = ref({ name:'',phone:'',email:'',company:'',variety:'Alphonso',quantity:'',city:'',requiredBy:'',message:'' })
const loading = ref(false); const success = ref(false)
const benefits = ['Special discounted pricing for 10kg+ orders','Custom packaging and branding available','Priority dispatch and guaranteed freshness','Dedicated WhatsApp support for corporate clients','Pan-India delivery for all bulk orders','Perfect for Diwali, Pongal, and festival gifting']
const submit = async () => {
  if (!form.value.name||!form.value.phone||!form.value.quantity||!form.value.city) return alert('Please fill all required fields.')
  loading.value = true
  try { await api.post('/bulk-enquiry', form.value); success.value = true } catch { alert('Failed. Please try again or WhatsApp us directly.') }
  finally { loading.value = false }
}
</script>

