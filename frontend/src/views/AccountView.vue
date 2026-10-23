<template>
  <div>
    <AppNavbar/>
    <div class="mt-[60px] sm:mt-[68px] max-w-4xl mx-auto px-6 py-10">
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
                <input v-model="trackId" placeholder="Enter Order ID (e.g. NM-000001)" class="form-input flex-1" @keyup.enter="trackOrder"/>
                <button @click="trackOrder" :disabled="trackingOrder" class="btn btn-primary shrink-0">
                  <span v-if="trackingOrder" class="spinner"></span>{{ trackingOrder ? 'Tracking…' : 'Track' }}
                </button>
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
                <a :href="`https://wa.me/919943996614?text=Hi! Query about order ${trackedOrder.orderNumber}`" target="_blank"
                  class="btn btn-wa w-full mt-4">💬 Ask About This Order</a>
              </div>
            </div>
          </div>

          <!-- Profile -->
          <div v-if="activeTab==='profile'">
            <h2 class="font-serif text-2xl mb-5">My Profile</h2>
            <div class="card card-body space-y-4">
              <div>
                <label class="form-label">Full Name</label>
                <input v-model="profileForm.name" :class="['form-input', profileErrors.name && 'is-invalid']"/>
                <p v-if="profileErrors.name" class="form-error">{{ profileErrors.name }}</p>
              </div>
              <div>
                <label class="form-label">Email</label>
                <input v-model="profileForm.email" type="email" :class="['form-input', profileErrors.email && 'is-invalid']"/>
                <p v-if="profileErrors.email" class="form-error">{{ profileErrors.email }}</p>
              </div>
              <div>
                <label class="form-label">Phone (optional)</label>
                <input v-model="profileForm.phone" :class="['form-input', profileErrors.phone && 'is-invalid']" maxlength="10"/>
                <p v-if="profileErrors.phone" class="form-error">{{ profileErrors.phone }}</p>
              </div>
              <button @click="saveProfile" :disabled="savingProfile" class="btn btn-primary">
                <span v-if="savingProfile" class="spinner"></span>{{ savingProfile ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
          </div>

          <!-- Addresses -->
          <div v-if="activeTab==='addresses'">
            <div class="flex items-center justify-between mb-5">
              <h2 class="font-serif text-2xl">Address Book</h2>
              <button @click="openAddressForm()" class="btn btn-primary btn-sm">+ Add Address</button>
            </div>

            <div v-if="!addresses.length && !showAddressForm" class="card card-body text-center py-16">
              <div class="text-5xl mb-3">📍</div>
              <p class="text-gray-500 mb-4">No saved addresses yet</p>
              <button @click="openAddressForm()" class="btn btn-primary btn-sm">Add Your First Address</button>
            </div>

            <div v-else class="space-y-3 mb-4">
              <div v-for="addr in addresses" :key="addr._id" class="card card-body">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-semibold text-sm">{{ addr.fullName }}</span>
                      <span class="text-[10px] uppercase font-bold text-green bg-green/10 px-2 py-0.5 rounded">{{ addr.type }}</span>
                      <span v-if="addr.isDefault" class="text-[10px] uppercase font-bold text-mango bg-mango/10 px-2 py-0.5 rounded">Default</span>
                    </div>
                    <p class="text-xs text-gray-500">{{ addr.line1 }}<span v-if="addr.line2">, {{ addr.line2 }}</span></p>
                    <p class="text-xs text-gray-500">{{ addr.city }}, {{ addr.state }} — {{ addr.pincode }}</p>
                    <p class="text-xs text-gray-400">📞 {{ addr.phone }}</p>
                  </div>
                  <div class="flex flex-col gap-1.5 shrink-0 text-xs">
                    <button @click="openAddressForm(addr)" class="text-green font-medium hover:underline">Edit</button>
                    <button v-if="!addr.isDefault" @click="setDefault(addr._id)" class="text-gray-500 font-medium hover:underline">Set Default</button>
                    <button @click="removeAddress(addr._id)" class="text-red-500 font-medium hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="showAddressForm" class="card card-body space-y-3">
              <h3 class="font-semibold text-sm mb-1">{{ editingAddressId ? 'Edit Address' : 'Add New Address' }}</h3>
              <div class="grid sm:grid-cols-2 gap-3">
                <div>
                  <label class="form-label">Full Name *</label>
                  <input v-model="addressForm.fullName" :class="['form-input', addressErrors.fullName && 'is-invalid']"/>
                  <p v-if="addressErrors.fullName" class="form-error">{{ addressErrors.fullName }}</p>
                </div>
                <div>
                  <label class="form-label">Phone *</label>
                  <input v-model="addressForm.phone" :class="['form-input', addressErrors.phone && 'is-invalid']" maxlength="10"/>
                  <p v-if="addressErrors.phone" class="form-error">{{ addressErrors.phone }}</p>
                </div>
              </div>
              <div>
                <label class="form-label">Address Line 1 *</label>
                <input v-model="addressForm.line1" :class="['form-input', addressErrors.line1 && 'is-invalid']" placeholder="Door no, Street, Area"/>
                <p v-if="addressErrors.line1" class="form-error">{{ addressErrors.line1 }}</p>
              </div>
              <div><label class="form-label">Address Line 2</label><input v-model="addressForm.line2" class="form-input"/></div>
              <div class="grid sm:grid-cols-3 gap-3">
                <div>
                  <label class="form-label">City *</label>
                  <input v-model="addressForm.city" :class="['form-input', addressErrors.city && 'is-invalid']"/>
                  <p v-if="addressErrors.city" class="form-error">{{ addressErrors.city }}</p>
                </div>
                <div>
                  <label class="form-label">State *</label>
                  <input v-model="addressForm.state" :class="['form-input', addressErrors.state && 'is-invalid']"/>
                  <p v-if="addressErrors.state" class="form-error">{{ addressErrors.state }}</p>
                </div>
                <div>
                  <label class="form-label">PIN Code *</label>
                  <input v-model="addressForm.pincode" :class="['form-input', addressErrors.pincode && 'is-invalid']" maxlength="6"/>
                  <p v-if="addressErrors.pincode" class="form-error">{{ addressErrors.pincode }}</p>
                </div>
              </div>
              <div class="grid sm:grid-cols-2 gap-3">
                <div><label class="form-label">Landmark</label><input v-model="addressForm.landmark" class="form-input"/></div>
                <div>
                  <label class="form-label">Type</label>
                  <select v-model="addressForm.type" class="form-input">
                    <option value="home">Home</option>
                    <option value="office">Office</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <label class="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" v-model="addressForm.isDefault" class="accent-green"/> Set as default address
              </label>
              <div class="flex gap-2">
                <button @click="saveAddress" :disabled="savingAddress" class="btn btn-primary">
                  <span v-if="savingAddress" class="spinner"></span>{{ editingAddressId ? 'Update Address' : 'Save Address' }}
                </button>
                <button @click="closeAddressForm" class="btn-outline">Cancel</button>
              </div>
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
import { useAuthStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'
import { isRequired, isEmail, isPhone10, isPincode6, runValidation } from '@/lib/validators.js'

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToastStore()

const activeTab     = ref('orders')
const orders        = ref([])
const loadingOrders = ref(true)
const trackId       = ref('')
const trackedOrder  = ref(null)
const trackingOrder = ref(false)

const profileForm   = ref({ name: auth.user?.name||'', email: auth.user?.email||'', phone: auth.user?.phone||'' })
const profileErrors = ref({})
const savingProfile = ref(false)

const addresses          = ref([])
const showAddressForm    = ref(false)
const editingAddressId   = ref(null)
const addressErrors      = ref({})
const savingAddress      = ref(false)
const emptyAddressForm   = () => ({ fullName: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '', landmark: '', type: 'home', isDefault: false })
const addressForm        = ref(emptyAddressForm())

const tabs = [
  { id: 'orders',    icon: '📋', label: 'My Orders' },
  { id: 'track',     icon: '🚚', label: 'Track Order' },
  { id: 'profile',   icon: '👤', label: 'Profile' },
  { id: 'addresses', icon: '📍', label: 'Addresses' },
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
  if (!trackId.value.trim()) { toast.error('Please enter an order number.'); return }
  trackingOrder.value = true
  try {
    const { data } = await api.get(`/orders/track/${trackId.value.toUpperCase()}`)
    trackedOrder.value = data.order
  } catch {
    trackedOrder.value = null
    toast.error('Order not found. Check the order number.')
  } finally {
    trackingOrder.value = false
  }
}

const saveProfile = async () => {
  profileErrors.value = runValidation(profileForm.value, {
    name: [[isRequired, 'Name is required.']],
    email: [[isRequired, 'Email is required.'], [isEmail, 'Enter a valid email address.']],
    phone: [[(v) => !v || isPhone10(v), 'Enter a valid 10-digit phone number.']]
  })
  if (Object.keys(profileErrors.value).length) return

  savingProfile.value = true
  try {
    const { data } = await api.patch('/customer/profile', {
      name: profileForm.value.name,
      email: profileForm.value.email,
      phone: profileForm.value.phone || undefined
    })
    auth.user = data.user
    toast.success('Profile updated!')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update profile.')
  } finally {
    savingProfile.value = false
  }
}

const loadAddresses = async () => {
  const { data } = await api.get('/customer/addresses')
  addresses.value = data.addresses
}

const openAddressForm = (addr) => {
  addressErrors.value = {}
  if (addr) {
    editingAddressId.value = addr._id
    addressForm.value = { ...addr }
  } else {
    editingAddressId.value = null
    addressForm.value = emptyAddressForm()
  }
  showAddressForm.value = true
}

const closeAddressForm = () => {
  showAddressForm.value = false
  editingAddressId.value = null
  addressForm.value = emptyAddressForm()
  addressErrors.value = {}
}

const saveAddress = async () => {
  addressErrors.value = runValidation(addressForm.value, {
    fullName: [[isRequired, 'Full name is required.']],
    phone: [[isPhone10, 'Enter a valid 10-digit phone number.']],
    line1: [[isRequired, 'Address line 1 is required.']],
    city: [[isRequired, 'City is required.']],
    state: [[isRequired, 'State is required.']],
    pincode: [[isPincode6, 'Pincode must be 6 digits.']]
  })
  if (Object.keys(addressErrors.value).length) return

  savingAddress.value = true
  try {
    if (editingAddressId.value) {
      const { data } = await api.put(`/customer/addresses/${editingAddressId.value}`, addressForm.value)
      addresses.value = data.addresses
      toast.success('Address updated!')
    } else {
      const { data } = await api.post('/customer/addresses', addressForm.value)
      addresses.value = data.addresses
      toast.success('Address added!')
    }
    closeAddressForm()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to save address.')
  } finally {
    savingAddress.value = false
  }
}

const removeAddress = async (id) => {
  if (!confirm('Delete this address?')) return
  try {
    const { data } = await api.delete(`/customer/addresses/${id}`)
    addresses.value = data.addresses
    toast.success('Address deleted.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete address.')
  }
}

const setDefault = async (id) => {
  try {
    const { data } = await api.post(`/customer/addresses/${id}/default`)
    addresses.value = data.addresses
    toast.success('Default address updated.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update default address.')
  }
}

const handleLogout = async () => { await auth.logout(); router.push('/') }

onMounted(async () => {
  try {
    const { data } = await api.get('/orders/my')
    orders.value = data.orders
  } catch {
    toast.error('Failed to load your orders.')
  } finally {
    loadingOrders.value = false
  }
  loadAddresses()
})
</script>

