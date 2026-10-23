<template>
  <div>
    <AppNavbar/>

    <!-- Hero -->
    <div class="mt-[60px] sm:mt-[68px] bg-gradient-to-br from-green via-green to-green-mid py-7 sm:py-10 px-4 sm:px-6 text-center relative overflow-hidden">
      <div class="absolute inset-0 opacity-[0.03]" style="background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2230%22 height=%2230%22%3E%3Ccircle cx=%2215%22 cy=%2215%22 r=%2210%22 fill=%22none%22 stroke=%22white%22/%3E%3C/svg%3E')"></div>
      <div class="relative max-w-2xl mx-auto">
        <h1 class="font-serif text-2xl sm:text-3xl text-white mb-3 sm:mb-4">Shop Fresh Products</h1>
        <!-- Search in hero -->
        <div class="flex items-center bg-white rounded-full px-4 sm:px-5 py-2.5 sm:py-3 shadow-xl max-w-lg mx-auto">
          <span class="text-gray-300 mr-2">🔍</span>
          <input v-model="search" @input="debouncedLoad" placeholder="Search mangoes, fruits..."
            class="flex-1 outline-none text-sm bg-transparent min-w-0 text-gray-700 placeholder-gray-400"/>
          <button v-if="search" @click="search=''; load()" class="text-gray-400 hover:text-gray-600 ml-2">✕</button>
        </div>
      </div>
    </div>

    <!-- Filter Bar (sticky) -->
    <div class="sticky top-[60px] sm:top-[68px] z-20 bg-white border-b border-gray-100 shadow-sm">
      <div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
        <div class="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3">
          <!-- Scrollable category pills -->
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0">
            <button @click="selectCategory('')"
              :class="['shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all', !selCats.length ? 'bg-green text-white border-green shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-green hover:text-green']">
              All
            </button>
            <button v-for="cat in categories" :key="cat._id" @click="selectCategory(cat.slug)"
              :class="['shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all', selCats.includes(cat.slug) ? 'bg-green text-white border-green shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-green hover:text-green']">
              {{ cat.emoji }} {{ cat.name }}
            </button>
          </div>

          <!-- Divider -->
          <div class="w-px h-6 bg-gray-200 shrink-0 hidden sm:block"></div>

          <!-- Price Dropdown -->
          <div class="relative shrink-0" ref="priceDropRef">
            <button @click.stop="priceDropOpen = !priceDropOpen; sortDropOpen = false"
              :class="['px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all flex items-center gap-1', (minPrice || maxPrice) ? 'bg-mango/10 text-mango-dark border-mango/30' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300']">
              {{ (minPrice || maxPrice) ? `₹${minPrice || 0} – ₹${maxPrice || '∞'}` : 'Price' }}
              <span class="text-[10px]">▾</span>
            </button>
            <div v-if="priceDropOpen" @click.stop class="absolute top-full mt-2 left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50 w-[220px] sm:w-[250px]">
              <div class="text-xs font-semibold text-gray-700 mb-3">Price Range (₹{{ productMinPrice }} – ₹{{ productMaxPrice }})</div>
              <div class="flex items-center gap-2 mb-3">
                <div class="flex-1">
                  <label class="text-[10px] text-gray-400 mb-1 block">Min</label>
                  <input v-model.number="minPrice" type="number" :min="productMinPrice" :max="maxPrice || productMaxPrice" :placeholder="String(productMinPrice)"
                    class="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green"/>
                </div>
                <span class="text-gray-300 mt-4">–</span>
                <div class="flex-1">
                  <label class="text-[10px] text-gray-400 mb-1 block">Max</label>
                  <input v-model.number="maxPrice" type="number" :min="minPrice || productMinPrice" :max="productMaxPrice" :placeholder="String(productMaxPrice)"
                    class="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green"/>
                </div>
              </div>
              <!-- Quick select buttons -->
              <div class="flex flex-wrap gap-1.5 mb-3">
                <button @click="minPrice=0; maxPrice=300" :class="['text-[10px] px-2 py-1 rounded-full border', minPrice==0&&maxPrice==300 ? 'border-green text-green bg-green/5' : 'border-gray-200 text-gray-500 hover:border-gray-300']">Under ₹300</button>
                <button @click="minPrice=300; maxPrice=800" :class="['text-[10px] px-2 py-1 rounded-full border', minPrice==300&&maxPrice==800 ? 'border-green text-green bg-green/5' : 'border-gray-200 text-gray-500 hover:border-gray-300']">₹300–₹800</button>
                <button @click="minPrice=800; maxPrice=2000" :class="['text-[10px] px-2 py-1 rounded-full border', minPrice==800&&maxPrice==2000 ? 'border-green text-green bg-green/5' : 'border-gray-200 text-gray-500 hover:border-gray-300']">₹800–₹2000</button>
                <button @click="minPrice=2000; maxPrice=null" :class="['text-[10px] px-2 py-1 rounded-full border', minPrice==2000&&!maxPrice ? 'border-green text-green bg-green/5' : 'border-gray-200 text-gray-500 hover:border-gray-300']">₹2000+</button>
              </div>
              <div class="flex gap-2">
                <button @click="minPrice=null; maxPrice=null; priceDropOpen=false; load()" class="flex-1 text-xs text-gray-500 hover:text-red-500 py-1.5 font-medium">Clear</button>
                <button @click="priceDropOpen=false; load()" class="flex-1 bg-green text-white text-xs py-1.5 rounded-lg font-medium hover:bg-green-mid transition-colors">Apply</button>
              </div>
            </div>
          </div>

          <!-- Sort Dropdown -->
          <div class="relative shrink-0" ref="sortDropRef">
            <button @click.stop="sortDropOpen = !sortDropOpen; priceDropOpen = false"
              :class="['px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition-all flex items-center gap-1', sort ? 'bg-green/10 text-green border-green/30' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300']">
              {{ sort ? sortOptions.find(s=>s.value===sort)?.label : 'Sort' }}
              <span class="text-[10px]">▾</span>
            </button>
            <div v-if="sortDropOpen" class="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 min-w-[160px]">
              <button v-for="s in sortOptions" :key="s.value" @click.stop="sort = s.value; sortDropOpen = false; load()"
                :class="['block w-full text-left px-4 py-2.5 text-xs sm:text-sm hover:bg-green/5 hover:text-green transition-colors', sort === s.value ? 'text-green font-semibold bg-green/5' : 'text-gray-600']">
                {{ s.label }}
              </button>
            </div>
          </div>

          <!-- Product Count -->
          <span class="shrink-0 text-[10px] sm:text-xs text-gray-400 font-medium hidden sm:inline ml-2">{{ total }} items</span>
        </div>
      </div>
    </div>

    <!-- Active Filters Row -->
    <div v-if="hasActiveFilters" class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 pt-3">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-[10px] sm:text-xs text-gray-400">Showing:</span>
        <span v-if="selCats.length" class="inline-flex items-center gap-1 bg-green/10 text-green text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full">
          {{ categories.find(c => c.slug === selCats[0])?.emoji }} {{ categories.find(c => c.slug === selCats[0])?.name }}
          <button @click="selCats=[]; load()" class="ml-0.5 hover:text-red-500 font-bold">×</button>
        </span>
        <span v-if="minPrice || maxPrice" class="inline-flex items-center gap-1 bg-mango/10 text-mango-dark text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full">
          ₹{{ minPrice || 0 }} – ₹{{ maxPrice || '∞' }}
          <button @click="minPrice=null; maxPrice=null; load()" class="ml-0.5 hover:text-red-500 font-bold">×</button>
        </span>
        <span v-if="search" class="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-full">
          "{{ search }}"
          <button @click="search=''; load()" class="ml-0.5 hover:text-red-500 font-bold">×</button>
        </span>
        <button @click="clearFilters" class="text-[10px] sm:text-xs text-red-500 hover:underline font-medium ml-1">Clear all</button>
      </div>
    </div>

    <!-- Products Grid -->
    <div class="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <!-- Loading -->
      <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div v-for="i in 8" :key="i" class="bg-white rounded-2xl h-60 sm:h-72 animate-pulse border border-gray-100"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="!products.length" class="text-center py-16 sm:py-24">
        <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-full flex items-center justify-center text-4xl sm:text-5xl mx-auto mb-5">🔍</div>
        <h3 class="font-serif text-lg sm:text-xl text-gray-700 mb-2">No products found</h3>
        <p class="text-xs sm:text-sm text-gray-400 mb-6 max-w-xs mx-auto">Try changing your filters or search for something different</p>
        <button @click="clearFilters" class="btn btn-primary btn-sm">Show All Products</button>
      </div>

      <!-- Product Grid -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <ProductCard v-for="p in products" :key="p._id" :product="p"/>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 sm:gap-2 mt-8 sm:mt-12">
        <button @click="goPage(page - 1)" :disabled="page === 1"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs sm:text-sm disabled:opacity-30 hover:border-green transition-colors">‹</button>
        <template v-for="p in paginationRange" :key="p">
          <span v-if="p === '...'" class="w-6 text-center text-xs text-gray-400">...</span>
          <button v-else @click="goPage(p)"
            :class="['w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-semibold transition-all', p===page?'bg-green text-white shadow-sm':'bg-white border border-gray-200 hover:border-green text-gray-600']">{{ p }}</button>
        </template>
        <button @click="goPage(page + 1)" :disabled="page === totalPages"
          class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-xs sm:text-sm disabled:opacity-30 hover:border-green transition-colors">›</button>
      </div>
    </div>

    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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
const minPrice = ref(null)
const maxPrice = ref(null)
const productMinPrice = ref(0)
const productMaxPrice = ref(2000)
const priceDropOpen = ref(false)
const sortDropOpen = ref(false)
const priceDropRef = ref(null)
const sortDropRef = ref(null)
const limit = 12
const totalPages = computed(() => Math.ceil(total.value / limit))

const hasActiveFilters = computed(() => selCats.value.length > 0 || minPrice.value || maxPrice.value || search.value)

const sortOptions = [
  { label: 'Default',         value: '' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Newest First',     value: 'newest' },
]

const paginationRange = computed(() => {
  const tp = totalPages.value
  const cp = page.value
  if (tp <= 5) return Array.from({ length: tp }, (_, i) => i + 1)
  const pages = []
  pages.push(1)
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})

const selectCategory = (slug) => {
  selCats.value = slug ? [slug] : []
  load()
}

let t
const debouncedLoad = () => { clearTimeout(t); t = setTimeout(() => load(), 400) }

const normalizeCategoryQuery = (queryValue) => {
  if (!queryValue) return []
  if (Array.isArray(queryValue)) return queryValue.map(String).filter(Boolean)
  return [String(queryValue)]
}

const syncFromQuery = () => {
  const rawCategories = normalizeCategoryQuery(route.query.category)
  const validSlugs = rawCategories.filter((slug) => categories.value.some((cat) => cat.slug === slug))
  selCats.value = validSlugs.length ? [validSlugs[0]] : []
  search.value = route.query.search ? String(route.query.search) : ''
  sort.value = route.query.sort ? String(route.query.sort) : ''
  minPrice.value = route.query.minPrice ? Number(route.query.minPrice) : null
  maxPrice.value = route.query.maxPrice ? Number(route.query.maxPrice) : null
  page.value = route.query.page ? Math.max(1, Number(route.query.page)) : 1
}

const syncToQuery = () => {
  const q = {}
  if (selCats.value.length) q.category = selCats.value[0]
  if (search.value.trim()) q.search = search.value.trim()
  if (sort.value) q.sort = sort.value
  if (minPrice.value) q.minPrice = String(minPrice.value)
  if (maxPrice.value) q.maxPrice = String(maxPrice.value)
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
    if (minPrice.value) params.minPrice = minPrice.value
    if (maxPrice.value) params.maxPrice = maxPrice.value
    const { data } = await api.get('/products', { params })
    products.value = data.products
    total.value    = data.total
  } finally { loading.value = false }
}

const clearFilters = () => { search.value = ''; selCats.value = []; sort.value = ''; minPrice.value = null; maxPrice.value = null; load() }
const goPage = (p) => { if (p < 1 || p > totalPages.value) return; page.value = p; load(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }

const closeDropdowns = (e) => {
  if (priceDropRef.value && !priceDropRef.value.contains(e.target)) priceDropOpen.value = false
  if (sortDropRef.value && !sortDropRef.value.contains(e.target)) sortDropOpen.value = false
}

onMounted(async () => {
  categories.value = await productStore.fetchCategories()
  syncFromQuery()
  await load(false)
  // Fetch price range from all products
  try {
    const { data } = await api.get('/products', { params: { limit: 1, sort: 'price_asc' } })
    if (data.products?.[0]) productMinPrice.value = data.products[0].lowestPrice ?? Math.min(...data.products[0].variants.map(v => Number(v.price)))
    const { data: d2 } = await api.get('/products', { params: { limit: 1, sort: 'price_desc' } })
    if (d2.products?.[0]) productMaxPrice.value = d2.products[0].highestPrice ?? Math.max(...d2.products[0].variants.map(v => Number(v.price)))
  } catch {}
  document.addEventListener('click', closeDropdowns)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdowns)
})

watch(() => route.query, () => {
  syncFromQuery()
  load(false)
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
