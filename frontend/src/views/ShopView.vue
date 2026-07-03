<template>
  <div>
    <AppNavbar/>
    <div class="page-hero mt-[68px]">
      <h1>Shop All Products 🥭</h1>
      <p>Farm fresh mangoes and seasonal fruits delivered to your door</p>
    </div>

    <div class="max-w-6xl mx-auto px-4 pb-16 flex gap-6 mt-4">
      <!-- Filter Sidebar -->
      <aside class="hidden md:block w-56 shrink-0">
        <div class="card card-body sticky top-24">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-sm">Filters</h3>
            <button @click="clearFilters" class="text-xs text-green font-medium">Clear all</button>
          </div>
          <div class="mb-5">
            <h4 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Category</h4>
            <label v-for="cat in categories" :key="cat._id" class="flex items-center gap-2 cursor-pointer mb-2">
              <input type="checkbox" :value="cat.slug" v-model="selCats" class="accent-green w-4 h-4" @change="load"/>
              <span class="text-sm">{{ cat.emoji }} {{ cat.name }}</span>
            </label>
          </div>
          <div class="mb-5">
            <h4 class="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Price Range</h4>
            <label v-for="p in priceRanges" :key="p.label" class="flex items-center gap-2 cursor-pointer mb-2">
              <input type="radio" :value="p.value" v-model="selPrice" class="accent-green w-4 h-4" @change="load"/>
              <span class="text-sm">{{ p.label }}</span>
            </label>
          </div>
        </div>
      </aside>

      <!-- Products -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-5 flex-wrap">
          <div class="flex-1 min-w-48 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-green">
            <span class="text-gray-400 text-sm">🔍</span>
            <input v-model="search" @input="debouncedLoad" placeholder="Search products..." class="flex-1 outline-none text-sm"/>
          </div>
          <select v-model="sort" @change="load" class="form-input w-44 py-2.5 text-sm">
            <option value="">Default</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="newest">Newest First</option>
          </select>
          <span class="text-xs text-gray-500">{{ total }} products</span>
        </div>

        <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="i in 6" :key="i" class="bg-gray-100 rounded-2xl h-72 animate-pulse"></div>
        </div>
        <div v-else-if="!products.length" class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-3">🔍</div>
          <p class="font-semibold text-gray-600 mb-4">No products found</p>
          <button @click="clearFilters" class="btn btn-primary btn-sm">Clear Filters</button>
        </div>
        <div v-else class="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <ProductCard v-for="p in products" :key="p._id" :product="p"/>
        </div>

        <div v-if="totalPages > 1" class="flex justify-center gap-2 mt-8">
          <button v-for="p in totalPages" :key="p" @click="goPage(p)"
            :class="['w-9 h-9 rounded-full text-sm font-semibold', p===page?'bg-green text-white':'bg-white border border-gray-200 hover:border-green']">{{ p }}</button>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/shop/ProductCard.vue'
import { useProductStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const route = useRoute()
const router = useRouter()
const productStore = useProductStore()

const products = ref([])
const categories = ref([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const search = ref('')
const sort = ref('')
const selCats = ref([])
const selPrice = ref('')
const limit = 12
const totalPages = computed(() => Math.ceil(total.value / limit))

const priceRanges = [
  { label: 'All prices',    value: '' },
  { label: 'Under ₹300',   value: '0-300' },
  { label: '₹300–₹800',    value: '300-800' },
  { label: '₹800–₹2000',   value: '800-2000' },
  { label: '₹2000+',       value: '2000-99999' },
]

let t
const debouncedLoad = () => { clearTimeout(t); t = setTimeout(() => load(), 400) }

const syncFromQuery = () => {
  selCats.value = route.query.category ? [String(route.query.category)] : []
  search.value = route.query.search ? String(route.query.search) : ''
  sort.value = route.query.sort ? String(route.query.sort) : ''
  selPrice.value = route.query.price ? String(route.query.price) : ''
  page.value = route.query.page ? Math.max(1, Number(route.query.page)) : 1
}

const syncToQuery = () => {
  const q = {}
  if (selCats.value.length) q.category = selCats.value[0]
  if (search.value.trim()) q.search = search.value.trim()
  if (sort.value) q.sort = sort.value
  if (selPrice.value) q.price = selPrice.value
  if (page.value > 1) q.page = String(page.value)
  router.replace({ query: q })
}

const load = async (resetPage = true) => {
  if (resetPage) page.value = 1
  syncToQuery()
  loading.value = true
  try {
    const params = { limit, page: page.value }
    if (search.value)   params.search   = search.value
    if (sort.value)     params.sort     = sort.value
    if (selCats.value.length) params.category = selCats.value[0]
    if (selPrice.value) {
      const [minPrice, maxPrice] = selPrice.value.split('-')
      params.minPrice = Number(minPrice)
      params.maxPrice = Number(maxPrice)
    }
    const { data } = await api.get('/products', { params })
    products.value = data.products
    total.value    = data.total
  } finally { loading.value = false }
}

const clearFilters = () => { search.value = ''; selCats.value = []; sort.value = ''; selPrice.value = ''; load() }
const goPage = (p) => { page.value = p; load(false); window.scrollTo({ top: 0 }) }

onMounted(async () => {
  categories.value = await productStore.fetchCategories()
  syncFromQuery()
  await load(false)
})

watch(() => route.query, () => {
  syncFromQuery()
  load(false)
})
</script>
