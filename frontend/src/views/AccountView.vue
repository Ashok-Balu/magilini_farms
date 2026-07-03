<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px] max-w-4xl mx-auto px-6 py-10">
      <div class="grid md:grid-cols-4 gap-6">
        <!-- Sidebar -->
        <aside class="md:col-span-1">
          <div class="card overflow-hidden">
            <div class="bg-green p-5 text-center">
              <div class="w-16 h-16 bg-mango rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 mx-auto mb-2">{{ auth.user?.name?.[0]?.toUpperCase() }}</div>
              <div class="text-white font-semibold">{{ auth.user?.name }}</div>
              <div class="text-white/60 text-xs">📞 {{ auth.user?.phone }}</div>
            </div>
            <nav class="p-2">
              <button v-for="tab in tabs" :key="tab.id" @click="activeTab=tab.id"
                :class="['w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left',
                  activeTab===tab.id ? 'bg-green text-white' : 'text-gray-600 hover:bg-gray-50']">
                <span>{{ tab.icon }}</span>{{ tab.label }}
              </button>
              <button @click="handleLogout" class="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                🚪 Sign Out
              </button>
            </nav>
          </div>
        </aside>

        <!-- Main -->
        <div class="md:col-span-3">
          <!-- Orders -->
          <div v-if="activeTab==='orders'">
            <h2 class="font-serif text-2xl mb-5">My Orders</h2>
            <div v-if="loadingOrders" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
            </div>
            <div v-else-if="!orders.length" class="card card-body text-center py-16">
              <div class="text-5xl mb-3">📦</div>
              <p class="text-gray-500 mb-4">No orders yet</p>
              <router-link to="/shop" class="btn btn-primary btn-sm">Shop Now 🥭</router-link>
            </div>
            <div v-else class="space-y-3">
              <div v-for="order in orders" :key="order._id" @click="router.push(`/account/orders/${order._id}`)"
                class="card card-body cursor-pointer hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-bold text-green text-sm">{{ order.orderNumber }}</span>
                  <span :class="`status-${order.status}`">{{ order.status }}</span>
                </div>
                <div class="text-xs text-gray-500 mb-2">{{ order.items.map(i=>i.name).join(', ') }}</div>
                <div class="flex justify-between items-center">
                  <span class="font-bold text-sm">₹{{ order.total }}</span>
                  <span class="text-xs text-gray-400">{{ fmtDate(order.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Track -->
          <div v-if="activeTab==='track'">
            <h2 class="font-serif text-2xl mb-5">Track Order</h2>
            <div class="card card-body">
              <div class="flex gap-3 mb-4">
                <input v-model="trackId" placeholder="Enter Order ID (e.g. NM-000001)" class="form-input flex-1"/>
                <button @click="trackOrder" class="btn btn-primary shrink-0">Track</button>
              </div>
              <div v-if="trackedOrder" class="mt-4">
                <div class="flex items-center justify-between mb-4">
                  <span class="font-bold text-green">{{ trackedOrder.orderNumber }}</span>
                  <span :class="`status-${trackedOrder.status}`">{{ trackedOrder.status }}</span>
                </div>
                <!-- Timeline -->
                <div class="relative pl-8">
                  <div class="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div v-for="s in allStatuses" :key="s" class="relative mb-6">
                    <div :class="['absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                      isDone(s) ? 'bg-green text-white' : isCurrent(s) ? 'bg-mango text-gray-900' : 'bg-gray-200 text-gray-400']">
                      {{ isDone(s) ? '✓' : statusIcon(s) }}
                    </div>
                    <div class="ml-4">
                      <div :class="['font-semibold text-sm', isCurrent(s) ? 'text-mango' : isDone(s) ? 'text-green' : 'text-gray-400']">{{ s }}</div>
                      <div v-if="isDone(s)||isCurrent(s)" class="text-xs text-gray-500">{{ getStatusTime(s, trackedOrder) }}</div>
                    </div>
                  </div>
                </div>
                <a :href="`https://wa.me/919999999999?text=Hi! Query about order ${trackedOrder.orderNumber}`" target="_blank"
                  class="btn btn-wa w-full mt-4">💬 Ask About This Order</a>
              </div>
            </div>
          </div>

          <!-- Profile -->
          <div v-if="activeTab==='profile'">
            <h2 class="font-serif text-2xl mb-5">My Profile</h2>
            <div class="card card-body space-y-4">
              <div><label class="form-label">Full Name</label><input v-model="profileForm.name" class="form-input"/></div>
              <div><label class="form-label">Phone (cannot change)</label><input :value="auth.user?.phone" class="form-input bg-gray-50" readonly/></div>
              <div><label class="form-label">Email</label><input v-model="profileForm.email" type="email" class="form-input"/></div>
              <div class="border-t border-gray-100 pt-4">
                <h3 class="font-semibold text-sm mb-3">Saved Address</h3>
                <div class="grid sm:grid-cols-2 gap-3">
                  <div><label class="form-label">Address</label><input v-model="profileForm.address.line1" class="form-input" placeholder="Street address"/></div>
                  <div><label class="form-label">City</label><input v-model="profileForm.address.city" class="form-input"/></div>
                  <div><label class="form-label">State</label><input v-model="profileForm.address.state" class="form-input"/></div>
                  <div><label class="form-label">PIN Code</label><input v-model="profileForm.address.pincode" class="form-input" maxlength="6"/></div>
                </div>
              </div>
              <button @click="saveProfile" class="btn btn-primary">Save Changes</button>
              <p v-if="profileMsg" class="text-green text-sm">{{ profileMsg }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useAuthStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const router = useRouter()
const auth   = useAuthStore()

const activeTab    = ref('orders')
const orders       = ref([])
const loadingOrders = ref(true)
const trackId      = ref('')
const trackedOrder = ref(null)
const profileMsg   = ref('')

const profileForm = ref({ name: auth.user?.name||'', email: auth.user?.email||'', address: { ...auth.user?.savedAddress||{} } })

const tabs = [
  { id: 'orders',  icon: '📋', label: 'My Orders' },
  { id: 'track',   icon: '🚚', label: 'Track Order' },
  { id: 'profile', icon: '👤', label: 'Profile' },
]

const allStatuses = ['New','Confirmed','Packed','Shipped','Delivered']
const statusIdx   = (s) => allStatuses.indexOf(s)
const currentIdx  = () => { if (!trackedOrder.value) return -1; return statusIdx(trackedOrder.value.status) }
const isDone      = (s) => statusIdx(s) < currentIdx()
const isCurrent   = (s) => statusIdx(s) === currentIdx()
const statusIcon  = (s) => ({ New:'🆕', Confirmed:'✅', Packed:'📦', Shipped:'🚚', Delivered:'🎉' }[s] || '○')
const getStatusTime = (s, order) => order.statusHistory?.find(h=>h.status===s)?.time ? fmtDate(order.statusHistory.find(h=>h.status===s).time) : ''

const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })

const trackOrder = async () => {
  if (!trackId.value.trim()) return
  try {
    const { data } = await api.get(`/orders/track/${trackId.value.toUpperCase()}`)
    trackedOrder.value = data.order
  } catch { trackedOrder.value = null; alert('Order not found. Check the order number.') }
}

const saveProfile = async () => {
  await auth.completeProfile({ name: profileForm.value.name, email: profileForm.value.email, address: profileForm.value.address })
  profileMsg.value = '✅ Profile updated!'
  setTimeout(() => profileMsg.value = '', 3000)
}

const handleLogout = async () => { await auth.logout(); router.push('/') }

onMounted(async () => {
  const { data } = await api.get('/orders/my')
  orders.value = data.orders
  loadingOrders.value = false
})
</script>
