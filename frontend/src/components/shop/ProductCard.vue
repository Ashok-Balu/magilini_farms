<template>
  <div class="product-card group" @click="router.push(`/product/${product.slug}`)">
    <!-- Image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-cream to-amber-50 flex items-center justify-center text-5xl sm:text-7xl">
      <img v-if="product.images?.[0]" :src="product.images[0].url" :alt="product.name"
        class="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500"/>
      <span v-else>{{ categoryEmoji }}</span>

      <!-- Badges -->
      <div v-if="product.badge" class="absolute top-2 left-2 sm:top-3 sm:left-3 bg-green text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg shadow-sm">{{ product.badge }}</div>
      <div v-if="discountPct > 0" class="absolute top-2 right-2 sm:top-3 sm:right-3 bg-mango text-gray-900 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg shadow-sm">{{ discountPct }}% OFF</div>

      <!-- Seasonal overlay -->
      <div v-if="product.seasonalStatus !== 'available'" class="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center p-2">
        <span class="text-white font-bold text-xs sm:text-sm text-center">{{ product.seasonalStatus === 'off-season' ? 'Out of Season' : 'Coming Soon' }}</span>
        <span v-if="product.availableFrom" class="text-white/70 text-[10px] sm:text-xs mt-1">From {{ formatDate(product.availableFrom) }}</span>
      </div>

      <!-- Out of stock -->
      <div v-if="isOutOfStock && product.seasonalStatus === 'available'" class="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
        <span class="text-white font-bold text-xs sm:text-sm">Out of Stock</span>
      </div>
    </div>

    <!-- Body -->
    <div class="p-3 sm:p-4 flex-1 flex flex-col">
      <h3 class="font-serif text-[13px] sm:text-[15px] font-semibold mb-1 line-clamp-1 text-gray-900">{{ product.name }}</h3>
      <div class="flex flex-wrap gap-1 mb-2 sm:mb-3">
        <span v-for="tag in product.tags?.slice(0,2)" :key="tag" class="text-[9px] sm:text-[10px] font-semibold bg-green/5 text-green px-1.5 sm:px-2 py-0.5 rounded">{{ tag }}</span>
      </div>
      <div class="flex items-baseline gap-1.5 sm:gap-2 mt-auto flex-wrap">
        <span class="text-base sm:text-lg font-bold text-green">₹{{ cheapestVariant?.price }}</span>
        <span class="text-[10px] sm:text-xs text-gray-400 line-through">₹{{ cheapestVariant?.mrp }}</span>
        <span class="text-[10px] sm:text-[11px] text-gray-400 ml-auto">/ {{ cheapestVariant?.weight }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-3 pb-3 sm:px-4 sm:pb-4 flex gap-1.5 sm:gap-2">
      <template v-if="product.seasonalStatus === 'available' && !isOutOfStock">
        <button @click.stop="handleAddToCart" class="btn btn-ghost flex-1 text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2 hover:bg-green hover:text-white hover:border-green">Add to Cart</button>
        <router-link :to="`/product/${product.slug}`" @click.stop class="btn btn-primary flex-1 text-[10px] sm:text-xs px-2 sm:px-4 py-1.5 sm:py-2">Buy Now</router-link>
      </template>
      <template v-else>
        <button @click.stop="notifyModal.open = true" class="btn btn-ghost w-full text-[10px] sm:text-xs px-2 py-1.5 sm:py-2">📲 Notify Me</button>
      </template>
    </div>

    <!-- Notify Me Modal -->
    <Teleport to="body">
      <div v-if="notifyModal.open" class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" @click.self="closeNotifyModal">
        <div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" @click.stop>
          <div class="px-6 pt-6 pb-2">
            <h3 class="font-semibold text-gray-900 text-base">Get Notified</h3>
            <p class="text-xs text-gray-500 mt-1">We'll send you a message when <strong>{{ product.name }}</strong> is back in stock.</p>
          </div>
          <div class="px-6 pb-6 pt-3">
            <div v-if="notifyModal.success" class="text-center py-4">
              <div class="text-3xl mb-2">✅</div>
              <p class="text-sm font-medium text-green">You'll be notified when available!</p>
              <button @click="closeNotifyModal" class="mt-4 text-xs text-gray-500 hover:text-gray-700 font-medium">Close</button>
            </div>
            <div v-else class="space-y-3">
              <div>
                <label class="text-[11px] text-gray-500 font-medium block mb-1">Phone Number *</label>
                <input v-model="notifyModal.phone" type="tel" maxlength="10" placeholder="9876543210"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green transition-colors"
                  @input="notifyModal.phone = notifyModal.phone.replace(/\D/g, '')"/>
              </div>
              <p v-if="notifyModal.error" class="text-xs text-red-500">{{ notifyModal.error }}</p>
              <div class="flex gap-2">
                <button @click="closeNotifyModal" class="flex-1 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors">Cancel</button>
                <button @click="submitNotifyMe" :disabled="notifyModal.loading"
                  class="flex-1 py-2.5 text-xs font-semibold text-white bg-green rounded-xl hover:bg-green-mid disabled:opacity-50 transition-colors">
                  {{ notifyModal.loading ? 'Submitting...' : 'Notify Me' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const props  = defineProps({ product: { type: Object, required: true } })
const router = useRouter()
const cart   = useCartStore()
const toast  = useToastStore()

const cheapestVariant = computed(() => props.product.variants?.reduce((cheapest, variant) =>
  !cheapest || Number(variant.price) < Number(cheapest.price) ? variant : cheapest, null))
const discountPct     = computed(() => {
  const v = cheapestVariant.value
  if (!v) return 0
  return Math.round((v.mrp - v.price) / v.mrp * 100)
})
const isOutOfStock = computed(() => props.product.variants?.every(v => v.isAvailable === false || Number(v.stock) <= 0))
const categoryEmoji = computed(() => props.product.category?.emoji || '🥭')

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const handleAddToCart = () => {
  const v = props.product.variants?.filter(variant => variant.isAvailable !== false && Number(variant.stock) > 0)
    .reduce((cheapest, variant) => !cheapest || Number(variant.price) < Number(cheapest.price) ? variant : cheapest, null)
  if (!v) { toast.error('This product is currently unavailable.'); return }
  cart.addItem(props.product, v, 1)
  toast.success(`${props.product.name} added to cart!`)
}

const notifyModal = reactive({
  open: false,
  phone: localStorage.getItem('notify_phone') || '',
  loading: false,
  success: false,
  error: ''
})

const closeNotifyModal = () => {
  notifyModal.open = false
  notifyModal.loading = false
  notifyModal.success = false
  notifyModal.error = ''
}

const submitNotifyMe = async () => {
  notifyModal.error = ''
  const phone = notifyModal.phone.trim()
  if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
    notifyModal.error = 'Please enter a valid 10-digit phone number.'
    return
  }
  notifyModal.loading = true
  try {
    await api.post('/notify-me', { phone, productId: props.product._id })
    localStorage.setItem('notify_phone', phone)
    notifyModal.success = true
  } catch (err) {
    notifyModal.error = err.response?.data?.message || 'Something went wrong. Please try again.'
  } finally {
    notifyModal.loading = false
  }
}
</script>
