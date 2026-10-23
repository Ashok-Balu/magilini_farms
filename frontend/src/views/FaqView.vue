<!-- FaqView.vue -->
<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[60px] sm:mt-[68px]"><h1>Frequently Asked Questions</h1><p>Everything you need to know</p></div>
    <div class="max-w-2xl mx-auto px-6 py-16">
      <div v-for="(faq, i) in faqs" :key="i" class="border-b border-gray-100 py-4">
        <button @click="open===i?open=-1:open=i" class="w-full text-left flex justify-between items-center font-semibold text-sm gap-4">
          {{ faq.q }}<span class="text-green text-lg shrink-0">{{ open===i?'−':'+' }}</span>
        </button>
        <div v-if="open===i" class="mt-3 text-sm text-gray-600 leading-relaxed">{{ faq.a }}</div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>
<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'; import AppFooter from '@/components/layout/AppFooter.vue'
const open = ref(-1)
const faqs = [
  { q:'Are your mangoes carbide-free?', a:'Yes, absolutely. All our mangoes are naturally tree-ripened. We never use calcium carbide or any artificial ripening agents. We own all 230 trees and have full control over the entire process.' },
  { q:'What is the minimum order?', a:'Each product can be ordered from 1kg. However, the minimum total cart value to checkout is 3kg. You can mix and match different varieties to meet the 3kg minimum.' },
  { q:'How long does delivery take?', a:'Orders are dispatched within 24 hours of harvest. Delivery takes 1-2 days for Tamil Nadu, 2-3 days for South India, and 3-4 days for rest of India.' },
  { q:'Can I pick up from the farm?', a:'Yes! Choose Farm Pickup at checkout. Our farm is in Karur, Tamil Nadu. Pickup available Mon–Sat, 7am–6pm. You can pay online or pay cash/UPI when you come to collect.' },
  { q:'How do I ripen the mangoes?', a:'Mangoes are shipped semi-ripe to withstand transit. Keep them at room temperature for 2-3 days to ripen fully. Once ripe, refrigerate and consume within 2-3 days.' },
  { q:'Can I cancel my order?', a:'No. Orders cannot be cancelled once placed. Mangoes are perishable and are packed specifically for your order immediately after placement.' },
  { q:'What if mangoes arrive damaged?', a:'We take great care in packaging. If mangoes arrive damaged due to courier mishandling, submit a complaint with photos within 24 hours of delivery. We review each case.' },
  { q:'Do you deliver outside Tamil Nadu?', a:'Yes, we deliver pan-India. Delivery fees: Tamil Nadu ₹80, South India ₹120, Rest of India ₹180. Use our pincode checker to confirm delivery to your area.' },
  { q:'How do I track my order?', a:'You will receive WhatsApp updates at each stage. You can also track at /track using your order number, or log in to your account at /account.' },
  { q:'How do I place a bulk order?', a:'Visit our Bulk Orders page and fill the enquiry form. We will contact you within 24 hours to discuss pricing, varieties, and delivery for large orders.' },
  { q:'What payment methods do you accept?', a:'UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and Net Banking via Razorpay. For orders above ₹2,000, Direct UPI to the farm is available when configured; submit your UTR for admin verification. No COD.' },
]
</script>
