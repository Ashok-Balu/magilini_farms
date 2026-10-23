<template>
  <div>
    <AppNavbar/>
    <!-- Hero -->
    <section class="relative mt-[60px] sm:mt-[68px] overflow-hidden bg-gradient-to-br from-green via-green-mid to-green-light py-20 md:py-28 px-6">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 left-20 text-8xl">💬</div>
        <div class="absolute bottom-10 right-16 text-7xl">🥭</div>
      </div>
      <div class="relative max-w-4xl mx-auto text-center">
        <span class="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">We're Here to Help</span>
        <h1 class="font-serif text-4xl md:text-6xl text-white mb-4 leading-tight">Get in Touch</h1>
        <p class="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">Have questions about our mangoes? Need help with an order? We'd love to hear from you.</p>
      </div>
    </section>

    <!-- Quick Contact Cards -->
    <section class="relative -mt-8 z-10 max-w-5xl mx-auto px-6">
      <div class="grid sm:grid-cols-3 gap-4">
        <a href="https://wa.me/919943996614" target="_blank" class="bg-white rounded-2xl shadow-lg p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-[#25D366]/10 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">💬</div>
          <div class="font-semibold text-sm">WhatsApp</div>
          <div class="text-gray-500 text-xs mt-1">Fastest response</div>
        </a>
        <a href="tel:+919943996614" class="bg-white rounded-2xl shadow-lg p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-green/10 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">📞</div>
          <div class="font-semibold text-sm">Call Us</div>
          <div class="text-gray-500 text-xs mt-1">+91 9943996614</div>
        </a>
        <a href="mailto:ashokbkaa@gmail.com" class="bg-white rounded-2xl shadow-lg p-6 text-center hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div class="w-14 h-14 rounded-2xl bg-mango/10 flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform">📧</div>
          <div class="font-semibold text-sm">Email</div>
          <div class="text-gray-500 text-xs mt-1">ashokbkaa@gmail.com</div>
        </a>
      </div>
    </section>

    <!-- Main Content -->
    <section class="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div class="grid lg:grid-cols-5 gap-10 lg:gap-14">
        <!-- Left Column: Info + Map -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Business Info -->
          <div>
            <span class="section-eyebrow">Our Details</span>
            <h2 class="text-3xl font-serif mb-6">Find Us Here</h2>
            <div class="space-y-5">
              <div class="flex items-start gap-4">
                <span class="flex-shrink-0 w-11 h-11 rounded-xl bg-green/10 flex items-center justify-center text-xl">📍</span>
                <div>
                  <div class="font-semibold text-sm">Farm Address</div>
                  <div class="text-gray-500 text-sm mt-0.5 leading-relaxed">7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham, Karur — 639118</div>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <span class="flex-shrink-0 w-11 h-11 rounded-xl bg-mango/10 flex items-center justify-center text-xl">🕐</span>
                <div>
                  <div class="font-semibold text-sm">Business Hours</div>
                  <div class="text-gray-500 text-sm mt-0.5 leading-relaxed">
                    <div>Mon – Sat: 8am – 8pm</div>
                    <div>Farm Pickup: 7am – 6pm</div>
                    <div>Sunday: Closed</div>
                  </div>
                </div>
              </div>
              <div class="flex items-start gap-4">
                <span class="flex-shrink-0 w-11 h-11 rounded-xl bg-green/10 flex items-center justify-center text-xl">⏱️</span>
                <div>
                  <div class="font-semibold text-sm">Response Time</div>
                  <div class="text-gray-500 text-sm mt-0.5">WhatsApp: Within 1 hour<br/>Email: Within 24 hours</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Map -->
          <div class="rounded-3xl overflow-hidden shadow-md border border-gray-100">
            <div class="h-56 bg-gray-100">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.5!2d78.0825!3d10.9575!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3baa2598ff9b4029%3A0xe3981d2da7644da1!2sAshok%20Tex!5e0!3m2!1sen!2sin!4v1"
                width="100%" height="100%" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
            <a href="https://maps.app.goo.gl/pD5kpNbr5AteYKMYA" target="_blank" class="flex items-center justify-center gap-2 p-4 bg-white text-green font-semibold text-sm hover:bg-green/5 transition-colors">
              <span>🗺️</span> Open in Google Maps
            </a>
          </div>

          <!-- WhatsApp CTA -->
          <a href="https://wa.me/919943996614" target="_blank" class="block bg-[#25D366] rounded-3xl p-6 text-white text-center hover:-translate-y-1 hover:shadow-xl transition-all wa-pulse">
            <div class="text-3xl mb-2">💬</div>
            <div class="font-bold text-lg">Chat on WhatsApp</div>
            <div class="text-white/80 text-sm mt-1">Typically replies within an hour</div>
          </a>
        </div>

        <!-- Right Column: Contact Form -->
        <div class="lg:col-span-3">
          <div class="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 md:p-8 sticky top-24">
            <div class="mb-6">
              <h3 class="font-serif text-2xl mb-1">Send a Message</h3>
              <p class="text-gray-500 text-sm">Fill out the form and we'll get back to you as soon as possible.</p>
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

              <div>
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" :class="['form-input', fieldErrors.email && 'is-invalid']" placeholder="you@email.com"/>
                <p v-if="fieldErrors.email" class="form-error">{{ fieldErrors.email }}</p>
              </div>

              <div>
                <label class="form-label">What can we help with?</label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="sub in subjects"
                    :key="sub"
                    type="button"
                    @click="form.subject = sub"
                    class="px-4 py-2.5 rounded-xl text-xs font-medium border transition-all"
                    :class="form.subject === sub ? 'bg-green text-white border-green' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-green/50'"
                  >{{ sub }}</button>
                </div>
              </div>

              <div>
                <label class="form-label">Message *</label>
                <textarea v-model="form.message" :class="['form-input resize-none h-32', fieldErrors.message && 'is-invalid']" placeholder="Tell us how we can help you..."></textarea>
                <p v-if="fieldErrors.message" class="form-error">{{ fieldErrors.message }}</p>
              </div>

              <button type="submit" :disabled="loading" class="btn btn-primary w-full btn-lg">
                <span v-if="loading" class="spinner"></span>{{ loading ? 'Sending…' : 'Send Message' }}
              </button>

              <Transition name="fade">
                <div v-if="sent" class="bg-green/10 border border-green/20 rounded-2xl p-4 text-center">
                  <div class="text-2xl mb-1">✉️</div>
                  <div class="font-semibold text-green text-sm">Message Sent!</div>
                  <div class="text-gray-500 text-xs mt-1">We'll get back to you within 24 hours.</div>
                </div>
              </Transition>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="bg-white py-16 md:py-20">
      <div class="max-w-3xl mx-auto px-6">
        <div class="text-center mb-10">
          <span class="section-eyebrow">FAQ</span>
          <h2 class="text-2xl md:text-3xl font-serif">Common Questions</h2>
        </div>
        <div class="space-y-4">
          <div
            v-for="(faq, i) in faqs"
            :key="i"
            class="border border-gray-100 rounded-2xl overflow-hidden"
          >
            <button
              @click="openFaq = openFaq === i ? -1 : i"
              class="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
            >
              <span class="font-semibold text-sm pr-4">{{ faq.q }}</span>
              <span class="text-gray-400 text-xl flex-shrink-0 transition-transform" :class="openFaq === i ? 'rotate-45' : ''">+</span>
            </button>
            <Transition name="fade">
              <div v-if="openFaq === i" class="px-5 pb-5 text-gray-500 text-sm leading-relaxed">{{ faq.a }}</div>
            </Transition>
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
import { isRequired, isPhone10, isEmail, runValidation } from '@/lib/validators.js'

const toast = useToastStore()
const form = ref({ name: '', phone: '', email: '', subject: 'Order Enquiry', message: '' })
const loading = ref(false)
const sent = ref(false)
const openFaq = ref(-1)
const fieldErrors = ref({})

const subjects = ['Order Enquiry', 'Bulk Order', 'Delivery Issue', 'Product Quality']

const faqs = [
  { q: 'How do I track my order?', a: 'Once your order is shipped, you will receive a tracking link via WhatsApp and SMS. You can also check your order status in your account dashboard.' },
  { q: 'What areas do you deliver to?', a: 'We deliver across all major cities in India. Delivery typically takes 2-4 days depending on your location. For remote areas, please contact us for availability.' },
  { q: 'Can I visit the farm for pickup?', a: 'Yes! Farm pickups are available Monday to Saturday, 7am to 6pm. You can place your order online and select "Farm Pickup" at checkout, or just walk in.' },
  { q: 'What is your return/refund policy?', a: 'If you receive damaged mangoes, share photos on WhatsApp within 24 hours of delivery. We will either replace them or issue a full refund — no questions asked.' },
  { q: 'Do you offer custom packaging for gifting?', a: 'Yes! We offer premium gift packaging for orders of all sizes. Contact us on WhatsApp to discuss branding and packaging options for corporate or personal gifts.' },
]

const submit = () => {
  fieldErrors.value = runValidation(form.value, {
    name: [[isRequired, 'Name is required.']],
    phone: [[isPhone10, 'Enter a valid 10-digit phone number.']],
    email: [[(v) => !v || isEmail(v), 'Enter a valid email address.']],
    message: [[isRequired, 'Message is required.']]
  })
  if (Object.keys(fieldErrors.value).length) { toast.error('Please fix the highlighted fields.'); return }

  loading.value = true
  const msg = `Hi! Contact form:\nName: ${form.value.name}\nPhone: ${form.value.phone}\nSubject: ${form.value.subject}\nMessage: ${form.value.message}`
  window.open(`https://wa.me/919943996614?text=${encodeURIComponent(msg)}`, '_blank')
  sent.value = true
  loading.value = false
  toast.success('Message sent! We\'ll get back to you soon.')
}
</script>
