<template>
  <div class="product-card" @click="router.push(`/product/${product.slug}`)">
    <!-- Image -->
    <div class="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-warm to-amber-100 flex items-center justify-center text-7xl">
      <img v-if="product.images?.[0]" :src="product.images[0].url" :alt="product.name" class="w-full h-full object-cover absolute inset-0"/>
      <span v-else>{{ categoryEmoji }}</span>

      <!-- Badges -->
      <div v-if="product.badge" class="absolute top-2 left-2 badge-green text-[10px]">{{ product.badge }}</div>
      <div v-if="discountPct > 0" class="absolute top-2 right-2 bg-mango text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-lg">{{ discountPct }}% OFF</div>

      <!-- Seasonal overlay -->
      <div v-if="product.seasonalStatus !== 'available'" class="absolute inset-0 bg-gray-900/60 flex flex-col items-center justify-center">
        <span class="text-white font-bold text-sm">{{ product.seasonalStatus === 'off-season' ? 'Out of Season' : 'Coming Soon' }}</span>
        <span v-if="product.availableFrom" class="text-white/70 text-xs mt-1">From {{ formatDate(product.availableFrom) }}</span>
      </div>

      <!-- Out of stock -->
      <div v-if="isOutOfStock && product.seasonalStatus === 'available'" class="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
        <span class="text-white font-bold text-sm">Out of Stock</span>
      </div>
    </div>

    <!-- Body -->
    <div class="p-4 flex-1 flex flex-col">
      <h3 class="font-serif text-base font-semibold mb-1 line-clamp-1">{{ product.name }}</h3>
      <div class="flex flex-wrap gap-1 mb-2">
        <span v-for="tag in product.tags?.slice(0,2)" :key="tag" class="text-[10px] font-semibold bg-mango-pale text-mango-dark px-2 py-0.5 rounded">{{ tag }}</span>
      </div>
      <div class="flex items-baseline gap-2 mt-auto">
        <span class="text-base font-bold text-green">₹{{ cheapestVariant?.price }}</span>
        <span class="text-xs text-gray-400 line-through">₹{{ cheapestVariant?.mrp }}</span>
        <span class="text-xs text-gray-400">/ {{ cheapestVariant?.weight }}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 pb-4 flex gap-2">
      <template v-if="product.seasonalStatus === 'available' && !isOutOfStock">
        <button @click.stop="handleAddToCart" class="btn btn-ghost btn-sm flex-1 hover:bg-green hover:text-white hover:border-green">Add to Cart</button>
        <router-link :to="`/product/${product.slug}`" @click.stop class="btn btn-primary btn-sm flex-1">Buy Now</router-link>
      </template>
      <template v-else-if="product.seasonalStatus !== 'available' || isOutOfStock">
        <button @click.stop="handleNotifyMe" class="btn btn-ghost btn-sm w-full">📲 Notify Me</button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const props  = defineProps({ product: { type: Object, required: true } })
const router = useRouter()
const cart   = useCartStore()
const toast  = useToastStore()

const cheapestVariant = computed(() => props.product.variants?.[0])
const discountPct     = computed(() => {
  const v = cheapestVariant.value
  if (!v) return 0
  return Math.round((v.mrp - v.price) / v.mrp * 100)
})
const isOutOfStock = computed(() => props.product.variants?.every(v => v.stock === 0))
const categoryEmoji = computed(() => props.product.category?.emoji || '🥭')

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })

const handleAddToCart = () => {
  const v = cheapestVariant.value
  if (!v) return
  cart.addItem(props.product, v, 1)
  toast.success(`${props.product.name} added to cart! 🛒`)
}

const handleNotifyMe = async () => {
  const phone = prompt('Enter your phone number to get notified:')
  if (!phone || phone.length !== 10) return
  await api.post('/notify-me', { phone, productId: props.product._id })
  toast.success('We will notify you when available! 📱')
}
</script>
