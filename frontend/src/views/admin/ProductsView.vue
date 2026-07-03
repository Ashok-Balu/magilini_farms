<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-serif text-2xl">Products 🥭</h1>
      <router-link to="/admin/products/new" class="btn btn-primary btn-sm">+ Add Product</router-link>
    </div>

    <div class="card card-body mb-5 grid md:grid-cols-3 gap-3">
      <input v-model="search" @input="debouncedLoad" placeholder="🔍 Search products..." class="form-input flex-1 min-w-48 py-2 text-sm"/>
      <select v-model="categoryFilter" @change="load" class="form-input py-2 text-sm">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c._id" :value="c.slug">{{ c.emoji }} {{ c.name }}</option>
      </select>
      <select v-model="stockFilter" @change="load" class="form-input w-36 py-2 text-sm">
        <option value="">All Stock</option>
        <option value="low">Low Stock</option>
        <option value="out">Out of Stock</option>
      </select>
      <span class="text-xs text-gray-400 self-center">{{ total }} products</span>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="p-5 space-y-2">
        <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded-xl animate-pulse"></div>
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Product</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Category</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Variants & Stock</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Season</th>
            <th class="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="p in products" :key="p._id" class="hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl overflow-hidden bg-warm flex items-center justify-center text-xl shrink-0">
                  <img v-if="p.images?.[0]" :src="p.images[0].url" class="w-full h-full object-cover"/>
                  <span v-else>🥭</span>
                </div>
                <div>
                  <div class="font-semibold">{{ p.name }}</div>
                  <div v-if="p.badge" class="text-[10px] badge-green">{{ p.badge }}</div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-xs text-gray-500">{{ p.category?.name }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-1">
                <span v-for="v in p.variants" :key="v._id"
                  :class="['text-[10px] px-2 py-0.5 rounded-full font-semibold', v.stock===0?'bg-red-100 text-red-600':v.stock<=10?'bg-amber-100 text-amber-700':'bg-green/10 text-green']">
                  {{ v.weight }}: {{ v.stock }}
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <select :value="p.seasonalStatus" @change="updateSeasonal(p._id, $event.target.value)"
                class="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                <option value="available">Available</option>
                <option value="off-season">Off Season</option>
                <option value="coming-soon">Coming Soon</option>
              </select>
            </td>
            <td class="px-4 py-3">
              <button @click="toggleActive(p)" :class="['text-xs font-semibold px-2.5 py-1 rounded-full', p.isActive?'bg-green/10 text-green':'bg-red-100 text-red-600']">
                {{ p.isActive?'Active':'Inactive' }}
              </button>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                <router-link :to="`/admin/products/${p._id}`" class="btn btn-ghost btn-sm text-xs px-2">Edit</router-link>
                <button @click="openStock(p)" class="btn btn-ghost btn-sm text-xs px-2">Stock</button>
                <button @click="removeProduct(p)" class="btn btn-ghost btn-sm text-xs px-2 text-red-500">Delete</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="totalPages>1" class="flex justify-center gap-2 p-4 border-t border-gray-100">
        <button v-for="p in totalPages" :key="p" @click="goPage(p)"
          :class="['w-8 h-8 rounded-lg text-xs font-semibold', p===page?'bg-green text-white':'bg-gray-100 hover:bg-gray-200']">{{ p }}</button>
      </div>
    </div>

    <!-- Stock Modal -->
    <div v-if="stockModal.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 class="font-semibold mb-4">Update Stock — {{ stockModal.product?.name }}</h3>
        <div v-for="v in stockModal.product?.variants" :key="v._id" class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">{{ v.weight }}</span>
          <input :value="stockValues[v._id]" @input="stockValues[v._id]=$event.target.value" type="number" min="0"
            class="form-input w-24 py-1.5 text-sm text-right"/>
        </div>
        <div class="flex gap-3 mt-5">
          <button @click="stockModal.open=false" class="btn btn-ghost flex-1 btn-sm">Cancel</button>
          <button @click="saveStock" class="btn btn-primary flex-1 btn-sm">Save Stock</button>
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
const categories  = ref([])
const toast       = useToastStore()

let t
const debouncedLoad = () => { clearTimeout(t); t = setTimeout(load, 400) }

const load = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/admin/products', { params: { search: search.value, stock: stockFilter.value, category: categoryFilter.value, page: page.value, limit } })
    products.value = data.products; total.value = data.total; totalPages.value = Math.ceil((data.total || 0) / limit) || 1
  } finally { loading.value = false }
}

const goPage = (p) => { page.value = p; load() }

const toggleActive = async (p) => {
  const next = !p.isActive
  p.isActive = next
  try {
    await api.put(`/admin/products/${p._id}`, { isActive: next })
    toast.success(`Product ${next ? 'activated' : 'hidden'} successfully.`)
  } catch (err) {
    p.isActive = !next
    toast.error(err.response?.data?.message || 'Failed to update product status.')
  }
}

const updateSeasonal = async (id, status) => {
  try {
    await api.patch(`/admin/products/${id}/seasonal`, { seasonalStatus: status })
    toast.success('Season status updated.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update season status.')
    await load()
  }
}

const openStock = (p) => {
  stockModal.product = p
  stockModal.open    = true
  p.variants.forEach(v => stockValues[v._id] = v.stock)
}

const saveStock = async () => {
  const p = stockModal.product
  try {
    for (const v of p.variants) {
      await api.patch(`/admin/products/${p._id}/stock`, { variantId: v._id, stock: Number(stockValues[v._id]) })
      v.stock = Number(stockValues[v._id])
    }
    toast.success('Stock updated successfully.')
    stockModal.open = false
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update stock.')
  }
}

const removeProduct = async (p) => {
  if (!confirm(`Delete ${p.name}? This will also remove Cloudinary images.`)) return
  try {
    await api.delete(`/admin/products/${p._id}`)
    toast.success('Product deleted successfully.')
    await load()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to delete product.')
  }
}

onMounted(async () => {
  const [catRes] = await Promise.all([api.get('/admin/categories')])
  categories.value = catRes.data.categories || []
  await load()
})
</script>
