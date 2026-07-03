<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px] max-w-4xl mx-auto px-6 py-10">
      <h1 class="font-serif text-3xl mb-8">Your Cart 🛒</h1>

      <div v-if="!cart.items.length" class="text-center py-20">
        <div class="text-6xl mb-4">🛒</div>
        <h3 class="font-serif text-2xl mb-2">Your cart is empty</h3>
        <p class="text-gray-500 mb-6">Add some fresh mangoes to get started!</p>
        <router-link to="/shop" class="btn btn-primary btn-lg">Shop Now 🥭</router-link>
      </div>

      <div v-else class="grid md:grid-cols-3 gap-8">
        <!-- Items -->
        <div class="md:col-span-2 space-y-4">
          <!-- Min order warning -->
          <div v-if="!cart.minMet" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <span class="text-2xl">⚠️</span>
            <div>
              <p class="font-semibold text-sm text-amber-800">Minimum order is 3kg</p>
              <p class="text-xs text-amber-600">Your cart has {{ cart.totalKg.toFixed(1) }}kg. Add {{ (3 - cart.totalKg).toFixed(1) }}kg more to checkout.</p>
            </div>
          </div>

          <div v-for="item in cart.items" :key="item.productId + item.variantId" class="card flex items-center gap-4 p-4">
            <div class="w-16 h-16 rounded-xl bg-warm flex items-center justify-center text-3xl shrink-0 overflow-hidden">
              <img v-if="item.product.images?.[0]" :src="item.product.images[0].url" class="w-full h-full object-cover rounded-xl"/>
              <span v-else>🥭</span>
            </div>
            <div class="flex-1 min-w-0">
              <router-link :to="`/product/${item.product.slug}`" class="font-semibold text-sm hover:text-green line-clamp-1">{{ item.product.name }}</router-link>
              <div class="text-xs text-gray-500">{{ item.variant.weight }} · ₹{{ item.variant.price }} each</div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button @click="cart.updateQty(item.productId, item.variantId, item.qty-1)"
                class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-green hover:text-white hover:border-green transition-colors">−</button>
              <span class="font-bold w-6 text-center text-sm">{{ item.qty }}</span>
              <button @click="cart.updateQty(item.productId, item.variantId, item.qty+1)" :disabled="item.qty >= (item.variant.stock || 0)"
                class="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-lg hover:bg-green hover:text-white hover:border-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+</button>
            </div>
            <div class="font-bold text-sm text-green shrink-0">₹{{ item.variant.price * item.qty }}</div>
            <button @click="cart.removeItem(item.productId, item.variantId)" class="text-gray-300 hover:text-red-500 transition-colors shrink-0">✕</button>
          </div>

          <div class="text-sm text-gray-500 flex items-center gap-2">
            <span>Total weight: <strong class="text-gray-700">{{ cart.totalKg.toFixed(1) }}kg</strong></span>
            <span :class="cart.minMet ? 'text-green' : 'text-amber-500'" class="font-semibold">
              {{ cart.minMet ? '✅ Minimum met' : `(need ${(3-cart.totalKg).toFixed(1)}kg more)` }}
            </span>
          </div>
        </div>

        <!-- Summary -->
        <div class="card card-body space-y-4 h-fit sticky top-24">
          <h3 class="font-semibold">Order Summary</h3>

          <!-- Coupon -->
          <div class="flex gap-2">
            <input v-model="couponCode" placeholder="Coupon code" class="form-input flex-1 py-2 text-sm"/>
            <button @click="applyCoupon" class="btn btn-primary btn-sm shrink-0">Apply</button>
          </div>
          <button v-if="discount" @click="removeCoupon" class="text-xs text-red-500 font-semibold text-left">Remove coupon</button>
          <div v-if="couponMsg" :class="['text-xs px-3 py-2 rounded-xl font-medium', couponMsg.ok ? 'bg-green-50 text-green' : 'bg-red-50 text-red-600']">
            {{ couponMsg.text }}
          </div>

          <div class="space-y-2 text-sm border-t border-gray-100 pt-3">
            <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span>₹{{ cart.subtotal }}</span></div>
            <div v-if="discount" class="flex justify-between text-green"><span>Discount</span><span>−₹{{ discount }}</span></div>
            <div class="flex justify-between font-bold text-base border-t border-gray-100 pt-2 mt-1"><span>Total</span><span>₹{{ cart.subtotal - discount }}</span></div>
            <div class="text-xs text-gray-400">+ delivery fee calculated at checkout</div>
          </div>

          <router-link v-if="cart.minMet" to="/checkout" class="btn btn-primary w-full">Proceed to Checkout →</router-link>
          <button v-else disabled class="btn btn-primary w-full opacity-50 cursor-not-allowed">Add {{ (3-cart.totalKg).toFixed(1) }}kg more to checkout</button>

          <button @click="orderWA" class="btn btn-wa w-full">💬 Order via WhatsApp</button>

          <router-link to="/shop" class="block text-center text-xs text-green font-medium">← Continue Shopping</router-link>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useCartStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const cart    = useCartStore()
const toast   = useToastStore()
const couponCode = ref('')
const couponMsg  = ref(null)
const discount   = ref(0)

const applyCoupon = async () => {
  if (!couponCode.value.trim()) return
  try {
    const { data } = await api.post('/coupons/apply', { code: couponCode.value, subtotal: cart.subtotal })
    discount.value = data.discount
    couponMsg.value = { ok: true, text: `✅ ${data.description} — ₹${data.discount} saved!` }
  } catch (err) {
    discount.value = 0
    couponMsg.value = { ok: false, text: err.response?.data?.message || 'Invalid coupon' }
  }
}

const removeCoupon = () => {
  couponCode.value = ''
  discount.value = 0
  couponMsg.value = null
}

const orderWA = () => {
  const lines = cart.items.map(i => `${i.qty} x ${i.variant.weight} ${i.product.name} = ₹${i.variant.price * i.qty}`).join('\n')
  const total = Math.max(0, cart.subtotal - discount.value)
  const msg   = `Hi! I want to order:\n\n${lines}\n\nCurrent Weight: ${cart.totalKg.toFixed(1)}kg\nSubtotal: ₹${cart.subtotal}\nDiscount: ₹${discount.value}\nTotal: ₹${total}\n\nPlease confirm delivery.`
  window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`, '_blank')
}
</script>
