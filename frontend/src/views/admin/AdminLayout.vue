<template>
  <div class="flex min-h-screen bg-gray-50">
    <!-- Sidebar -->
    <aside class="w-56 bg-green flex flex-col shrink-0 sticky top-0 h-screen">
      <div class="p-5 border-b border-white/10">
        <div class="font-serif text-lg font-bold text-white">Magilini🥭 Admin</div>
        <div class="text-white/50 text-xs mt-0.5">{{ auth.user?.name }}</div>
      </div>
      <nav class="flex-1 p-3 overflow-y-auto">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors mb-0.5"
          active-class="bg-white/15 text-white border-l-2 border-mango">
          <span class="text-base">{{ item.icon }}</span>{{ item.label }}
        </router-link>
      </nav>
      <div class="p-3 border-t border-white/10">
        <a href="/" target="_blank" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 mb-1">🌐 View Store</a>
        <button @click="handleLogout" class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/20 w-full">🚪 Sign Out</button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 min-w-0 p-6 overflow-x-hidden">
      <router-view/>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/index.js'

const router = useRouter()
const auth   = useAuthStore()

const handleLogout = async () => { await auth.logout(); router.push('/admin/login') }

const navItems = [
  { to: '/admin',           icon: '📊', label: 'Dashboard' },
  { to: '/admin/orders',    icon: '📋', label: 'Orders' },
  { to: '/admin/products',  icon: '🥭', label: 'Products' },
  { to: '/admin/categories',icon: '📂', label: 'Categories' },
  { to: '/admin/customers', icon: '👥', label: 'Customers' },
  { to: '/admin/coupons',   icon: '🏷️', label: 'Coupons' },
  { to: '/admin/pincodes',  icon: '📍', label: 'Pincodes' },
  { to: '/admin/complaints',icon: '📸', label: 'Complaints' },
  { to: '/admin/bulk',      icon: '📦', label: 'Bulk Enquiries' },
  { to: '/admin/hours',     icon: '🕐', label: 'Business Hours' },
  { to: '/admin/stock-logs',icon: '📈', label: 'Stock Logs' },
]
</script>
