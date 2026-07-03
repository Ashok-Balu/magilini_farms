<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px]">
      <div v-if="loading" class="max-w-5xl mx-auto px-6 py-16 flex gap-8">
        <div class="w-1/2 bg-gray-100 rounded-2xl h-96 animate-pulse"></div>
        <div class="flex-1 space-y-4">
          <div class="h-8 bg-gray-100 rounded animate-pulse"></div>
          <div class="h-4 bg-gray-100 rounded w-2/3 animate-pulse"></div>
          <div class="h-24 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>

      <div v-else-if="!product" class="text-center py-24">
        <div class="text-5xl mb-4">😕</div>
        <h2 class="font-serif text-2xl mb-4">Product not found</h2>
        <router-link to="/shop" class="btn btn-primary">Back to Shop</router-link>
      </div>

      <div v-else>
        <!-- Breadcrumb -->
        <div class="flex gap-2 items-center text-xs text-gray-500 px-6 py-3">
          <router-link to="/" class="text-green">Home</router-link><span>›</span>
          <router-link to="/shop" class="text-green">Shop</router-link><span>›</span>
          <span>{{ product.name }}</span>
        </div>

        <!-- Product layout -->
        <div class="max-w-5xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-10">
          <!-- Gallery -->
          <div class="md:sticky md:top-24">
            <div class="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-warm to-amber-100 flex items-center justify-center text-8xl mb-3 relative">
              <img v-if="activeImage" :src="activeImage" class="w-full h-full object-cover absolute inset-0"/>
              <span v-else>{{ product.category?.emoji || '🥭' }}</span>
              <div v-if="product.seasonalStatus !== 'available'" class="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span class="text-white font-bold text-lg">{{ product.seasonalStatus === 'off-season' ? 'Out of Season' : 'Coming Soon' }}</span>
              </div>
            </div>
            <div class="flex gap-2">
              <div v-for="(img, i) in product.images" :key="i" @click="activeImage = img.url"
                :class="['w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-colors', activeImage===img.url ? 'border-green' : 'border-gray-200']">
                <img :src="img.url" class="w-full h-full object-cover"/>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div>
            <div class="flex flex-wrap gap-2 mb-3">
              <span v-if="product.badge" class="badge-green">{{ product.badge }}</span>
              <span v-if="product.seasonalStatus === 'available'" class="badge bg-green-100 text-green text-[10px]">✅ In Stock</span>
              <span v-else class="badge bg-orange-100 text-orange-700 text-[10px]">{{ product.seasonalStatus === 'off-season' ? 'Out of Season' : 'Coming Soon' }}</span>
            </div>

            <h1 class="font-serif text-3xl md:text-4xl mb-2">{{ product.name }}</h1>
            <div class="flex items-center gap-2 mb-4">
              <span class="text-mango text-sm">★★★★★</span>
              <span class="text-xs text-gray-400">4.9 · 128 reviews</span>
            </div>

            <!-- Price -->
            <div class="flex items-baseline gap-3 mb-1">
              <span class="text-3xl font-bold text-green">₹{{ selectedVariant?.price }}</span>
              <span class="text-gray-400 line-through">₹{{ selectedVariant?.mrp }}</span>
              <span class="badge bg-amber-100 text-amber-700">{{ discountPct }}% OFF</span>
            </div>
            <p class="text-xs text-gray-400 mb-5">Price per <strong>{{ selectedVariant?.weight }}</strong></p>

            <p class="text-gray-600 text-sm leading-relaxed mb-4">{{ product.description }}</p>
            <div class="flex flex-wrap gap-1.5 mb-6">
              <span v-for="tag in product.tags" :key="tag" class="text-xs font-semibold bg-mango-pale text-mango-dark px-2.5 py-1 rounded-lg">{{ tag }}</span>
            </div>

            <!-- Variant Selector -->
            <div class="mb-6">
              <div class="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">Select Weight</div>
              <div class="flex flex-wrap gap-2">
                <button v-for="v in product.variants" :key="v._id"
                  @click="selectVariant(v)"
                  :disabled="v.stock === 0"
                  :class="['px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all',
                    selectedVariant?._id === v._id ? 'border-green bg-green text-white' : 'border-gray-200 hover:border-green',
                    v.stock === 0 ? 'opacity-40 cursor-not-allowed' : '']">
                  {{ v.weight }}
                  <span class="block text-xs font-normal">₹{{ v.price }}</span>
                  <span v-if="v.stock > 0 && v.stock <= 10" class="block text-[10px] text-amber-500">Only {{ v.stock }} left!</span>
                  <span v-if="v.stock === 0" class="block text-[10px] text-red-400">Sold out</span>
                </button>
              </div>
            </div>

            <!-- Qty -->
            <div class="flex items-center gap-4 mb-6">
              <div class="text-xs font-bold tracking-widest uppercase text-gray-500">Qty</div>
              <div class="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-2 py-1">
                <button @click="qty = Math.max(1, qty-1)" class="w-8 h-8 rounded-full hover:bg-green hover:text-white flex items-center justify-center transition-colors text-lg">−</button>
                <span class="font-bold w-8 text-center">{{ qty }}</span>
                <button @click="qty = Math.min(selectedVariant?.stock || 1, qty+1)" :disabled="qty >= (selectedVariant?.stock || 1)" class="w-8 h-8 rounded-full hover:bg-green hover:text-white flex items-center justify-center transition-colors text-lg disabled:opacity-40 disabled:cursor-not-allowed">+</button>
              </div>
              <span class="text-sm text-gray-500">Total: <strong class="text-green">₹{{ (selectedVariant?.price || 0) * qty }}</strong></span>
            </div>
            <p v-if="selectedVariant" class="text-xs text-gray-500 mb-6">You can select up to {{ selectedVariant.stock }} unit(s) for this variant.</p>

            <!-- CTA Buttons -->
            <div class="flex flex-col gap-3 mb-6" v-if="product.seasonalStatus === 'available' && selectedVariant?.stock > 0">
              <button @click="handleAddToCart" class="btn btn-primary btn-lg w-full">🛒 Add to Cart</button>
              <button @click="handleBuyNow" class="btn btn-mango btn-lg w-full">⚡ Buy Now</button>
              <a :href="waLink" target="_blank" class="btn btn-wa btn-lg w-full">💬 Order on WhatsApp</a>
            </div>
            <div v-else class="mb-6">
              <button @click="handleNotifyMe" class="btn btn-ghost w-full">📲 Notify Me When Available</button>
            </div>

            <!-- Delivery info -->
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 space-y-2">
              <div class="flex items-center gap-3 text-sm"><span>🚚</span><span>Delivery fee based on your location (check at checkout)</span></div>
              <div class="flex items-center gap-3 text-sm"><span>📦</span><span>Dispatched within 24hrs of harvest</span></div>
              <div class="flex items-center gap-3 text-sm"><span>🌿</span><span>100% Natural · No Carbide · Farm Fresh</span></div>
              <div class="flex items-center gap-3 text-sm text-red-600"><span>⚠️</span><span>No returns or replacements — fresh produce, all sales final</span></div>
            </div>

            <!-- Feature grid -->
            <div class="grid grid-cols-2 gap-2 mb-6">
              <div v-for="f in features" :key="f" class="flex items-center gap-2 text-xs text-gray-500"><span>✅</span>{{ f }}</div>
            </div>

            <!-- Tabs -->
            <div class="border-b border-gray-200 flex gap-0 mb-4">
              <button v-for="tab in tabs" :key="tab" @click="activeTab = tab"
                :class="['px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors', activeTab===tab ? 'border-green text-green' : 'border-transparent text-gray-500']">
                {{ tab }}
              </button>
            </div>
            <div v-if="activeTab === 'Description'" class="text-sm text-gray-600 leading-relaxed">{{ product.description }}</div>
            <div v-if="activeTab === 'Key Points'" class="space-y-2">
              <div v-for="p in product.keyPoints" :key="p" class="flex items-start gap-2 text-sm text-gray-600"><span class="text-green mt-0.5">✅</span>{{ p }}</div>
            </div>
            <div v-if="activeTab === 'Storage Tips'" class="text-sm text-gray-600 leading-relaxed">{{ product.storageTips || 'Keep at room temperature 2-3 days to ripen. Refrigerate after ripening and consume within 3 days.' }}</div>
            <div v-if="activeTab === 'Terms'" class="text-sm text-gray-600 leading-relaxed">
              <p>{{ product.productTerms || 'Orders cannot be cancelled once placed. No returns or replacements. All sales are final as mangoes are fresh perishable produce.' }}</p>
            </div>
            <div v-if="activeTab === 'Reviews'" class="space-y-4">
              <div v-for="r in reviews" :key="r.name" class="border-b border-gray-100 pb-4">
                <div class="text-mango text-sm mb-1">★★★★★</div>
                <p class="text-sm text-gray-600 italic mb-1">"{{ r.text }}"</p>
                <div class="text-xs font-semibold text-green">— {{ r.name }}, {{ r.city }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Products -->
        <section v-if="related.length" class="bg-white py-12 px-6">
          <div class="max-w-5xl mx-auto">
            <h2 class="font-serif text-2xl mb-6">You Might Also Like</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ProductCard v-for="p in related" :key="p._id" :product="p"/>
            </div>
          </div>
        </section>
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
import { useCartStore, useToastStore } from '@/stores/index.js'
import { useProductStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const route = useRoute()
const router = useRouter()
const cart  = useCartStore()
const toast = useToastStore()
const productStore = useProductStore()

const product = ref(null)
const loading = ref(true)
const related = ref([])
const selectedVariant = ref(null)
const qty = ref(1)
const activeImage = ref(null)
const activeTab = ref('Description')
const tabs = ['Description', 'Key Points', 'Storage Tips', 'Terms', 'Reviews']
const features = ['Hand picked', 'Own 230-tree farm', 'No chemicals', 'No cold storage', 'Dispatched fresh', 'All-India delivery']
const reviews = [
  { name: 'Priya K.', city: 'Chennai', text: 'The Alphonso was absolutely divine. Best mangoes of my life!' },
  { name: 'Rajan M.', city: 'Bangalore', text: 'Gift box arrived perfectly. Parents loved it. Ordering again!' },
  { name: 'Anitha S.', city: 'Hyderabad', text: 'So fresh you can smell them from the box. Amazing quality.' },
]

const discountPct = computed(() => {
  const v = selectedVariant.value
  if (!v) return 0
  return Math.round((v.mrp - v.price) / v.mrp * 100)
})

const waLink = computed(() => {
  if (!product.value || !selectedVariant.value) return 'https://wa.me/919999999999'
  const msg = `Hi! I want to order ${product.value.name} (${selectedVariant.value.weight}). Please confirm availability.`
  return `https://wa.me/919999999999?text=${encodeURIComponent(msg)}`
})

const selectVariant = (v) => { if (v.stock > 0) selectedVariant.value = v }

const handleAddToCart = () => {
  if (!selectedVariant.value) return
  qty.value = Math.min(qty.value, selectedVariant.value.stock)
  cart.addItem(product.value, selectedVariant.value, qty.value)
  toast.success(`${product.value.name} added to cart! 🛒`)
}

const handleBuyNow = () => {
  if (!selectedVariant.value) return
  qty.value = Math.min(qty.value, selectedVariant.value.stock)
  cart.addItem(product.value, selectedVariant.value, qty.value)
  router.push('/checkout')
}

const handleNotifyMe = async () => {
  const phone = prompt('Enter your phone number to get notified:')
  if (!phone || phone.length !== 10) return
  await api.post('/notify-me', { phone, productId: product.value._id })
  toast.success('We will notify you when available! 📱')
}

const loadProduct = async () => {
  loading.value = true
  try {
    const p = await productStore.fetchProduct(route.params.slug)
    product.value = p
    activeImage.value = p.images?.[0]?.url || null
    selectedVariant.value = p.variants?.find(v => v.stock > 0) || p.variants?.[0]
    qty.value = 1
    // Related
    const { data } = await api.get('/products', { params: { category: p.category?.slug, limit: 4 } })
    related.value = data.products.filter(r => r._id !== p._id).slice(0, 4)
  } catch { product.value = null }
  finally { loading.value = false }
}

onMounted(loadProduct)
watch(() => route.params.slug, loadProduct)
watch(selectedVariant, (v) => {
  if (!v) return
  qty.value = Math.min(Math.max(1, qty.value), v.stock || 1)
})
</script>
