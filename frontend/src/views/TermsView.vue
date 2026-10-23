<!-- TermsView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[60px] sm:mt-[68px]"><h1>Terms & Conditions</h1><p>Last updated: June 2026</p></div>
    <div class="max-w-2xl mx-auto px-6 py-16 prose prose-sm text-gray-600">
      <div class="space-y-6">
        <div v-for="section in sections" :key="section.title">
          <h2 class="font-serif text-xl text-gray-900 mb-3">{{ section.title }}</h2>
          <p class="leading-relaxed">{{ section.content }}</p>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
const sections = [
  { title:'1. Orders', content:'All orders placed on MagiliniFarms are final and binding. Once an order is confirmed, it cannot be cancelled by the customer. Orders are accepted subject to product availability.' },
  { title:'2. Minimum Order', content:'Each product may be ordered from 1kg. However, the minimum total cart quantity to place an order is 3kg. Orders below 3kg total cannot be processed.' },
  { title:'3. No Cancellation', content:'Orders cannot be cancelled once placed. Mangoes are perishable goods that are specifically harvested and packed for each order. We are unable to accept cancellations for any reason.' },
  { title:'4. No Returns or Replacements', content:'All sales are final. We do not offer returns or replacements as mangoes are fresh perishable produce. Please order carefully and verify your delivery address before placing orders.' },
  { title:'5. Delivery', content:'Delivery fees are charged based on your location. MagiliniFarms is not responsible for delays caused by courier companies, natural disasters, or other factors beyond our control.' },
  { title:'6. Farm Pickup', content:'For farm pickup orders, customers must collect within the specified date and business hours. Uncollected orders will not be refunded.' },
  { title:'7. Pricing', content:'All prices are inclusive of applicable taxes. Delivery fees are additional and shown at checkout. Prices are subject to change without notice.' },
  { title:'8. Contact', content:'For any queries, contact us at ashokbkaa@gmail.com or WhatsApp +91 9943996614. We respond within 24 business hours.' },
]
</script>

