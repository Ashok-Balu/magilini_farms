<template>
  <div>
    <AppNavbar/>
    <!-- Hero -->
    <section class="relative mt-[60px] sm:mt-[68px] overflow-hidden bg-gradient-to-br from-green via-green-mid to-green-light py-20 md:py-28 px-6">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 right-20 text-8xl">📦</div>
        <div class="absolute bottom-10 left-16 text-7xl">🥭</div>
      </div>
      <div class="relative max-w-4xl mx-auto text-center">
        <span class="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">For Restaurants, Corporates & Events</span>
        <h1 class="font-serif text-4xl md:text-6xl text-white mb-4 leading-tight">Bulk & Corporate<br/>Orders</h1>
        <p class="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Special pricing for 10kg+ orders. Perfect for restaurants, corporate gifting, weddings, and festival celebrations.</p>
      </div>
    </section>

    <!-- Pricing Tiers -->
    <section class="relative -mt-8 z-10 max-w-5xl mx-auto px-6">
      <div class="bg-white rounded-3xl shadow-xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div v-for="tier in pricingTiers" :key="tier.range" class="space-y-1">
          <div class="text-sm font-bold text-green uppercase tracking-wide">{{ tier.range }}</div>
          <div class="text-2xl md:text-3xl font-bold text-gray-900">{{ tier.discount }}</div>
          <div class="text-xs text-gray-500">{{ tier.note }}</div>
        </div>
      </div>
    </section>

    <!-- Benefits + Form Section -->
    <section class="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div class="grid lg:grid-cols-5 gap-10 lg:gap-14">
        <!-- Left: Benefits -->
        <div class="lg:col-span-2 space-y-8">
          <div>
            <span class="section-eyebrow">Why Choose Us</span>
            <h2 class="text-3xl md:text-4xl font-serif leading-tight">Why Bulk Order<br/>From Us?</h2>
          </div>

          <div class="space-y-4">
            <div v-for="(b, i) in benefits" :key="i" class="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:shadow-md transition-all">
              <span class="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green/10 to-green/5 flex items-center justify-center text-lg">{{ b.icon }}</span>
              <div>
                <div class="font-semibold text-sm">{{ b.title }}</div>
                <div class="text-gray-500 text-xs mt-0.5">{{ b.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Use Cases -->
          <div class="bg-gradient-to-br from-mango-pale to-warm rounded-3xl p-6">
            <h3 class="font-semibold text-sm mb-3">Perfect For</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="use in useCases" :key="use" class="bg-white/80 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full">{{ use }}</span>
            </div>
          </div>

          <!-- Contact Card -->
          <div class="bg-green rounded-3xl p-6 text-white">
            <h3 class="font-semibold mb-4">Prefer to Talk?</h3>
            <div class="space-y-3 text-sm">
              <a href="https://wa.me/919943996614" class="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                <span class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">💬</span>
                WhatsApp (Preferred)
              </a>
              <a href="tel:+919943996614" class="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                <span class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">📞</span>
                +91 9943996614
              </a>
              <a href="mailto:ashokbkaa@gmail.com" class="flex items-center gap-3 text-white/90 hover:text-white transition-colors">
                <span class="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">📧</span>
                ashokbkaa@gmail.com
              </a>
            </div>
          </div>
        </div>

        <!-- Right: Form -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 md:p-8 sticky top-24">
            <div class="mb-6">
              <h3 class="font-serif text-2xl mb-1">Submit Bulk Enquiry</h3>
              <p class="text-gray-500 text-sm">We'll get back to you within 24 hours with a custom quote.</p>
            </div>

            <form @submit.prevent="submit" class="space-y-5">
              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Name *</label>
                  <input v-model="form.name" :class="['form-input', fieldErrors.name && 'is-invalid']" placeholder="Your full name"/>
                  <p v-if="fieldErrors.name" class="form-error">{{ fieldErrors.name }}</p>
                </div>
                <div>
                  <label class="form-label">Phone *</label>
                  <input v-model="form.phone" :class="['form-input', fieldErrors.phone && 'is-invalid']" placeholder="9876543210" maxlength="10"/>
                  <p v-if="fieldErrors.phone" class="form-error">{{ fieldErrors.phone }}</p>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Email</label>
                  <input v-model="form.email" type="email" :class="['form-input', fieldErrors.email && 'is-invalid']" placeholder="you@company.com"/>
                  <p v-if="fieldErrors.email" class="form-error">{{ fieldErrors.email }}</p>
                </div>
                <div>
                  <label class="form-label">Company</label>
                  <input v-model="form.company" class="form-input" placeholder="Company name"/>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Variety *</label>
                  <select v-model="form.variety" :class="['form-input', fieldErrors.variety && 'is-invalid']">
                    <option value="" disabled>Select variety</option>
                    <option>Alphonso</option>
                    <option>Banganapalli</option>
                    <option>Neelam</option>
                    <option>Malgova</option>
                    <option>Imam Pasand</option>
                    <option>Mixed Box</option>
                    <option>Other</option>
                  </select>
                  <p v-if="fieldErrors.variety" class="form-error">{{ fieldErrors.variety }}</p>
                </div>
                <div>
                  <label class="form-label">Quantity (kg) *</label>
                  <input v-model="form.quantity" :class="['form-input', fieldErrors.quantity && 'is-invalid']" placeholder="e.g. 50"/>
                  <p v-if="fieldErrors.quantity" class="form-error">{{ fieldErrors.quantity }}</p>
                </div>
              </div>

              <div class="grid sm:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Delivery City *</label>
                  <input v-model="form.city" :class="['form-input', fieldErrors.city && 'is-invalid']" placeholder="Chennai"/>
                  <p v-if="fieldErrors.city" class="form-error">{{ fieldErrors.city }}</p>
                </div>
                <div>
                  <label class="form-label">Required By</label>
                  <input v-model="form.requiredBy" type="date" class="form-input"/>
                </div>
              </div>

              <div>
                <label class="form-label">Special Requirements</label>
                <textarea v-model="form.message" class="form-input resize-none h-24" placeholder="Custom packaging, branding needs, delivery schedule..."></textarea>
              </div>

              <button type="submit" :disabled="loading" class="btn btn-primary w-full btn-lg">
                <span v-if="loading" class="spinner"></span>{{ loading ? 'Submitting…' : 'Get Custom Quote' }}
              </button>

              <Transition name="fade">
                <div v-if="success" class="bg-green/10 border border-green/20 rounded-2xl p-4 text-center">
                  <div class="text-2xl mb-1">🎉</div>
                  <div class="font-semibold text-green text-sm">Enquiry Submitted!</div>
                  <div class="text-gray-500 text-xs mt-1">We'll contact you within 24 hours with a custom quote.</div>
                </div>
              </Transition>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials/Trust Strip -->
    <section class="bg-white py-16 md:py-20">
      <div class="max-w-5xl mx-auto px-6">
        <div class="text-center mb-10">
          <span class="section-eyebrow">Trusted By</span>
          <h2 class="text-2xl md:text-3xl font-serif">Our Bulk Customers Love Us</h2>
        </div>
        <div class="grid sm:grid-cols-3 gap-6">
          <div v-for="t in testimonials" :key="t.name" class="p-6 rounded-3xl border border-gray-100 hover:shadow-md transition-all">
            <div class="text-mango text-lg mb-3">★★★★★</div>
            <p class="text-gray-600 text-sm leading-relaxed mb-4">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-green/10 flex items-center justify-center text-green font-bold text-xs">{{ t.name[0] }}</div>
              <div>
                <div class="font-semibold text-xs">{{ t.name }}</div>
                <div class="text-gray-400 text-xs">{{ t.role }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <AppFooter/>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'
import { isRequired, isPhone10, isEmail, runValidation } from '@/lib/validators.js'

const toast = useToastStore()
const form = ref({ name: '', phone: '', email: '', company: '', variety: '', quantity: '', city: '', requiredBy: '', message: '' })
const loading = ref(false)
const success = ref(false)
const fieldErrors = ref({})

const pricingTiers = [
  { range: '10–25 kg', discount: '5% off', note: 'Small bulk' },
  { range: '25–50 kg', discount: '10% off', note: 'Medium bulk' },
  { range: '50–100 kg', discount: '15% off', note: 'Large bulk' },
  { range: '100+ kg', discount: 'Custom', note: 'Call for quote' },
]

const benefits = [
  { icon: '💰', title: 'Volume Discounts', desc: 'Up to 15% off on larger quantities' },
  { icon: '📦', title: 'Custom Packaging', desc: 'Your branding, your boxes, your way' },
  { icon: '⚡', title: 'Priority Dispatch', desc: 'Guaranteed freshness with same-day shipping' },
  { icon: '💬', title: 'Dedicated Support', desc: 'Personal WhatsApp line for corporate clients' },
  { icon: '🚛', title: 'Pan-India Delivery', desc: 'We deliver bulk orders across all major cities' },
  { icon: '🎁', title: 'Festival Gifting', desc: 'Perfect for Diwali, Pongal, and corporate gifts' },
]

const useCases = ['Restaurants', 'Hotels', 'Corporate Gifting', 'Weddings', 'Diwali Hampers', 'Pongal Gifts', 'Juice Bars', 'Ice Cream Shops', 'Event Catering']

const testimonials = [
  { name: 'Priya Sharma', role: 'Restaurant Owner, Chennai', quote: 'The freshness and consistency is unmatched. Our dessert menu relies on their Alphonsos every season.' },
  { name: 'Karthik R.', role: 'Corporate HR, Bangalore', quote: 'We gifted 200 boxes to employees for Diwali. Everyone loved it! Ordering again this year.' },
  { name: 'Meera Krishnan', role: 'Event Planner, Coimbatore', quote: 'Delivered 100kg for a wedding in perfect condition. Their custom packaging was a hit with guests.' },
]

const submit = async () => {
  fieldErrors.value = runValidation(form.value, {
    name: [[isRequired, 'Name is required.']],
    phone: [[isPhone10, 'Enter a valid 10-digit phone number.']],
    email: [[(v) => !v || isEmail(v), 'Enter a valid email address.']],
    variety: [[isRequired, 'Please select a variety.']],
    quantity: [[isRequired, 'Quantity is required.']],
    city: [[isRequired, 'City is required.']]
  })
  if (Object.keys(fieldErrors.value).length) { toast.error('Please fix the highlighted fields.'); return }

  loading.value = true
  try {
    await api.post('/bulk-enquiry', form.value)
    success.value = true
    toast.success('Enquiry submitted! We\'ll contact you within 24 hours.')
    form.value = { name: '', phone: '', email: '', company: '', variety: '', quantity: '', city: '', requiredBy: '', message: '' }
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed. Please try again or WhatsApp us directly.')
  } finally {
    loading.value = false
  }
}
</script>
