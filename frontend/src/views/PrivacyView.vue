<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]"><h1>Privacy Policy</h1><p>Last updated: June 2026</p></div>
    <div class="max-w-2xl mx-auto px-6 py-16">
      <div class="space-y-6 text-sm text-gray-600">
        <div v-for="s in sections" :key="s.title">
          <h2 class="font-serif text-lg text-gray-900 mb-2">{{ s.title }}</h2>
          <p class="leading-relaxed">{{ s.content }}</p>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
const sections = [
  { title:'Information We Collect', content:'We collect your name, phone number, email address, and delivery address when you register or place an order. We also collect order history and communication preferences.' },
  { title:'How We Use Your Information', content:'Your information is used solely for order fulfillment, delivery coordination, and sending order status updates via WhatsApp and email. We do not use your data for marketing without consent.' },
  { title:'WhatsApp Communication', content:'By providing your phone number, you consent to receiving order-related WhatsApp messages. These include OTPs, order confirmations, and delivery updates.' },
  { title:'Payment Data', content:'We do not store your payment card details. All payment processing is handled by Razorpay, which is PCI-DSS compliant. Your financial data never touches our servers.' },
  { title:'Data Sharing', content:'We do not sell, rent, or share your personal information with third parties except as required for order delivery (courier partners) or as required by law.' },
  { title:'Data Security', content:'We use industry-standard encryption and security measures to protect your data. Our servers are secured and access is restricted to authorized personnel only.' },
  { title:'Contact Us', content:'For any privacy concerns or to request deletion of your data, contact us at hello@MagiliniFarms.in or WhatsApp +91 9999999999.' },
]
</script>

