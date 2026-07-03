<template>
  <nav class="fixed top-0 left-0 right-0 z-50 h-[68px] bg-cream/95 backdrop-blur-md border-b border-gray-100 flex items-center px-4 md:px-8 gap-4">
    <!-- Logo -->
    <router-link to="/" class="font-serif text-xl font-bold text-green flex items-center gap-1 shrink-0">
      Magilini<span class="text-mango">🥭</span>Farms
    </router-link>

    <!-- Desktop nav links -->
    <div class="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
      <router-link v-for="link in navLinks" :key="link.to" :to="link.to"
        class="px-3 py-2 rounded-full text-sm font-medium text-gray-500 hover:bg-green hover:text-white transition-colors whitespace-nowrap"
        active-class="bg-green text-white">
        {{ link.label }}
      </router-link>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2 ml-auto">
      <button @click="showSearch = true"
        class="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-green hover:text-white hover:border-green transition-colors">
        🔍
      </button>

      <router-link to="/cart"
        class="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-green hover:text-white hover:border-green transition-colors">
        🛒
        <span v-if="cartStore.count > 0"
          class="absolute -top-1 -right-1 w-5 h-5 bg-mango text-gray-900 text-xs font-bold rounded-full flex items-center justify-center">
          {{ cartStore.count }}
        </span>
      </router-link>

      <router-link v-if="!authStore.isLoggedIn" to="/login"
        class="bg-green text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-mid transition-colors">
        Sign In
      </router-link>

      <div v-else class="relative">
        <button @click="menuOpen = !menuOpen"
          class="bg-green text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-mid flex items-center gap-2">
          👤 {{ firstName }}
        </button>
        <div v-if="menuOpen" class="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <router-link v-if="authStore.isAdmin" to="/admin" @click="menuOpen = false"
            class="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">⚙️ Admin Panel</router-link>
          <router-link to="/account" @click="menuOpen = false"
            class="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">📋 My Orders</router-link>
          <button @click="handleLogout"
            class="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 text-left">🚪 Sign Out</button>
        </div>
      </div>

      <!-- Mobile menu button -->
      <button @click="mobileOpen = !mobileOpen" class="md:hidden w-10 h-10 flex items-center justify-center text-gray-600 text-xl">☰</button>
    </div>
  </nav>

  <!-- Mobile Drawer -->
  <div v-if="mobileOpen" class="fixed inset-0 z-40 md:hidden">
    <div class="absolute inset-0 bg-black/50" @click="mobileOpen = false"></div>
    <div class="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
      <div class="p-5 bg-green">
        <div class="font-serif text-xl font-bold text-white">Magilini🥭Farms</div>
      </div>
      <nav class="flex-1 p-4 overflow-y-auto">
        <router-link v-for="link in navLinks" :key="link.to" :to="link.to" @click="mobileOpen = false"
          class="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-green/10 hover:text-green mb-1">
          {{ link.label }}
        </router-link>
      </nav>
    </div>
  </div>

  <!-- Search Modal -->
  <div v-if="showSearch" class="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-16 px-4" @click.self="showSearch = false">
    <div class="bg-white w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
      <div class="flex items-center gap-3 p-4 border-b">
        <span class="text-gray-400">🔍</span>
        <input ref="searchRef" v-model="searchQuery" @input="doSearch"
          placeholder="Search mangoes, fruits..."
          class="flex-1 outline-none text-sm font-medium"
          @keydown.esc="showSearch = false"/>
        <button @click="showSearch = false; searchQuery = ''; searchResults = []" class="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div class="max-h-80 overflow-y-auto p-2">
        <div v-if="!searchResults.length && searchQuery" class="text-center py-8 text-gray-400 text-sm">No products found</div>
        <router-link v-for="p in searchResults" :key="p._id" :to="`/product/${p.slug}`"
          @click="showSearch = false; searchQuery = ''; searchResults = []"
          class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div class="w-12 h-12 bg-warm rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
            <img v-if="p.images?.[0]" :src="p.images[0].url" class="w-full h-full object-cover rounded-xl" :alt="p.name"/>
            <span v-else>🥭</span>
          </div>
          <div>
            <div class="font-semibold text-sm">{{ p.name }}</div>
            <div class="text-xs text-gray-400">from ₹{{ p.variants?.[0]?.price }} / {{ p.variants?.[0]?.weight }}</div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useCartStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const router    = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const menuOpen   = ref(false)
const mobileOpen = ref(false)
const showSearch = ref(false)
const searchQuery   = ref('')
const searchResults = ref([])
const searchRef  = ref(null)

const firstName = computed(() => authStore.user?.name?.split(' ')[0] || 'Me')

const navLinks = [
  { to: '/',                      label: 'Home' },
  { to: '/shop',                  label: 'Shop All' },
  { to: '/shop?category=mangoes', label: 'Mangoes' },
  { to: '/shop?category=gifts',   label: 'Gift Boxes' },
  { to: '/bulk',                  label: 'Bulk Orders' },
  { to: '/about',                 label: 'About' },
  { to: '/contact',               label: 'Contact' },
]

watch(showSearch, val => { if (val) nextTick(() => searchRef.value?.focus()) })

let searchTimer
const doSearch = () => {
  clearTimeout(searchTimer)
  if (!searchQuery.value.trim()) { searchResults.value = []; return }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/products', { params: { search: searchQuery.value, limit: 6 } })
      searchResults.value = data.products
    } catch { searchResults.value = [] }
  }, 300)
}

const handleLogout = async () => {
  menuOpen.value = false
  await authStore.logout()
  router.push('/')
}
</script>
