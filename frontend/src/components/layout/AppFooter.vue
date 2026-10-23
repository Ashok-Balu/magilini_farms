<template>
  <footer class="bg-gray-900 text-gray-400 pt-10 sm:pt-12 pb-6 px-4 sm:px-6">
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8 sm:mb-10">
        <div class="sm:col-span-2 md:col-span-1">
          <div class="font-serif text-lg sm:text-xl font-bold text-white mb-3">Magilini🥭Farms</div>
          <p class="text-xs sm:text-sm leading-relaxed mb-4">Farm-fresh mangoes from our farm in Karur, Tamil Nadu. No carbide, no middlemen.</p>
          <div class="flex gap-3">
            <a v-for="s in socials" :key="s.label" :href="s.href" target="_blank"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center text-sm sm:text-base hover:bg-mango hover:text-gray-900 transition-colors">{{ s.icon }}</a>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-white/80 mb-3 sm:mb-4">Shop</h4>
          <div class="space-y-2">
            <router-link v-for="l in shopLinks" :key="l.to" :to="l.to" class="block text-xs sm:text-sm hover:text-mango transition-colors">{{ l.label }}</router-link>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-white/80 mb-3 sm:mb-4">Info</h4>
          <div class="space-y-2">
            <router-link v-for="l in infoLinks" :key="l.to" :to="l.to" class="block text-xs sm:text-sm hover:text-mango transition-colors">{{ l.label }}</router-link>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-white/80 mb-3 sm:mb-4">Contact</h4>
          <div class="space-y-2 text-xs sm:text-sm">
            <div>📞 +91 9943996614</div>
            <div>📧 ashokbkaa@gmail.com</div>
            <div>📍 Karur, Tamil Nadu — 639118</div>
            <div class="pt-2 border-t border-white/10 text-[10px] sm:text-xs space-y-0.5">
              <div class="font-semibold text-white/60 mb-1">Business Hours</div>
              <div>Mon–Sat: 8am – 8pm</div>
              <div>Farm Pickup: 7am – 6pm</div>
              <div class="text-red-400">Sunday: Closed</div>
            </div>
          </div>
        </div>
      </div>
      <div class="border-t border-white/10 pt-4 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-xs">
        <span>© 2026 MagiliniFarms · Made with ❤️ in Karur, Tamil Nadu</span>
        <div class="flex gap-4">
          <router-link to="/terms" class="hover:text-mango">Terms</router-link>
          <router-link to="/privacy" class="hover:text-mango">Privacy</router-link>
          <router-link to="/returns" class="hover:text-mango">Returns</router-link>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const socials   = [
  { icon: '📸', label: 'Instagram', href: 'https://instagram.com/MagiliniFarms' },
  { icon: '👥', label: 'Facebook',  href: 'https://facebook.com/MagiliniFarms' },
  { icon: '▶️', label: 'YouTube',   href: 'https://youtube.com/@MagiliniFarms' },
  { icon: '💬', label: 'WhatsApp',  href: 'https://wa.me/919943996614' },
]
const shopLinks = [
  { to: '/shop?category=mangoes', label: 'Mangoes' },
  { to: '/shop?category=fresh-fruits', label: 'Fresh Fruits' },
  { to: '/bulk',                  label: 'Bulk Orders' },
  { to: '/shop',                  label: 'All Products' },
]
const infoLinks = [
  { to: '/about',     label: 'About Us' },
  { to: '/contact',   label: 'Contact' },
  { to: '/faq',       label: 'FAQ' },
  { to: '/track',     label: 'Track Order' },
  { to: '/complaint', label: 'Report Damage' },
  { to: '/returns',   label: 'Return Policy' },
]
</script>
