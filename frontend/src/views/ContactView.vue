<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>Contact Us 📞</h1><p>We're here Mon–Sat, 8am–8pm</p></div>
    <div class="max-w-4xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
      <div>
        <h2 class="font-serif text-2xl mb-6">Get in Touch</h2>
        <div class="space-y-4 mb-8">
          <div class="flex items-center gap-3 text-sm"><span class="text-2xl">📞</span><div><div class="font-semibold">Phone / WhatsApp</div><div class="text-gray-500">+91 9999999999</div></div></div>
          <div class="flex items-center gap-3 text-sm"><span class="text-2xl">📧</span><div><div class="font-semibold">Email</div><div class="text-gray-500">hello@MagiliniFarms.in</div></div></div>
          <div class="flex items-center gap-3 text-sm"><span class="text-2xl">📍</span><div><div class="font-semibold">Farm Address</div><div class="text-gray-500">123, Farm Road, Salem — 636001, Tamil Nadu</div></div></div>
          <div class="flex items-center gap-3 text-sm"><span class="text-2xl">🕐</span><div><div class="font-semibold">Business Hours</div><div class="text-gray-500">Mon–Sat: 8am–8pm · Farm Pickup: 7am–6pm · Sunday: Closed</div></div></div>
        </div>
        <a href="https://wa.me/919999999999" target="_blank" class="btn btn-wa mb-4 w-full">💬 Chat on WhatsApp</a>
        <!-- Google Maps Embed -->
        <div class="rounded-2xl overflow-hidden h-48 bg-gray-100">
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d62534.86743019898!2d78.00000000000001!3d11.65!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babf1d000000001%3A0x1!2sSalem%2C%20Tamil%20Nadu!5e0!3m2!1sen!2sin!4v1"
            width="100%" height="100%" style="border:0" loading="lazy"></iframe>
        </div>
        <a href="https://maps.google.com" target="_blank" class="btn btn-ghost w-full mt-2 text-sm">🗺️ Get Directions on Google Maps</a>
      </div>
      <div>
        <h2 class="font-serif text-2xl mb-6">Send a Message</h2>
        <div class="card card-body space-y-4">
          <div><label class="form-label">Name *</label><input v-model="form.name" class="form-input" placeholder="Your name"/></div>
          <div><label class="form-label">Phone *</label><input v-model="form.phone" class="form-input" placeholder="9876543210"/></div>
          <div><label class="form-label">Subject</label>
            <select v-model="form.subject" class="form-input">
              <option>Order Enquiry</option><option>Bulk Order</option><option>Product Query</option><option>Other</option>
            </select>
          </div>
          <div><label class="form-label">Message *</label><textarea v-model="form.message" class="form-input resize-none h-28" placeholder="Your message..."></textarea></div>
          <button @click="submit" class="btn btn-primary w-full">Send Message →</button>
          <p v-if="sent" class="text-green text-sm text-center">✅ Message sent! We'll reply within 24 hours.</p>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
const form = ref({ name:'', phone:'', subject:'Order Enquiry', message:'' }); const sent = ref(false)
const submit = () => {
  if (!form.value.name || !form.value.phone || !form.value.message) return alert('Please fill all required fields.')
  const msg = `Hi! Contact form:\nName: ${form.value.name}\nPhone: ${form.value.phone}\nSubject: ${form.value.subject}\nMessage: ${form.value.message}`
  window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`,'_blank')
  sent.value = true
}
</script>

