<template>
  <div>
    <AppNavbar/>
    <div class="mt-[60px] sm:mt-[68px]">
      <!-- Empty Cart -->
      <div v-if="!cart.items.length" class="max-w-md mx-auto text-center px-4 py-20 sm:py-28">
        <div class="w-24 h-24 sm:w-28 sm:h-28 bg-gray-50 rounded-full flex items-center justify-center text-5xl sm:text-6xl mx-auto mb-6">🛒</div>
        <h2 class="font-serif text-2xl sm:text-3xl text-gray-900 mb-3">Your cart is empty</h2>
        <p class="text-sm text-gray-500 mb-8">Looks like you haven't added any farm-fresh products yet.</p>
        <router-link to="/shop" class="btn btn-primary btn-lg">🛍️ Start Shopping</router-link>
      </div>

      <!-- Cart with Items -->
      <div v-else>
        <!-- Header -->
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="font-serif text-2xl sm:text-3xl text-gray-900">Shopping Cart</h1>
              <p class="text-xs sm:text-sm text-gray-400 mt-1">{{ cart.count }} item{{ cart.count > 1 ? 's' : '' }} · {{ cart.totalKg.toFixed(1) }}kg total</p>
            </div>
            <router-link to="/shop" class="text-xs sm:text-sm text-green font-medium hover:underline hidden sm:inline">← Continue Shopping</router-link>
          </div>
        </div>

        <!-- Min order warning -->
        <div v-if="!cart.minMet" class="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
          <div class="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3">
            <span class="text-xl sm:text-2xl shrink-0">⚠️</span>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-xs sm:text-sm text-amber-800">Minimum order: {{ cart.minimumOrderKg }}kg</p>
              <p class="text-[10px] sm:text-xs text-amber-600">Add {{ Math.max(0, cart.minimumOrderKg - cart.totalKg).toFixed(1) }}kg more to proceed. Current: {{ cart.totalKg.toFixed(1) }}kg</p>
            </div>
            <router-link to="/shop" class="text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg shrink-0 hover:bg-amber-200 transition-colors">Add More</router-link>
          </div>
        </div>

        <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-32 sm:pb-16">
          <div class="grid lg:grid-cols-3 gap-6 lg:gap-8">
            <!-- Cart Items -->
            <div class="lg:col-span-2 space-y-3">
              <div v-for="item in cart.items" :key="item.productId + item.variantId"
                class="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                <!-- Image -->
                <router-link :to="`/product/${item.product.slug}`" class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                  <img v-if="item.product.images?.[0]" :src="item.product.images[0].url" class="w-full h-full object-cover"/>
                  <span v-else class="w-full h-full flex items-center justify-center text-2xl">🥭</span>
                </router-link>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <router-link :to="`/product/${item.product.slug}`" class="font-semibold text-sm sm:text-[15px] text-gray-900 hover:text-green transition-colors line-clamp-1 block">{{ item.product.name }}</router-link>
                  <div class="text-[10px] sm:text-xs text-gray-400 mt-0.5">{{ item.variant.weight }} · ₹{{ item.variant.price }} each</div>
                  <!-- Mobile price -->
                  <div class="text-sm font-bold text-green mt-1 sm:hidden">₹{{ item.variant.price * item.qty }}</div>
                </div>

                <!-- Qty Controls -->
                <div class="flex items-center shrink-0">
                  <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button @click="cart.updateQty(item.productId, item.variantId, item.qty-1)"
                      class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-sm sm:text-base">−</button>
                    <span class="w-7 sm:w-8 text-center text-xs sm:text-sm font-bold border-x border-gray-200 py-1">{{ item.qty }}</span>
                    <button @click="cart.updateQty(item.productId, item.variantId, item.qty+1)" :disabled="item.qty >= (item.variant.stock || 0)"
                      class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 text-sm sm:text-base">+</button>
                  </div>
                </div>

                <!-- Price (desktop) -->
                <div class="font-bold text-sm sm:text-base text-gray-900 shrink-0 w-16 sm:w-20 text-right hidden sm:block">₹{{ item.variant.price * item.qty }}</div>

                <!-- Remove -->
                <button @click="cart.removeItem(item.productId, item.variantId)" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shrink-0 text-sm">✕</button>
              </div>

              <!-- Free delivery hint -->
              <div v-if="cart.freeDeliveryMin > 0 && cart.subtotal < cart.freeDeliveryMin" class="bg-green/5 border border-green/10 rounded-xl p-3 flex items-center gap-2 text-xs sm:text-sm text-green font-medium">
                <span>🚚</span> Add ₹{{ cart.freeDeliveryMin - cart.subtotal }} more for free delivery!
              </div>
              <div v-else-if="cart.freeDeliveryMin > 0" class="bg-green/5 border border-green/10 rounded-xl p-3 flex items-center gap-2 text-xs sm:text-sm text-green font-medium">
                <span>🎉</span> You've unlocked FREE delivery!
              </div>
            </div>

            <!-- Order Summary (Desktop) -->
            <div class="hidden lg:block">
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 sticky top-24 space-y-4">
                <h3 class="font-semibold text-lg text-gray-900">Order Summary</h3>

                <!-- Coupon -->
                <div>
                  <div class="flex gap-2">
                    <input v-model="couponCode" placeholder="Coupon code" class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green min-w-0" @keyup.enter="applyCoupon"/>
                    <button @click="applyCoupon" :disabled="applyingCoupon" class="bg-green text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-green-mid transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5">
                      <span v-if="applyingCoupon" class="spinner"></span>Apply
                    </button>
                  </div>
                  <button v-if="discount" @click="removeCoupon" class="text-[10px] text-red-500 font-semibold mt-1.5">Remove coupon</button>
                  <div v-if="couponMsg" :class="['text-xs px-3 py-2 rounded-lg font-medium mt-2', couponMsg.ok ? 'bg-green/5 text-green' : 'bg-red-50 text-red-600']">{{ couponMsg.text }}</div>
                </div>

                <!-- Totals -->
                <div class="space-y-2 pt-3 border-t border-gray-100 text-sm">
                  <div class="flex justify-between text-gray-500"><span>Subtotal ({{ cart.count }} items)</span><span class="text-gray-700">₹{{ cart.subtotal }}</span></div>
                  <div v-if="discount" class="flex justify-between text-green"><span>Coupon Discount</span><span>−₹{{ discount }}</span></div>
                  <div class="flex justify-between text-gray-500"><span>Delivery</span><span class="text-gray-700">{{ cart.freeDeliveryMin > 0 && cart.subtotal >= cart.freeDeliveryMin ? 'FREE' : 'Calculated at checkout' }}</span></div>
                </div>
                <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span class="font-bold text-base text-gray-900">Total</span>
                  <span class="font-bold text-xl text-green">₹{{ Math.max(0, cart.subtotal - discount) }}</span>
                </div>

                <!-- CTA -->
                <router-link v-if="cart.minMet" to="/checkout" class="btn btn-primary w-full py-3.5 text-sm shadow-lg shadow-green/20">Proceed to Checkout →</router-link>
                <button v-else disabled class="w-full py-3.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-semibold cursor-not-allowed">Add {{ (3-cart.totalKg).toFixed(1) }}kg more</button>


                <router-link to="/shop" class="block text-center text-xs text-gray-400 hover:text-green font-medium pt-1">← Continue Shopping</router-link>

                <!-- Trust -->
                <div class="pt-3 border-t border-gray-100 flex justify-center gap-4 text-gray-400">
                  <span class="text-[10px] flex items-center gap-1"><span>🔒</span>Secure</span>
                  <span class="text-[10px] flex items-center gap-1"><span>🚚</span>1-3 days</span>
                  <span class="text-[10px] flex items-center gap-1"><span>🌿</span>Fresh</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile Sticky Bottom -->
        <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_16px_rgba(0,0,0,0.06)] px-4 py-3 z-30 lg:hidden safe-bottom">
          <div class="flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-1.5">
                <span class="text-xl font-bold text-gray-900">₹{{ Math.max(0, cart.subtotal - discount) }}</span>
                <span v-if="discount" class="text-xs text-green font-medium">saved ₹{{ discount }}</span>
              </div>
              <div class="text-[10px] text-gray-400">{{ cart.count }} items · {{ cart.totalKg.toFixed(1) }}kg</div>
            </div>
            <router-link v-if="cart.minMet" to="/checkout" class="bg-green text-white text-sm font-bold px-6 py-3 rounded-xl shadow-md shadow-green/20 shrink-0 active:scale-95 transition-transform">
              Checkout →
            </router-link>
            <button v-else disabled class="bg-gray-100 text-gray-400 text-xs font-semibold px-4 py-3 rounded-xl shrink-0">+{{ (3-cart.totalKg).toFixed(1) }}kg needed</button>
          </div>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useCartStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const cart    = useCartStore()
const toast   = useToastStore()
const couponCode = ref('')
const couponMsg  = ref(null)
const discount   = ref(0)
const applyingCoupon = ref(false)

onMounted(() => cart.loadSettings())

const applyCoupon = async () => {
  if (!couponCode.value.trim()) { couponMsg.value = { ok: false, text: 'Please enter a coupon code.' }; toast.error('Please enter a coupon code.'); return }
  couponMsg.value = null
  applyingCoupon.value = true
  try {
    const { data } = await api.post('/coupons/apply', { code: couponCode.value, subtotal: cart.subtotal })
    if (data.couponType === 'delivery') {
      discount.value = 0
      couponMsg.value = { ok: true, text: `🚚 ${data.description} — applied at checkout!` }
    } else {
      discount.value = data.discount
      couponMsg.value = { ok: true, text: `🎉 ${data.description} — you save ₹${data.discount}!` }
    }
    toast.success(couponMsg.value.text)
  } catch (err) {
    discount.value = 0
    const message = err.response?.data?.message || 'Something went wrong. Try again.'
    couponMsg.value = { ok: false, text: message }
    toast.error(message)
  } finally {
    applyingCoupon.value = false
  }
}

const removeCoupon = () => {
  couponCode.value = ''
  discount.value = 0
  couponMsg.value = null
}

</script>

<style scoped>
.safe-bottom { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
</style>
