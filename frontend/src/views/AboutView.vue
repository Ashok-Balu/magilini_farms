<!-- AboutView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>About Our Farm 🌳</h1><p>230 trees, one family, pure mangoes</p></div>
    <div class="max-w-3xl mx-auto px-6 py-16 space-y-12">
      <div class="text-center">
        <div class="text-7xl mb-4">🥭</div>
        <h2 class="font-serif text-3xl mb-4">Our Story</h2>
        <p class="text-gray-600 leading-relaxed">We are a family of farmers from Salem, Tamil Nadu, with 230 mango trees that have been growing for decades. Every mango is hand-picked by us, packed with care, and shipped directly to your doorstep — no middlemen, no cold storage, no carbide. Just pure, naturally ripened mangoes from our farm to your family.</p>
      </div>
      <div class="grid sm:grid-cols-3 gap-6 text-center">
        <div class="card card-body"><div class="text-3xl font-bold text-green mb-1">230</div><div class="text-sm text-gray-500">Mango Trees</div></div>
        <div class="card card-body"><div class="text-3xl font-bold text-green mb-1">5+</div><div class="text-sm text-gray-500">Mango Varieties</div></div>
        <div class="card card-body"><div class="text-3xl font-bold text-green mb-1">0</div><div class="text-sm text-gray-500">Chemicals Used</div></div>
      </div>
      <div>
        <h2 class="font-serif text-2xl mb-4">Our Promise</h2>
        <div class="space-y-3">
          <div v-for="p in promises" :key="p" class="flex items-start gap-3 text-sm text-gray-600"><span class="text-green mt-0.5">✅</span>{{ p }}</div>
        </div>
      </div>
      <div class="bg-green rounded-3xl p-8 text-white text-center">
        <h2 class="font-serif text-2xl mb-3">Visit Our Farm</h2>
        <p class="text-white/70 text-sm mb-4">Come see where your mangoes grow. Farm pickups available Mon–Sat, 7am–6pm.</p>
        <div class="text-sm space-y-1"><div>📍 123, Farm Road, Salem — 636001, Tamil Nadu</div><div>📞 +91 9999999999</div></div>
        <a href="https://maps.google.com" target="_blank" class="btn btn-mango mt-4">🗺️ Get Directions</a>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
const promises = ['All 230 trees owned and farmed by us — no outsourcing','No carbide or artificial ripening agents — ever','Dispatched within 24 hours of harvest','Each mango individually inspected and packed','Direct from farmer to your door — no middlemen','Transparent pricing — what you see is what you pay']
</script>
