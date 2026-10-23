<template>
  <div class="relative flex min-h-screen bg-gray-50">
    <button v-if="mobileNavOpen" @click="mobileNavOpen = false" aria-label="Close admin menu"
      class="fixed inset-0 z-30 bg-black/50 lg:hidden"></button>

    <!-- Sidebar -->
    <aside :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      class="fixed inset-y-0 left-0 z-40 w-60 bg-gradient-to-b from-green to-[#143D24] flex flex-col shrink-0 lg:sticky lg:top-0 h-screen shadow-xl transition-transform duration-200">
      <div class="p-5 border-b border-white/10">
        <router-link to="/admin" class="block" @click="mobileNavOpen = false">
          <div class="font-serif text-lg font-bold text-white">Magilini🥭Farms</div>
          <div class="text-mango text-[10px] font-bold tracking-widest uppercase mt-0.5">Admin Panel</div>
        </router-link>
      </div>

      <nav class="flex-1 p-3 overflow-y-auto space-y-0.5">
        <div class="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-3 pb-1">Main</div>
        <router-link v-for="item in mainNav" :key="item.to" :to="item.to" exact-active-class="active-nav"
          @click="mobileNavOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <span class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto text-[10px] font-bold bg-mango text-gray-900 px-1.5 py-0.5 rounded-full">{{ item.badge }}</span>
        </router-link>

        <div class="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-5 pb-1">Catalog</div>
        <router-link v-for="item in catalogNav" :key="item.to" :to="item.to" exact-active-class="active-nav"
          @click="mobileNavOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <span class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>

        <div class="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 pt-5 pb-1">Settings</div>
        <router-link v-for="item in settingsNav" :key="item.to" :to="item.to" exact-active-class="active-nav"
          @click="mobileNavOpen = false" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <span class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-white/10 space-y-1">
        <div class="flex items-center gap-3 px-3 py-2">
          <div class="w-8 h-8 rounded-full bg-mango/20 flex items-center justify-center text-sm">👤</div>
          <div class="flex-1 min-w-0">
            <div class="text-white text-sm font-medium truncate">{{ auth.user?.name }}</div>
            <div class="text-white/40 text-[10px]">{{ auth.user?.email || 'Admin' }}</div>
          </div>
        </div>
        <a href="/" target="_blank" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors">
          <span class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">🌐</span>
          View Store
        </a>
        <button @click="handleLogout" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/20 w-full transition-colors">
          <span class="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-sm">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 min-w-0 p-4 pt-0 sm:p-6 lg:p-8 overflow-x-hidden">
      <header class="sticky top-0 z-20 -mx-4 mb-4 flex h-14 items-center gap-3 border-b border-gray-200 bg-gray-50/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <button @click="mobileNavOpen = true" aria-label="Open admin menu" class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-lg">☰</button>
        <span class="font-semibold text-gray-900">Magilini Farms</span>
      </header>
      <router-view/>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/index.js'

const router = useRouter()
const auth   = useAuthStore()
const mobileNavOpen = ref(false)

const handleLogout = async () => { await auth.logout(); router.push('/admin/login') }

const mainNav = [
  { to: '/admin',           icon: '📊', label: 'Dashboard' },
  { to: '/admin/orders',    icon: '📋', label: 'Orders' },
  { to: '/admin/payments',  icon: '💳', label: 'Payments' },
  { to: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/admin/audit-logs', icon: '🧾', label: 'Audit History' },
  { to: '/admin/customers', icon: '👥', label: 'Customers' },
]

const catalogNav = [
  { to: '/admin/products',  icon: '🥭', label: 'Products' },
  { to: '/admin/categories',icon: '📂', label: 'Categories' },
  { to: '/admin/reviews',   icon: '⭐', label: 'Reviews' },
  { to: '/admin/coupons',   icon: '🏷️', label: 'Coupons' },
  { to: '/admin/stock-logs',icon: '📈', label: 'Stock Logs' },
]

const settingsNav = [
  { to: '/admin/pincodes',  icon: '📍', label: 'Pincodes' },
  { to: '/admin/complaints',icon: '📸', label: 'Complaints' },
  { to: '/admin/bulk',      icon: '📦', label: 'Bulk Enquiries' },
  { to: '/admin/hours',     icon: '🕐', label: 'Business Hours' },
]
</script>

<style scoped>
.active-nav {
  background: rgba(255,255,255,0.12);
  color: white;
  border-left: 3px solid #F59E0B;
}

main :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

main :deep(table th),
main :deep(table td) {
  white-space: nowrap;
}
</style>
