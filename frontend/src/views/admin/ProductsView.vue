<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-3xl text-gray-900">Products</h1>
        <p class="text-sm text-gray-400 mt-1">{{ total }} products in your catalog</p>
      </div>
      <router-link to="/admin/products/new" class="btn btn-primary">+ Add Product</router-link>
    </div>

    <!-- Filters -->
    <div class="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 mb-6">
      <div class="grid md:grid-cols-4 gap-3">
        <div class="md:col-span-2">
          <input v-model="search" @input="debouncedLoad" placeholder="Search products by name, tag..." class="form-input py-2.5 text-sm w-full"/>
        </div>
        <select v-model="categoryFilter" @change="load" class="form-input py-2.5 text-sm">
          <option value="">All Categories</option>
          <option v-for="c in categories" :key="c._id" :value="c.slug">{{ c.emoji }} {{ c.name }}</option>
        </select>
        <select v-model="stockFilter" @change="load" class="form-input py-2.5 text-sm">
          <option value="">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>
    </div>

    <!-- Product Grid -->
    <div v-if="loading" class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 6" :key="i" class="h-40 bg-white rounded-2xl animate-pulse border border-gray-100"></div>
    </div>

    <div v-else-if="!products.length" class="text-center py-20">
      <div class="text-5xl mb-3">📦</div>
      <p class="text-gray-500 font-medium">No products found</p>
      <router-link to="/admin/products/new" class="btn btn-primary btn-sm mt-4">Add your first product</router-link>
    </div>

    <div v-else class="space-y-3">
      <div v-for="p in products" :key="p._id"
        class="rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex items-center gap-4">
        <!-- Image -->
        <div class="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-warm to-amber-100 flex items-center justify-center text-2xl shrink-0">
          <img v-if="p.images?.[0]" :src="p.images[0].url" class="w-full h-full object-cover"/>
          <span v-else>🥭</span>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="font-semibold text-gray-900 truncate">{{ p.name }}</h3>
            <span v-if="p.badge" class="text-[10px] font-bold bg-green/10 text-green px-2 py-0.5 rounded-full shrink-0">{{ p.badge }}</span>
          </div>
          <div class="text-xs text-gray-400 mb-2">{{ p.category?.name }}</div>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="v in p.variants" :key="v._id"
              :class="['text-[10px] px-2 py-0.5 rounded-full font-semibold', v.stock===0?'bg-red-100 text-red-600':v.stock<=10?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600']">
              {{ v.weight }}: {{ v.stock }}
            </span>
          </div>
        </div>

        <!-- Season + Notify -->
        <div class="hidden sm:flex items-center gap-2">
          <select :value="p.seasonalStatus" @change="updateSeasonal(p._id, $event.target.value)"
            :class="['text-xs border rounded-lg px-2.5 py-1.5 outline-none font-medium', seasonClass(p.seasonalStatus)]">
            <option value="available">Available</option>
            <option value="off-season">Off Season</option>
            <option value="coming-soon">Coming Soon</option>
          </select>
          <button v-if="p.notifyCount > 0" @click="sendNotify(p)" class="relative group w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-sm transition-colors">
            🔔
            <span class="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">{{ p.notifyCount }}</span>
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{{ p.notifyCount }} people waiting — click to notify all</span>
          </button>
        </div>

        <!-- Status -->
        <button @click="toggleActive(p)"
          :class="['text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0', p.isActive?'bg-green/10 text-green hover:bg-green/20':'bg-red-50 text-red-500 hover:bg-red-100']">
          {{ p.isActive ? 'Active' : 'Hidden' }}
        </button>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <router-link :to="`/admin/products/${p._id}`" class="relative group w-8 h-8 rounded-lg bg-gray-50 hover:bg-green/10 flex items-center justify-center text-sm transition-colors">✏️
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Edit Product</span>
          </router-link>
          <button @click="openStock(p)" class="relative group w-8 h-8 rounded-lg bg-gray-50 hover:bg-amber-50 flex items-center justify-center text-sm transition-colors">📦
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Update Stock</span>
          </button>
          <button @click="removeProduct(p)" class="relative group w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center text-sm transition-colors">🗑️
            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[10px] font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Delete Product</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Notify Banner -->
    <div v-if="totalWaiting > 0" class="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="text-lg">🔔</span>
        <div>
          <p class="text-sm font-medium text-amber-800">{{ totalWaiting }} people waiting for product notifications</p>
          <p class="text-[10px] text-amber-600">They signed up to be notified when products are back in stock</p>
        </div>
      </div>
      <button @click="openSubscribers" class="text-xs font-semibold text-amber-700 hover:text-amber-900 border border-amber-300 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-colors">View All</button>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages>1" class="flex justify-center gap-2 mt-8">
      <button v-for="p in totalPages" :key="p" @click="goPage(p)"
        :class="['w-9 h-9 rounded-xl text-sm font-semibold transition-colors', p===page?'bg-green text-white shadow-sm':'bg-white border border-gray-200 hover:border-green text-gray-600']">{{ p }}</button>
    </div>

    <!-- Subscribers Modal -->
    <div v-if="subscribersModal.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="subscribersModal.open=false">
      <div class="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
        <div class="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h3 class="font-semibold text-gray-900">Waiting Subscribers</h3>
            <p class="text-xs text-gray-400 mt-0.5">People who want to be notified</p>
          </div>
          <button @click="subscribersModal.open=false" class="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div class="overflow-y-auto flex-1 p-6">
          <div v-if="!subscribersModal.list.length" class="text-center py-8 text-sm text-gray-400">No subscribers waiting</div>
          <div v-else class="space-y-3">
            <div v-for="s in subscribersModal.list" :key="s._id" class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <div>
                <p class="text-sm font-medium text-gray-800">{{ s.phone }}</p>
                <p class="text-[10px] text-gray-400">{{ s.productId?.name || 'Unknown product' }} · {{ new Date(s.createdAt).toLocaleDateString('en-IN') }}</p>
              </div>
              <span class="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Waiting</span>
            </div>
          </div>
        </div>
        <div v-if="subscribersModal.list.length" class="border-t border-gray-100 px-6 py-4 shrink-0">
          <button @click="notifyAllSubscribers" :disabled="subscribersModal.sending" class="btn btn-primary w-full">
            {{ subscribersModal.sending ? 'Sending...' : `Notify All (${subscribersModal.list.length} people)` }}
          </button>
          <p class="text-[10px] text-gray-400 text-center mt-2">⚠️ In development mode, notifications print to server console only</p>
        </div>
      </div>
    </div>

    <!-- Stock Modal -->
    <div v-if="stockModal.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="stockModal.open=false">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div class="bg-gray-50 border-b border-gray-100 px-6 py-4">
          <h3 class="font-semibold text-gray-900">Update Stock</h3>
          <p class="text-xs text-gray-400">{{ stockModal.product?.name }}</p>
        </div>
        <div class="p-6 space-y-3">
          <div v-for="v in stockModal.product?.variants" :key="v._id" class="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <span class="text-sm font-medium text-gray-700">{{ v.weight }}</span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400">Current: {{ v.stock }}</span>
              <input :value="stockValues[v._id]" @input="stockValues[v._id]=$event.target.value" type="number" min="0"
                class="form-input w-20 py-1.5 text-sm text-center"/>
            </div>
          </div>
        </div>
        <div class="flex gap-3 px-6 pb-6">
          <button @click="stockModal.open=false" class="btn btn-ghost flex-1">Cancel</button>
          <button @click="saveStock" :disabled="savingStock" class="btn btn-primary flex-1">
            <span v-if="savingStock" class="spinner"></span>{{ savingStock ? 'Saving…' : 'Save Stock' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const products    = ref([])
const loading     = ref(true)
const total       = ref(0)
const page        = ref(1)
const limit       = 20
const totalPages  = ref(1)
const search      = ref('')
const categoryFilter = ref('')
const stockFilter = ref('')
const stockModal  = reactive({ open: false, product: null })
const stockValues = reactive({})
const savingStock = ref(false)
const categories  = ref([])
const toast       = useToastStore()
const totalWaiting = ref(0)
const subscribersModal = reactive({ open: false, list: [], sending: false })

const seasonClass = (s) => {
  if (s === 'available') return 'border-green/30 text-green bg-green/5'
  if (s === 'off-season') return 'border-red-200 text-red-600 bg-red-50'
  return 'border-amber-200 text-amber-700 bg-amber-50'
}

let t
const debouncedLoad = () => { clearTimeout(t); t = setTimeout(load, 400) }

const load = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/products', { params: { search: search.value, stock: stockFilter.value, category: categoryFilter.value, page: page.value, limit } })
    products.value = data.products; total.value = data.total; totalPages.value = Math.ceil((data.total || 0) / limit) || 1
    // Fetch notify subscriber counts
    try {
      const { data: nd } = await api.get('/admin/notify-subscribers')
      const countMap = {}
      nd.subscribers.forEach(s => {
        const pid = String(s.productId?._id || s.productId || '')
        if (pid) countMap[pid] = (countMap[pid] || 0) + 1
      })
      products.value.forEach(p => { p.notifyCount = countMap[String(p._id)] || 0 })
      totalWaiting.value = nd.subscribers.length
    } catch {}
  } finally { loading.value = false }
}

const goPage = (p) => { page.value = p; load() }

const toggleActive = async (p) => {
  const next = !p.isActive
  p.isActive = next
  try {
    await api.put(`/admin/products/${p._id}`, { isActive: next })
    toast.success(`Product ${next ? 'activated' : 'hidden'}.`)
  } catch (err) {
    p.isActive = !next
    toast.error(err.response?.data?.message || 'Failed to update.')
  }
}

const updateSeasonal = async (id, status) => {
  try {
    await api.patch(`/admin/products/${id}/seasonal`, { seasonalStatus: status })
    toast.success('Season updated.')
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update.')
    await load()
  }
}

const sendNotify = async (p) => {
  if (!confirm(`Send notification to ${p.notifyCount} people waiting for "${p.name}"?\n\n⚠️ In development mode, notifications will only appear in the backend terminal/console.`)) return
  try {
    const { data } = await api.post('/admin/notify-send', { productId: p._id })
    toast.success(data.message)
    p.notifyCount = 0
    totalWaiting.value = Math.max(0, totalWaiting.value - (data.sent || 0))
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to send notifications.')
  }
}

const openSubscribers = async () => {
  try {
    const { data } = await api.get('/admin/notify-subscribers')
    subscribersModal.list = data.subscribers || []
    subscribersModal.open = true
  } catch (err) {
    toast.error('Failed to load subscribers.')
  }
}

const notifyAllSubscribers = async () => {
  subscribersModal.sending = true
  try {
    const productIds = [...new Set(subscribersModal.list.map(s => typeof s.productId === 'object' ? s.productId._id : s.productId))]
    let totalSent = 0
    for (const pid of productIds) {
      const { data } = await api.post('/admin/notify-send', { productId: pid })
      totalSent += data.sent || 0
    }
    toast.success(`Notified ${totalSent} subscribers across ${productIds.length} products.\n\nCheck your backend terminal for delivery logs.`)
    subscribersModal.open = false
    totalWaiting.value = 0
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to send.')
  } finally {
    subscribersModal.sending = false
  }
}

const openStock = (p) => {
  stockModal.product = p
  stockModal.open = true
  p.variants.forEach(v => stockValues[v._id] = v.stock)
}

const saveStock = async () => {
  const p = stockModal.product
  savingStock.value = true
  try {
    for (const v of p.variants) {
      await api.patch(`/admin/products/${p._id}/stock`, { variantId: v._id, stock: Number(stockValues[v._id]) })
      v.stock = Number(stockValues[v._id])
    }
    toast.success('Stock updated.')
    stockModal.open = false
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update stock.')
  } finally {
    savingStock.value = false
  }
}

const removeProduct = async (p) => {
  if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
  try {
    await api.delete(`/admin/products/${p._id}`)
    toast.success('Product deleted.')
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete.')
  }
}

onMounted(async () => {
  const [catRes] = await Promise.all([api.get('/admin/categories')])
  categories.value = catRes.data.categories || []
  await load()
})
</script>
