<!-- ReturnsView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>Return Policy</h1><p>All sales final — fresh perishable produce</p></div>
    <div class="max-w-2xl mx-auto px-6 py-16">
      <div class="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-center">
        <div class="text-4xl mb-3">⚠️</div>
        <h2 class="font-serif text-2xl text-red-700 mb-2">No Returns or Replacements</h2>
        <p class="text-red-600 text-sm">All sales are final. We do not accept returns or offer replacements as mangoes are fresh perishable produce.</p>
      </div>
      <div class="space-y-4 text-sm text-gray-600">
        <div v-for="s in sections" :key="s.title">
          <h3 class="font-semibold text-gray-800 mb-1">{{ s.title }}</h3>
          <p class="leading-relaxed">{{ s.content }}</p>
        </div>
      </div>
      <div class="mt-8 card card-body text-center">
        <p class="font-semibold mb-3">Received genuinely damaged goods?</p>
        <p class="text-sm text-gray-500 mb-4">Submit a complaint with photos within 24 hours. We review each case individually.</p>
        <router-link to="/complaint" class="btn btn-primary btn-sm">Report Damage →</router-link>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
const sections = [
  { title:'Why No Returns?', content:'Mangoes are fresh perishable produce harvested specifically for your order. Once picked and shipped, they cannot be returned or resold. This is standard for all fresh produce businesses.' },
  { title:'No Cancellations', content:'Orders cannot be cancelled once placed. We begin packing immediately after order confirmation.' },
  { title:'Damaged Goods', content:'If your order arrives visibly damaged due to courier mishandling, you may submit a complaint with photographic evidence within 24 hours of delivery. We review each case on its merits. Submitting a complaint does not guarantee any compensation — this is entirely at our discretion as a goodwill gesture.' },
  { title:'Quality Concerns', content:'We take great pride in quality. If you have genuine quality concerns not related to personal taste preference, contact us on WhatsApp with photos within 24 hours.' },
]
</script>
