<template>
  <div>
    <AppNavbar/>

    <!-- Announcement bar -->
    <div class="bg-green text-white text-center py-2 px-4 text-xs font-semibold mt-[68px]">
      🥭 Mango Season is Here! &nbsp;<strong class="text-mango">Use WELCOME20 for 20% off</strong>&nbsp; your first order
    </div>

    <!-- HERO SLIDER -->
    <div class="relative overflow-hidden bg-green" style="height:min(85vh,580px)">
      <div class="flex h-full transition-transform duration-700 ease-in-out"
        :style="`transform:translateX(-${currentSlide * 100}%)`">
        <div v-for="(slide, i) in slides" :key="i"
          class="min-w-full h-full relative flex items-center px-8 md:px-24"
          :style="`background:${slide.bg}`">
          <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>
          <div class="relative z-10 max-w-xl">
            <div class="inline-block bg-mango/20 border border-mango/50 text-mango text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
              {{ slide.tag }}
            </div>
            <h1 class="font-serif text-4xl md:text-5xl text-white leading-tight mb-4" v-html="slide.title"></h1>
            <p class="text-white/70 text-sm md:text-base leading-relaxed mb-8 max-w-md">{{ slide.desc }}</p>
            <div class="flex gap-3 flex-wrap">
              <router-link :to="slide.cta1.to" class="btn btn-mango btn-lg">{{ slide.cta1.label }}</router-link>
              <a :href="waOrder" target="_blank" class="btn btn-wa btn-lg">💬 WhatsApp Order</a>
            </div>
          </div>
          <div v-if="slide.offer" class="absolute top-8 right-8 w-24 h-24 bg-mango rounded-full flex flex-col items-center justify-center text-gray-900 font-bold text-center shadow-xl">
            <span class="text-2xl font-bold leading-none">{{ slide.offer }}</span>
            <span class="text-xs font-semibold">OFF</span>
          </div>
        </div>
      </div>
      <button @click="prev" class="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/30 text-white text-2xl flex items-center justify-center hover:bg-white/25 backdrop-blur-sm transition-colors">‹</button>
      <button @click="next" class="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/30 text-white text-2xl flex items-center justify-center hover:bg-white/25 backdrop-blur-sm transition-colors">›</button>
      <div class="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
        <button v-for="(_, i) in slides" :key="i" @click="goTo(i)"
          :class="['h-2 rounded-full transition-all duration-300', i === currentSlide ? 'w-6 bg-mango' : 'w-2 bg-white/40']"></button>
      </div>
    </div>

    <!-- Offer strip -->
    <div class="bg-green py-3 px-4 flex flex-wrap gap-x-8 gap-y-1 justify-center">
      <div v-for="item in strip" :key="item.text" class="flex items-center gap-2 text-white text-xs font-medium">
        <span>{{ item.icon }}</span>{{ item.text }}
      </div>
    </div>

    <!-- Pincode checker -->
    <div class="bg-warm py-4 px-6">
      <div class="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        <div class="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <span class="text-gray-400">📍</span>
          <input v-model="pincodeInput" type="text" maxlength="6" placeholder="Enter PIN code to check delivery"
            class="flex-1 outline-none text-sm" @keyup.enter="checkPincode"/>
        </div>
        <button @click="checkPincode" class="btn btn-primary shrink-0">Check Delivery</button>
      </div>
      <div v-if="pinResult !== null" class="max-w-2xl mx-auto mt-2 text-sm font-medium"
        :class="pinResult.serviceable ? 'text-green' : 'text-red-500'">
        {{ pinResult.serviceable
          ? `✅ We deliver to ${pinResult.city}! Fee: ₹${pinResult.deliveryFee} · ${pinResult.estimatedDays}${pinResult.estimatedDeliveryDate ? ` · ETA ${pinResult.estimatedDeliveryDate.from} to ${pinResult.estimatedDeliveryDate.to}` : ''}`
          : '❌ We don\'t deliver here yet. Farm pickup available!' }}
      </div>
    </div>

    <!-- Categories -->
    <section class="py-14 px-6">
      <div class="max-w-6xl mx-auto">
        <div class="section-eyebrow">Browse by Category</div>
        <h2 class="section-title">Shop by Category</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-6">
          <router-link v-for="cat in categories" :key="cat._id" :to="`/shop?category=${cat.slug}`"
            class="bg-white rounded-2xl p-4 text-center border border-gray-100 hover:bg-green hover:border-green hover:text-white transition-all cursor-pointer group">
            <div class="text-3xl mb-2">{{ cat.emoji }}</div>
            <div class="text-xs font-semibold">{{ cat.name }}</div>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-12 px-6 bg-white">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-end justify-between mb-8">
          <div>
            <div class="section-eyebrow">Our Best</div>
            <h2 class="section-title mb-0">Featured Products 🌟</h2>
          </div>
          <router-link to="/shop" class="btn btn-ghost btn-sm">View All →</router-link>
        </div>
        <div v-if="loadingProducts" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="bg-gray-100 rounded-2xl h-72 animate-pulse"></div>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ProductCard v-for="p in featuredProducts" :key="p._id" :product="p"/>
        </div>
      </div>
    </section>

    <!-- Promo Banner -->
    <div class="mx-6 my-8 bg-gradient-to-r from-green to-green-mid rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
      <div>
        <h2 class="font-serif text-2xl md:text-3xl text-white mb-2">🎁 Corporate & Bulk Gifting</h2>
        <p class="text-white/70 text-sm max-w-md">Send mangoes to your team, clients, or family. Custom branding available. Pan-India delivery.</p>
      </div>
      <div class="flex gap-3 shrink-0 flex-wrap">
        <router-link to="/bulk" class="btn btn-mango">Bulk Enquiry</router-link>
        <a :href="waBulk" target="_blank" class="btn btn-wa">💬 WhatsApp</a>
      </div>
    </div>

    <!-- Top Selling -->
    <section class="py-12 px-6 bg-warm">
      <div class="max-w-6xl mx-auto">
        <div class="flex items-end justify-between mb-8">
          <div>
            <div class="section-eyebrow">Customer Favorites</div>
            <h2 class="section-title mb-0">Top Selling This Week 🔥</h2>
          </div>
          <router-link to="/shop" class="btn btn-ghost btn-sm">Explore Shop →</router-link>
        </div>
        <div v-if="loadingTopSelling" class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="bg-gray-100 rounded-2xl h-72 animate-pulse"></div>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ProductCard v-for="p in topSellingProducts" :key="p._id" :product="p"/>
        </div>
      </div>
    </section>

    <!-- Why Us -->
    <section class="py-16 px-6 bg-warm">
      <div class="max-w-5xl mx-auto text-center">
        <div class="section-eyebrow">Why Choose Us</div>
        <h2 class="section-title">Farm to Table, No Shortcuts</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          <div v-for="item in whyUs" :key="item.title" class="bg-white rounded-2xl p-5 text-center border border-gray-100">
            <div class="text-3xl mb-3">{{ item.icon }}</div>
            <h4 class="font-semibold text-sm mb-1">{{ item.title }}</h4>
            <p class="text-gray-500 text-xs leading-relaxed">{{ item.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-16 px-6 bg-white">
      <div class="max-w-4xl mx-auto">
        <div class="section-eyebrow">Happy Customers</div>
        <h2 class="section-title">What Families Say 💚</h2>
        <div class="grid md:grid-cols-3 gap-4 mt-6">
          <div v-for="t in testimonials" :key="t.name" class="card card-body">
            <div class="text-mango text-sm mb-2">★★★★★</div>
            <blockquote class="text-gray-600 text-sm leading-relaxed italic mb-3">"{{ t.text }}"</blockquote>
            <div class="text-xs font-semibold text-green">— {{ t.name }}, {{ t.city }}</div>
          </div>
        </div>
      </div>
    </section>

    <AppFooter/>

    <!-- Floating WhatsApp -->
    <a :href="waOrder" target="_blank" title="Order on WhatsApp"
      class="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white z-40 wa-pulse"
      style="background:#25D366">💬</a>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AppNavbar   from '@/components/layout/AppNavbar.vue'
import AppFooter   from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/shop/ProductCard.vue'
import { useProductStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const productStore     = useProductStore()
const categories       = ref([])
const featuredProducts = ref([])
const topSellingProducts = ref([])
const loadingProducts  = ref(true)
const loadingTopSelling = ref(true)
const pincodeInput     = ref('')
const pinResult        = ref(null)
const currentSlide     = ref(0)
let slideTimer

const waOrder = `https://wa.me/919999999999?text=${encodeURIComponent('Hi! I want to order mangoes from MagiliniFarms.')}`
const waBulk  = `https://wa.me/919999999999?text=${encodeURIComponent('Hi! I want to enquire about bulk mango orders.')}`

const slides = [
  { bg: 'linear-gradient(135deg,#0D2E18,#1E5631)', tag: '🌿 230 Trees · Naturally Grown', title: 'Pure <em>Farm Fresh</em><br/>Mangoes', desc: 'Straight from our farm to your doorstep. No middlemen, no carbide, no cold storage.', cta1: { to: '/shop?category=mangoes', label: '🛍️ Shop Mangoes' }, offer: '20%' },
  { bg: 'linear-gradient(135deg,#1a3a2a,#2D5A1B)', tag: '👑 King of Fruits', title: 'Premium<br/><em>Alphonso</em><br/>Mango',     desc: 'Rich saffron flesh, zero fibre, intense aroma. Hand-picked at peak ripeness.',     cta1: { to: '/product/alphonso-mango',  label: 'Order Now' } },
  { bg: 'linear-gradient(135deg,#2D3A10,#4A6A1B)', tag: '🎁 Perfect for Gifting',          title: 'Mango <em>Gift Boxes</em><br/>For Every Occasion', desc: 'Curated boxes with our finest varieties. Beautiful packaging delivered fresh.', cta1: { to: '/shop?category=gifts',     label: 'See Gift Boxes' } },
  { bg: 'linear-gradient(135deg,#1B2D40,#1E4D5A)', tag: '🏭 Bulk Orders Welcome',          title: '<em>10kg+ Orders</em><br/>at Wholesale Price',     desc: 'Restaurants, hotels, corporates — fresh farm mangoes at the best price.',     cta1: { to: '/bulk',                   label: 'Bulk Enquiry' } },
]

const strip = [
  { icon: '🌿', text: '100% No Carbide' }, { icon: '🥭', text: '230 Trees, Own Farm' },
  { icon: '🏪', text: 'Farm Pickup Available' }, { icon: '📦', text: '1–3 Day Delivery' },
  { icon: '💯', text: 'Pan-India Delivery' },
]

const whyUs = [
  { icon: '🌳', title: 'Own 230 Trees',      desc: 'We grow what we sell. No sourcing from markets.' },
  { icon: '🚫', title: 'Zero Carbide',        desc: 'Naturally tree-ripened. No chemicals ever.' },
  { icon: '📦', title: 'Safe Packaging',      desc: 'Each mango individually wrapped. Arrives bruise-free.' },
  { icon: '🚚', title: 'Pan-India Delivery',  desc: 'Shipped within 24hrs. Delivered in 1–3 days.' },
  { icon: '💬', title: 'Direct Farmer',       desc: 'Talk directly to us — not a call centre.' },
  { icon: '🏪', title: 'Farm Pickup Free',    desc: 'Collect fresh from our Salem farm yourself.' },
]

const testimonials = [
  { text: 'Best mangoes I\'ve had since childhood. The Alphonso was incredibly fragrant. Will order every season!', name: 'Priya K.', city: 'Chennai' },
  { text: 'Ordered the gift box for my parents. Packaging was excellent, arrived perfectly ripe. They loved it!',   name: 'Rajan M.', city: 'Bangalore' },
  { text: 'Fast WhatsApp reply, honest pricing, mangoes arrived perfectly ripe. This is how fruit should taste!',   name: 'Anitha S.', city: 'Hyderabad' },
]

const next = () => goTo((currentSlide.value + 1) % slides.length)
const prev = () => goTo((currentSlide.value - 1 + slides.length) % slides.length)
const goTo = (i) => { currentSlide.value = i }

const checkPincode = async () => {
  if (pincodeInput.value.length !== 6) return
  try {
    const { data } = await api.get(`/delivery/check/${pincodeInput.value}`)
    pinResult.value = data
  } catch { pinResult.value = { serviceable: false } }
}

onMounted(async () => {
  slideTimer = setInterval(next, 5000)
  try {
    categories.value       = (await productStore.fetchCategories()).slice(0, 7)
    featuredProducts.value = await productStore.fetchFeatured()
    const { data } = await api.get('/products/top-selling', { params: { limit: 8 } })
    topSellingProducts.value = data.products || []
  } finally { loadingProducts.value = false }
  loadingTopSelling.value = false
})

onBeforeUnmount(() => clearInterval(slideTimer))
</script>

