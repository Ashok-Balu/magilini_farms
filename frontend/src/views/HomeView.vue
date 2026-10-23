<template>
  <div>
    <AppNavbar/>

    <!-- Announcement bar -->
    <div class="bg-gradient-to-r from-green via-green-mid to-green text-white text-center py-2 px-4 text-[11px] sm:text-xs font-semibold mt-[60px] sm:mt-[68px]">
      🥭 Mango Season! <strong class="text-mango">WELCOME20 for 20% off</strong><span v-if="cart.freeDeliveryMin > 0"> · Free delivery above ₹{{ cart.freeDeliveryMin }}</span>
    </div>

    <!-- HERO SLIDER -->
    <div class="relative overflow-hidden h-[65vh] sm:h-[70vh] md:h-[75vh] lg:h-[80vh] max-h-[620px]">
      <div class="flex h-full transition-transform duration-700 ease-in-out"
        :style="`transform:translateX(-${currentSlide * 100}%)`">
        <div v-for="(slide, i) in slides" :key="i"
          class="min-w-full h-full relative flex items-center px-5 sm:px-8 md:px-16 lg:px-28"
          :style="`background:${slide.bg}`">
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
          <div class="relative z-10 max-w-lg w-full">
            <div class="inline-block bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[10px] sm:text-[11px] font-bold tracking-widest uppercase px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6">
              {{ slide.tag }}
            </div>
            <h1 class="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-[1.1] mb-3 sm:mb-5" v-html="slide.title"></h1>
            <p class="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed mb-5 sm:mb-8 max-w-md hidden sm:block">{{ slide.desc }}</p>
            <div class="flex gap-2 sm:gap-3 flex-wrap">
              <router-link :to="slide.cta1.to" class="btn btn-mango text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5 shadow-2xl">{{ slide.cta1.label }}</router-link>
              <a :href="waOrder" target="_blank" class="btn bg-white/10 backdrop-blur-sm border border-white/30 text-white text-xs sm:text-sm px-5 sm:px-8 py-2.5 sm:py-3.5 hover:bg-white/20 hidden sm:inline-flex">💬 WhatsApp</a>
            </div>
          </div>
          <div v-if="slide.offer" class="absolute top-4 right-4 sm:top-8 sm:right-8 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-mango rounded-full flex flex-col items-center justify-center text-gray-900 font-bold text-center shadow-2xl animate-bounce-slow">
            <span class="text-lg sm:text-xl md:text-2xl font-bold leading-none">{{ slide.offer }}</span>
            <span class="text-[8px] sm:text-[10px] font-semibold uppercase">OFF</span>
          </div>
        </div>
      </div>
      <button @click="prev" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg sm:text-xl flex items-center justify-center hover:bg-white/25 transition-all">‹</button>
      <button @click="next" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg sm:text-xl flex items-center justify-center hover:bg-white/25 transition-all">›</button>
      <div class="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2">
        <button v-for="(_, i) in slides" :key="i" @click="goTo(i)"
          :class="['h-2 sm:h-2.5 rounded-full transition-all duration-300', i === currentSlide ? 'w-6 sm:w-8 bg-mango' : 'w-2 sm:w-2.5 bg-white/30']"></button>
      </div>
    </div>

    <!-- Trust strip -->
    <div class="bg-green py-3 sm:py-4 px-4 overflow-x-auto">
      <div class="max-w-5xl mx-auto flex gap-4 sm:gap-8 justify-start sm:justify-center min-w-max sm:min-w-0">
        <div v-for="item in strip" :key="item.text" class="flex items-center gap-1.5 sm:gap-2 text-white text-[11px] sm:text-xs font-medium whitespace-nowrap">
          <span>{{ item.icon }}</span>
          <span>{{ item.text }}</span>
        </div>
      </div>
    </div>

    <!-- Delivery check -->
    <div class="bg-cream py-4 px-4 sm:px-6 border-b border-gray-100">
      <div class="max-w-xl mx-auto">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <span class="text-xs sm:text-sm text-gray-600 font-medium text-center sm:text-left shrink-0">📍 Check delivery:</span>
          <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2.5 shadow-sm focus-within:border-green transition-all flex-1">
            <input v-model="pincodeInput" type="text" maxlength="6" placeholder="Enter PIN code"
              class="flex-1 outline-none text-sm bg-transparent min-w-0" @input="onPincodeInput" @keyup.enter="checkPincode"/>
            <button @click="checkPincode" :disabled="pincodeInput.length !== 6"
              class="text-green text-xs sm:text-sm font-bold disabled:text-gray-300 shrink-0">Check</button>
          </div>
          <button @click="useMyLocation" class="text-[11px] text-gray-500 hover:text-green font-medium text-center sm:text-left shrink-0">📍 Auto-detect</button>
        </div>
        <div v-if="locationStatus" class="mt-2 text-[11px] text-gray-400 text-center">{{ locationStatus }}</div>
        <div v-if="detectedPincode" class="mt-2 text-center text-xs text-blue-800">
          Detected PIN {{ detectedPincode }}.
          <button @click="confirmDetectedPincode" class="font-semibold underline">Use this PIN</button>
          <button @click="detectedPincode = ''; locationStatus = ''" class="ml-2 underline">Dismiss</button>
        </div>
        <div v-if="pinResult !== null" class="mt-3 text-center">
          <div v-if="pinResult.serviceable" class="inline-flex items-center gap-1.5 bg-green/5 border border-green/20 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-green">
            ✅ {{ pinResult.city }} · ₹{{ pinResult.deliveryFee }} · {{ pinResult.estimatedDays }}
          </div>
          <div v-else :class="['inline-flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium', pinResult.lookupError ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-600']">
            {{ pinResult.lookupError ? pinResult.message : `❌ ${pinResult.message || 'Not serviceable — Farm pickup available'}` }}
          </div>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <section class="py-10 sm:py-14 lg:py-16 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="text-center mb-6 sm:mb-10">
          <div class="section-eyebrow">Browse by Category</div>
          <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl">Shop by Category</h2>
        </div>
        <div class="flex justify-center gap-3 sm:gap-4 flex-wrap">
          <router-link v-for="cat in categories" :key="cat._id" :to="`/shop?category=${cat.slug}`"
            class="group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center border border-gray-100 hover:border-green hover:shadow-lg transition-all duration-300 w-28 sm:w-36 hover:-translate-y-1">
            <div class="text-3xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-300">{{ cat.emoji }}</div>
            <div class="text-xs sm:text-sm font-semibold text-gray-700 group-hover:text-green transition-colors">{{ cat.name }}</div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <div class="section-eyebrow">Our Best</div>
            <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl mb-0">Featured Products</h2>
          </div>
          <router-link to="/shop" class="btn btn-ghost btn-sm hidden sm:inline-flex">View All →</router-link>
        </div>
        <div v-if="loadingProducts" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div v-for="i in 4" :key="i" class="bg-gray-50 rounded-2xl h-64 sm:h-80 animate-pulse"></div>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <ProductCard v-for="p in featuredProducts" :key="p._id" :product="p"/>
        </div>
        <div class="text-center mt-6 sm:hidden">
          <router-link to="/shop" class="btn btn-ghost btn-sm">View All Products →</router-link>
        </div>
      </div>
    </section>

    <!-- Promo Banner -->
    <section class="py-4 sm:py-6 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-gradient-to-r from-green via-[#1E5631] to-green-mid rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-8 relative overflow-hidden">
          <div class="relative">
            <h2 class="font-serif text-xl sm:text-2xl md:text-3xl text-white mb-2 sm:mb-3">Corporate & Bulk Gifting</h2>
            <p class="text-white/70 text-xs sm:text-sm max-w-md leading-relaxed">Send mangoes to your team, clients, or family. Custom branding & pan-India delivery.</p>
          </div>
          <div class="flex gap-2 sm:gap-3 shrink-0 flex-wrap relative">
            <router-link to="/bulk" class="btn btn-mango text-xs sm:text-sm px-4 sm:px-6 py-2.5 shadow-xl">Bulk Enquiry</router-link>
            <a :href="waBulk" target="_blank" class="btn bg-white/10 border border-white/30 text-white text-xs sm:text-sm px-4 sm:px-6 py-2.5 hover:bg-white/20">💬 WhatsApp</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Top Selling -->
    <section class="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-gradient-to-b from-cream to-white">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <div class="section-eyebrow">Customer Favorites</div>
            <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl mb-0">Top Selling This Week</h2>
          </div>
          <router-link to="/shop" class="btn btn-ghost btn-sm hidden sm:inline-flex">Explore Shop →</router-link>
        </div>
        <div v-if="loadingTopSelling" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <div v-for="i in 4" :key="i" class="bg-gray-50 rounded-2xl h-64 sm:h-80 animate-pulse"></div>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <ProductCard v-for="p in topSellingProducts" :key="p._id" :product="p"/>
        </div>
      </div>
    </section>

    <!-- Why Us -->
    <section class="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-white">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-8 sm:mb-12">
          <div class="section-eyebrow">Why Choose Us</div>
          <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl">Farm to Table, No Shortcuts</h2>
          <p class="text-gray-500 text-xs sm:text-sm leading-relaxed max-w-md mx-auto mt-2 sm:mt-3">We grow what we sell. 230 mango trees, directly to your doorstep — no middlemen, no chemicals.</p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          <div v-for="item in whyUs" :key="item.title" class="group bg-gradient-to-br from-white to-cream rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-gray-100 hover:border-green/30 hover:shadow-lg transition-all duration-300">
            <div class="w-10 h-10 sm:w-14 sm:h-14 mx-auto mb-2 sm:mb-4 rounded-xl sm:rounded-2xl bg-green/5 flex items-center justify-center text-lg sm:text-2xl group-hover:bg-green/10 group-hover:scale-110 transition-all duration-300">{{ item.icon }}</div>
            <h4 class="font-semibold text-xs sm:text-sm mb-1 sm:mb-2 text-gray-900">{{ item.title }}</h4>
            <p class="text-gray-500 text-[10px] sm:text-xs leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 bg-gradient-to-b from-cream to-white">
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8 sm:mb-12">
          <div class="section-eyebrow">Happy Customers</div>
          <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl">What Our Customers Say</h2>
        </div>
        <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          <div v-for="t in testimonials" :key="t.name" class="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-sm">
            <div class="flex gap-0.5 mb-3 sm:mb-4">
              <span v-for="i in 5" :key="i" class="text-mango text-xs sm:text-sm">★</span>
            </div>
            <blockquote class="text-gray-600 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-5">"{{ t.text }}"</blockquote>
            <div class="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
              <div class="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-green/10 flex items-center justify-center text-green text-[10px] sm:text-xs font-bold">{{ t.name[0] }}</div>
              <div>
                <div class="text-xs sm:text-sm font-semibold text-gray-900">{{ t.name }}</div>
                <div class="text-[10px] sm:text-xs text-gray-400">{{ t.city }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-12 sm:py-16 px-4 sm:px-6 bg-green">
      <div class="max-w-3xl mx-auto text-center">
        <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl text-white mb-3 sm:mb-4">Ready to taste farm-fresh mangoes?</h2>
        <p class="text-white/60 text-xs sm:text-sm mb-6 sm:mb-8 max-w-md mx-auto">Order now and get naturally ripened, chemical-free mangoes delivered in 1-3 days.</p>
        <div class="flex gap-3 sm:gap-4 justify-center flex-wrap">
          <router-link to="/shop" class="btn btn-mango text-xs sm:text-sm px-6 sm:px-8 py-3 shadow-xl">🛍️ Shop Now</router-link>
          <a :href="waOrder" target="_blank" class="btn bg-white/10 border border-white/30 text-white text-xs sm:text-sm px-6 sm:px-8 py-3 hover:bg-white/20">💬 WhatsApp Order</a>
        </div>
      </div>
    </section>

    <AppFooter/>

    <!-- Floating WhatsApp -->
    <a :href="waOrder" target="_blank" title="Order on WhatsApp"
      class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl text-white z-40 wa-pulse shadow-2xl"
      style="background:#25D366">💬</a>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppNavbar   from '@/components/layout/AppNavbar.vue'
import AppFooter   from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/shop/ProductCard.vue'
import { useCartStore, useProductStore, usePincodeStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const productStore     = useProductStore()
const pincodeStore     = usePincodeStore()
const cart             = useCartStore()
const categories       = ref([])
const featuredProducts = ref([])
const topSellingProducts = ref([])
const loadingProducts  = ref(true)
const loadingTopSelling = ref(true)
const pincodeInput     = ref(pincodeStore.pincode || '')
const pinResult        = ref(pincodeStore.result)
const locationStatus   = ref('')
const detectedPincode  = ref('')
const currentSlide     = ref(0)
let slideTimer

const waOrder = `https://wa.me/919943996614?text=${encodeURIComponent('Hi! I want to order mangoes from MagiliniFarms.')}`
const waBulk  = `https://wa.me/919943996614?text=${encodeURIComponent('Hi! I want to enquire about bulk mango orders.')}`

const slides = [
  { bg: 'linear-gradient(135deg,#0D2E18,#1E5631)', tag: '🌿 230 Trees · Naturally Grown', title: 'Pure <em class="text-mango not-italic">Farm Fresh</em><br/>Mangoes', desc: 'Straight from our farm to your doorstep. No middlemen, no carbide, no cold storage.', cta1: { to: '/shop?category=mangoes', label: '🛍️ Shop Mangoes' }, offer: '20%' },
  { bg: 'linear-gradient(135deg,#1a3a2a,#2D5A1B)', tag: '👑 King of Fruits', title: 'Premium<br/><em class="text-mango not-italic">Alphonso</em> Mango', desc: 'Rich saffron flesh, zero fibre, intense aroma. Hand-picked at peak ripeness.', cta1: { to: '/product/alphonso-mango-hapus', label: '🥭 Order Now' } },
  { bg: 'linear-gradient(135deg,#2D3A10,#4A6A1B)', tag: '🎁 Perfect for Gifting', title: 'Mango <em class="text-mango not-italic">Gift Boxes</em>', desc: 'Curated premium boxes. Beautiful packaging for any occasion.', cta1: { to: '/product/mango-gift-box-premium', label: '🎁 Gift Boxes' } },
  { bg: 'linear-gradient(135deg,#1B2D40,#1E4D5A)', tag: '🏭 Bulk Orders', title: '<em class="text-mango not-italic">10kg+</em> at<br/>Wholesale Price', desc: 'Restaurants, hotels, corporates — fresh farm mangoes at wholesale.', cta1: { to: '/bulk', label: '📦 Bulk Enquiry' } },
]

const strip = [
  { icon: '🌿', text: '100% No Carbide' },
  { icon: '🥭', text: 'Own Farm' },
  { icon: '🏪', text: 'Farm Pickup' },
  { icon: '📦', text: '1–3 Day Delivery' },
  { icon: '💯', text: 'Pan-India' },
]

const whyUs = [
  { icon: '🌳', title: 'Own 230 Trees',      desc: 'We grow what we sell. No market sourcing.' },
  { icon: '🚫', title: 'Zero Carbide',        desc: 'Naturally tree-ripened. No chemicals ever.' },
  { icon: '📦', title: 'Safe Packaging',      desc: 'Individual foam wrap. Arrives bruise-free.' },
  { icon: '🚚', title: 'Pan-India Delivery',  desc: 'Shipped within 24hrs. 1–3 days anywhere.' },
  { icon: '💬', title: 'Direct From Farmer',  desc: 'Chat directly on WhatsApp. Real answers.' },
  { icon: '🏪', title: 'Farm Pickup Free',    desc: 'Visit our Karur farm. Always free.' },
]

const testimonials = [
  { text: 'Best mangoes since childhood. The Alphonso was incredibly fragrant. Will order every season!', name: 'Priya K.', city: 'Chennai' },
  { text: 'Gift box for my parents was excellent. Arrived perfectly ripe. They were thrilled!', name: 'Rajan M.', city: 'Bangalore' },
  { text: 'Fast WhatsApp reply, honest pricing, perfectly ripe mangoes. This is how fruit should taste!', name: 'Anitha S.', city: 'Hyderabad' },
]

const next = () => goTo((currentSlide.value + 1) % slides.length)
const prev = () => goTo((currentSlide.value - 1 + slides.length) % slides.length)
const goTo = (i) => { currentSlide.value = i }

const onPincodeInput = () => {
  const clean = String(pincodeInput.value || '').replace(/\D/g, '')
  pincodeInput.value = clean
  if (clean.length === 6) {
    clearTimeout(slideTimer)
    slideTimer = setTimeout(checkPincode, 250)
  }
}

const useMyLocation = async () => {
  if (!navigator.geolocation) { locationStatus.value = 'Location is not supported by your browser.'; return }
  locationStatus.value = 'Detecting location…'
  pinResult.value = null
  detectedPincode.value = ''
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          locationStatus.value = 'Invalid location coordinates. Enter your PIN manually.'
          return
        }
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`, {
          headers: { 'Accept-Language': 'en', 'User-Agent': 'MagiliniFarms/1.0' },
          signal: AbortSignal.timeout(10000)
        })
        if (!response.ok) throw new Error('Reverse geocoding service returned an error.')
        const data = await response.json()
        const pincode = String(data.address?.postcode || '').trim()
        if (!/^[1-9][0-9]{5}$/.test(pincode)) { locationStatus.value = 'Could not detect a valid Indian PIN. Enter it manually.'; return }
        detectedPincode.value = pincode
        locationStatus.value = ''
      } catch { locationStatus.value = 'Location lookup failed. Enter your PIN manually.' }
    },
    (error) => {
      locationStatus.value = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Enter your PIN manually.'
        : error.code === error.TIMEOUT
          ? 'Location detection timed out. Enter your PIN manually.'
          : 'Your location is unavailable. Enter your PIN manually.'
    },
    { enableHighAccuracy: true, timeout: 15000 }
  )
}

const confirmDetectedPincode = async () => {
  pincodeInput.value = detectedPincode.value
  detectedPincode.value = ''
  await checkPincode()
}

const checkPincode = async () => {
  if (!/^[1-9][0-9]{5}$/.test(pincodeInput.value)) {
    pinResult.value = { serviceable: false, lookupError: true, message: 'Enter a valid 6-digit Indian PIN code.' }
    return
  }
  const data = await pincodeStore.check(pincodeInput.value)
  pinResult.value = data
  locationStatus.value = ''
}

onMounted(async () => {
  slideTimer = setInterval(next, 5000)
  await cart.loadSettings()
  try {
    categories.value       = await productStore.fetchCategories()
    featuredProducts.value = await productStore.fetchFeatured()
    const { data } = await api.get('/products/top-selling', { params: { limit: 8 } })
    topSellingProducts.value = data.products || []
  } finally { loadingProducts.value = false }
  loadingTopSelling.value = false
})

onBeforeUnmount(() => clearInterval(slideTimer))
</script>

<style scoped>
.animate-bounce-slow {
  animation: bounceSlow 3s ease-in-out infinite;
}
@keyframes bounceSlow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
</style>
