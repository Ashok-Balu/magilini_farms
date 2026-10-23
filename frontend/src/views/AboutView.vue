<template>
  <div>
    <AppNavbar/>
    <!-- Hero with parallax-style layered background -->
    <section class="relative mt-[60px] sm:mt-[68px] overflow-hidden bg-gradient-to-br from-green via-green-mid to-green-light py-20 md:py-28 px-6">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-10 left-10 text-8xl">🌿</div>
        <div class="absolute top-20 right-20 text-6xl">🥭</div>
        <div class="absolute bottom-10 left-1/3 text-7xl">🌳</div>
        <div class="absolute bottom-20 right-10 text-5xl">🍃</div>
      </div>
      <div class="relative max-w-4xl mx-auto text-center">
        <span class="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">Farm Fresh Since Generations</span>
        <h1 class="font-serif text-4xl md:text-6xl text-white mb-4 leading-tight">From Our Trees<br/>To Your Table</h1>
        <p class="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">230 mango trees, one family, zero chemicals. Experience the purest mangoes from Karur, Tamil Nadu.</p>
        <div class="flex flex-wrap justify-center gap-4 mt-8">
          <a href="#story" class="btn btn-mango btn-lg">Our Story</a>
          <a href="https://wa.me/919943996614" target="_blank" class="btn bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 btn-lg">Chat With Us</a>
        </div>
      </div>
    </section>

    <!-- Stats Ribbon -->
    <section class="relative -mt-8 z-10 max-w-5xl mx-auto px-6">
      <div class="bg-white rounded-3xl shadow-xl p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div v-for="stat in stats" :key="stat.label" class="space-y-1">
          <div class="text-3xl md:text-4xl font-bold text-green">{{ stat.value }}</div>
          <div class="text-xs text-gray-500 font-medium uppercase tracking-wide">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- Our Story Section -->
    <section id="story" class="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div class="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        <div class="relative">
          <div class="bg-gradient-to-br from-mango-pale to-warm rounded-3xl p-8 md:p-12 aspect-square flex items-center justify-center">
            <div class="text-center">
              <div class="text-[120px] md:text-[160px] leading-none">🥭</div>
              <div class="mt-4 bg-green/10 rounded-full px-4 py-2 text-green font-semibold text-sm inline-block">100% Natural</div>
            </div>
          </div>
          <div class="absolute -bottom-4 -right-4 bg-green text-white rounded-2xl p-4 shadow-lg hidden md:block">
            <div class="text-2xl font-bold">Since</div>
            <div class="text-sm text-white/80">Generations</div>
          </div>
        </div>
        <div class="space-y-6">
          <span class="section-eyebrow">Our Story</span>
          <h2 class="text-3xl md:text-4xl font-serif leading-tight">A Family Tradition of Growing the Finest Mangoes</h2>
          <p class="text-gray-600 leading-relaxed text-base md:text-lg">We are a family of farmers from Karur, Tamil Nadu, with 230 mango trees that have been growing for decades. Every mango is hand-picked by us, packed with care, and shipped directly to your doorstep.</p>
          <p class="text-gray-600 leading-relaxed text-base md:text-lg">No middlemen, no cold storage, no carbide. Just pure, naturally ripened mangoes from our farm to your family.</p>
          <div class="flex flex-wrap gap-3 pt-2">
            <span class="bg-green/10 text-green text-sm font-medium px-4 py-2 rounded-full">Hand-Picked</span>
            <span class="bg-mango/20 text-mango-dark text-sm font-medium px-4 py-2 rounded-full">Naturally Ripened</span>
            <span class="bg-green/10 text-green text-sm font-medium px-4 py-2 rounded-full">Farm Direct</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Our Promise Section -->
    <section class="bg-white py-20 md:py-28">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-12 md:mb-16">
          <span class="section-eyebrow">Our Promise</span>
          <h2 class="text-3xl md:text-4xl font-serif">What Sets Us Apart</h2>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="(promise, i) in promiseCards" :key="i" class="group p-6 md:p-8 rounded-3xl border border-gray-100 hover:border-green/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div class="w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-2xl mb-5" :class="promise.bg">{{ promise.icon }}</div>
            <h3 class="font-semibold text-lg mb-2">{{ promise.title }}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">{{ promise.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Varieties Section -->
    <section class="py-20 md:py-28">
      <div class="max-w-6xl mx-auto px-6">
        <div class="text-center mb-12 md:mb-16">
          <span class="section-eyebrow">Our Varieties</span>
          <h2 class="text-3xl md:text-4xl font-serif">Premium Mango Collection</h2>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="v in varieties" :key="v.name" class="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 text-center">
            <div class="text-5xl mb-4">{{ v.emoji }}</div>
            <h3 class="font-semibold text-lg mb-1">{{ v.name }}</h3>
            <p class="text-gray-500 text-sm">{{ v.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Visit / CTA Section -->
    <section class="py-20 md:py-28">
      <div class="max-w-5xl mx-auto px-6">
        <div class="bg-gradient-to-br from-green via-green-mid to-green-light rounded-[2rem] p-8 md:p-14 text-white relative overflow-hidden">
          <div class="absolute top-0 right-0 text-[200px] opacity-10 leading-none">🌳</div>
          <div class="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 class="font-serif text-3xl md:text-4xl mb-4">Visit Our Farm</h2>
              <p class="text-white/80 text-base mb-6 leading-relaxed">Come see where your mangoes grow. Walk through our orchards, taste fresh mangoes right off the tree, and experience farm life.</p>
              <div class="space-y-3 text-sm">
                <div class="flex items-center gap-3"><span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">📍</span><span class="text-white/90">7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham, Karur — 639118</span></div>
                <div class="flex items-center gap-3"><span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">🕐</span><span class="text-white/90">Farm Pickups: Mon–Sat, 7am–6pm</span></div>
                <div class="flex items-center gap-3"><span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">📞</span><span class="text-white/90">+91 9943996614</span></div>
              </div>
            </div>
            <div class="flex flex-col items-center md:items-end gap-4">
              <a href="https://maps.app.goo.gl/pD5kpNbr5AteYKMYA" target="_blank" class="btn bg-white text-green font-bold hover:-translate-y-1 shadow-xl btn-lg w-full md:w-auto">Get Directions</a>
              <a href="https://wa.me/919943996614" target="_blank" class="btn bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30 btn-lg w-full md:w-auto">Chat on WhatsApp</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <AppFooter/>
  </div>
</template>

<script setup>
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const stats = [
  { value: '230', label: 'Mango Trees' },
  { value: '5+', label: 'Varieties' },
  { value: '0', label: 'Chemicals' },
  { value: '24hr', label: 'Dispatch' },
]

const promiseCards = [
  { icon: '🌳', title: 'Own Farm Only', desc: 'All 230 trees owned and farmed by us — absolutely no outsourcing.', bg: 'from-green/10 to-green/5' },
  { icon: '🚫', title: 'Zero Chemicals', desc: 'No carbide or artificial ripening agents used — ever.', bg: 'from-red-50 to-orange-50' },
  { icon: '⚡', title: 'Same-Day Dispatch', desc: 'Harvested and dispatched within 24 hours for peak freshness.', bg: 'from-yellow-50 to-amber-50' },
  { icon: '👁️', title: 'Hand Inspected', desc: 'Each mango individually inspected and packed with care.', bg: 'from-blue-50 to-indigo-50' },
  { icon: '🚛', title: 'Direct Delivery', desc: 'Straight from our farm to your door — no middlemen.', bg: 'from-purple-50 to-pink-50' },
  { icon: '💰', title: 'Transparent Pricing', desc: 'What you see is what you pay. No hidden costs, ever.', bg: 'from-emerald-50 to-teal-50' },
]

const varieties = [
  { emoji: '🥭', name: 'Alphonso', desc: 'The king of mangoes — rich, creamy, aromatic' },
  { emoji: '🥭', name: 'Banganapalli', desc: 'Large, sweet, and fibre-free' },
  { emoji: '🥭', name: 'Neelam', desc: 'Small, intensely sweet, and fragrant' },
  { emoji: '🥭', name: 'Malgova', desc: 'Thick pulp with a unique sweet-tangy flavor' },
  { emoji: '🥭', name: 'Imam Pasand', desc: 'Aromatic and buttery smooth texture' },
]
</script>
