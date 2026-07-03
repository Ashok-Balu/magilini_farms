<template>
  <div>
    <AppNavbar/>
    <div class="mt-[68px] max-w-5xl mx-auto px-6 py-10">
      <div class="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <router-link to="/" class="text-green">Home</router-link><span>›</span>
        <router-link to="/cart" class="text-green">Cart</router-link><span>›</span><span>Checkout</span>
      </div>

      <div v-if="!cart.items.length" class="text-center py-20">
        <p class="text-gray-500 mb-4">Your cart is empty</p>
        <router-link to="/shop" class="btn btn-primary">Shop Now</router-link>
      </div>

      <div v-else class="grid md:grid-cols-3 gap-8">
        <!-- Left: Steps -->
        <div class="md:col-span-2 space-y-5">

          <div v-if="!cart.minMet" class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            Minimum order is 3kg. Current cart weight: {{ cart.totalKg.toFixed(1) }}kg. Add {{ (3 - cart.totalKg).toFixed(1) }}kg more to continue.
          </div>

          <!-- STEP 1: Delivery Method -->
          <div class="card card-body">
            <h3 class="font-semibold mb-4 flex items-center gap-2"><span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold">1</span> Delivery Method</h3>
            <div class="grid sm:grid-cols-2 gap-3">
              <button @click="deliveryType='home'" :class="['rounded-2xl border-2 p-4 text-left transition-all', deliveryType==='home' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                <div class="text-xl mb-1">🚚</div>
                <div class="font-semibold text-sm">Home Delivery</div>
                <div class="text-xs text-gray-500">Delivered to your address</div>
              </button>
              <button @click="deliveryType='pickup'" :class="['rounded-2xl border-2 p-4 text-left transition-all', deliveryType==='pickup' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                <div class="text-xl mb-1">🏪</div>
                <div class="font-semibold text-sm">Farm Pickup</div>
                <div class="text-xs text-gray-500">Collect from our farm · Free</div>
              </button>
            </div>

            <!-- Home Delivery Address -->
            <div v-if="deliveryType==='home'" class="mt-5 space-y-4">
              <div class="grid sm:grid-cols-2 gap-4">
                <div><label class="form-label">Full Name *</label><input v-model="form.name" class="form-input" placeholder="Your name"/></div>
                <div><label class="form-label">Phone *</label><input v-model="form.phone" class="form-input" placeholder="9876543210" maxlength="10"/></div>
              </div>
              <div><label class="form-label">Email (optional)</label><input v-model="form.email" type="email" class="form-input" placeholder="you@email.com"/></div>
              <div><label class="form-label">Address Line 1 *</label><input v-model="form.line1" class="form-input" placeholder="Door no, Street"/></div>
              <div><label class="form-label">Address Line 2</label><input v-model="form.line2" class="form-input" placeholder="Area, Landmark"/></div>
              <div class="grid sm:grid-cols-2 gap-4">
                <div><label class="form-label">City *</label><input v-model="form.city" class="form-input" placeholder="Chennai"/></div>
                <div><label class="form-label">State *</label><input v-model="form.state" class="form-input" placeholder="Tamil Nadu"/></div>
              </div>
              <div>
                <label class="form-label">PIN Code *</label>
                <input v-model="form.pincode" class="form-input" placeholder="600001" maxlength="6" @blur="checkPin"/>
                <div v-if="pinResult" :class="['text-xs mt-1 font-medium', pinResult.serviceable ? 'text-green' : 'text-red-500']">
                  {{ pinResult.serviceable ? `✅ ${pinResult.city} — Delivery fee: ₹${pinResult.deliveryFee} · ${pinResult.estimatedDays}${pinResult.estimatedDeliveryDate ? ` · ETA ${pinResult.estimatedDeliveryDate.from} to ${pinResult.estimatedDeliveryDate.to}` : ''}` : '❌ We don\'t deliver here. Please choose Farm Pickup.' }}
                </div>
              </div>
              <div>
                <label class="form-label">Preferred Delivery Date</label>
                <input v-model="form.preferredDate" type="date" :min="minDate" class="form-input"/>
              </div>
            </div>

            <!-- Farm Pickup -->
            <div v-if="deliveryType==='pickup'" class="mt-5 space-y-4">
              <div class="grid sm:grid-cols-2 gap-4">
                <div><label class="form-label">Full Name *</label><input v-model="form.name" class="form-input" placeholder="Your name"/></div>
                <div><label class="form-label">Phone *</label><input v-model="form.phone" class="form-input" placeholder="9876543210" maxlength="10"/></div>
              </div>
              <div>
                <label class="form-label">Preferred Pickup Date *</label>
                <input v-model="form.pickupDate" type="date" :min="tomorrowDate" class="form-input"/>
              </div>
              <div class="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 space-y-1">
                <div class="font-semibold text-gray-800 mb-2">📍 Farm Location</div>
                <div>123, Farm Road, Salem — 636001, Tamil Nadu</div>
                <div>🕐 {{ pickupHours }}</div>
                <div>📞 +91 9999999999</div>
                <a href="https://maps.google.com" target="_blank" class="inline-block mt-2 text-green font-medium text-xs">🗺️ Get Directions on Google Maps →</a>
              </div>
            </div>
          </div>

          <!-- STEP 2: Order Notes & Packaging -->
          <div class="card card-body">
            <h3 class="font-semibold mb-4 flex items-center gap-2"><span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold">2</span> Extras</h3>
            <div class="mb-4">
              <label class="form-label">Packaging</label>
              <div class="grid sm:grid-cols-2 gap-3">
                <button @click="packaging='standard'" :class="['rounded-xl border-2 p-3 text-left', packaging==='standard' ? 'border-green bg-green/5' : 'border-gray-200']">
                  <div class="font-semibold text-sm">📦 Standard</div>
                  <div class="text-xs text-gray-500">Regular box · Free</div>
                </button>
                <button @click="packaging='gift'" :class="['rounded-xl border-2 p-3 text-left', packaging==='gift' ? 'border-green bg-green/5' : 'border-gray-200']">
                  <div class="font-semibold text-sm">🎁 Gift Packing</div>
                  <div class="text-xs text-gray-500">Premium box + ribbon · +₹50</div>
                </button>
              </div>
              <div v-if="packaging==='gift'" class="mt-3">
                <label class="form-label">Gift Message (optional)</label>
                <input v-model="giftMessage" class="form-input" placeholder="Happy Birthday! Enjoy the mangoes 🥭" maxlength="100"/>
              </div>
            </div>
            <div>
              <label class="form-label">Order Notes (optional)</label>
              <textarea v-model="orderNotes" class="form-input resize-none h-20" placeholder="e.g. Pack carefully — for gifting. Call before delivery." maxlength="200"></textarea>
            </div>
          </div>

          <!-- STEP 3: Payment -->
          <div class="card card-body">
            <h3 class="font-semibold mb-4 flex items-center gap-2"><span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold">3</span> Payment</h3>

            <!-- Farm pickup - pay at farm option -->
            <div v-if="deliveryType==='pickup'" class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
              <label class="flex items-center gap-3 cursor-pointer">
                <input type="radio" v-model="payMethod" value="pay-at-farm" class="accent-green w-4 h-4"/>
                <div>
                  <div class="font-semibold">💵 Pay at Farm</div>
                  <div class="text-xs text-gray-500">Pay Cash or UPI when you collect. ₹0 fee.</div>
                </div>
              </label>
            </div>

            <!-- UPI options -->
            <div v-if="orderTotal <= 2000" class="mb-3 p-3 bg-green/5 border-2 border-green rounded-xl">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" v-model="payMethod" value="razorpay-upi" class="accent-green w-4 h-4 mt-0.5"/>
                <div>
                  <div class="font-semibold text-sm flex items-center gap-2">UPI via Razorpay <span class="badge bg-green text-white text-[10px]">₹0 FEE</span></div>
                  <div class="text-xs text-gray-500">GPay, PhonePe, Paytm, BHIM — No gateway fee below ₹2000</div>
                </div>
              </label>
            </div>
            <div v-else class="mb-3 p-3 bg-green/5 border-2 border-green rounded-xl">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" v-model="payMethod" value="direct-upi" class="accent-green w-4 h-4 mt-0.5"/>
                <div>
                  <div class="font-semibold text-sm flex items-center gap-2">Direct UPI QR <span class="badge bg-green text-white text-[10px]">₹0 FEE</span></div>
                  <div class="text-xs text-gray-500">Scan QR → Pay → Send screenshot on WhatsApp</div>
                  <div v-if="payMethod==='direct-upi'" class="mt-2 bg-white border border-gray-200 rounded-xl p-3 text-center">
                    <div class="text-4xl mb-1">📱</div>
                    <div class="font-bold text-green text-sm">yourname@upi</div>
                    <div class="text-xs text-gray-500 mt-1">Pay ₹{{ orderTotal }} → send screenshot to WhatsApp</div>
                    <input type="file" accept="image/*" class="form-input mt-3" @change="onScreenshotSelected"/>
                    <div v-if="paymentScreenshot" class="text-xs text-green mt-2">Payment screenshot attached.</div>
                  </div>
                </div>
              </label>
            </div>

            <div class="mb-3 p-3 border border-gray-200 rounded-xl">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" v-model="payMethod" value="razorpay-card" class="accent-green w-4 h-4 mt-0.5"/>
                <div>
                  <div class="font-semibold text-sm">💳 Credit / Debit Card</div>
                  <div class="text-xs text-gray-500">Visa, Mastercard, RuPay · 2% fee</div>
                </div>
              </label>
            </div>
            <div class="p-3 border border-gray-200 rounded-xl">
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="radio" v-model="payMethod" value="razorpay-nb" class="accent-green w-4 h-4 mt-0.5"/>
                <div>
                  <div class="font-semibold text-sm">🏦 Net Banking</div>
                  <div class="text-xs text-gray-500">All major banks · 2% fee</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Warning -->
          <div class="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 space-y-1">
            <div class="font-semibold">⚠️ Please note before placing order:</div>
            <div>• Orders cannot be cancelled once placed</div>
            <div>• No returns or replacements — all sales final</div>
            <div>• Fresh perishable produce</div>
          </div>
        </div>

        <!-- Right: Summary -->
        <div class="card card-body space-y-4 h-fit sticky top-24">
          <h3 class="font-semibold">Order Summary</h3>
          <div v-for="item in cart.items" :key="item.productId+item.variantId" class="flex justify-between items-start text-sm">
            <div class="flex-1 pr-2">
              <div class="font-medium line-clamp-1">{{ item.product.name }}</div>
              <div class="text-xs text-gray-400">{{ item.variant.weight }} × {{ item.qty }}</div>
            </div>
            <span>₹{{ item.variant.price * item.qty }}</span>
          </div>

          <!-- Coupon -->
          <div class="border-t border-gray-100 pt-3">
            <div class="flex gap-2 mb-2">
              <input v-model="couponCode" placeholder="Coupon code" class="form-input flex-1 py-1.5 text-xs"/>
              <button @click="applyCoupon" class="btn btn-primary btn-sm text-xs px-3">Apply</button>
            </div>
            <button v-if="couponDiscount" @click="removeCoupon" class="text-xs text-red-500 font-semibold">Remove coupon</button>
            <div v-if="couponMsg" :class="['text-xs px-2 py-1.5 rounded-lg font-medium', couponMsg.ok ? 'bg-green-50 text-green' : 'bg-red-50 text-red-600']">{{ couponMsg.text }}</div>
          </div>

          <div class="space-y-2 text-sm border-t border-gray-100 pt-3">
            <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{{ cart.subtotal }}</span></div>
            <div v-if="couponDiscount" class="flex justify-between text-green"><span>Coupon</span><span>−₹{{ couponDiscount }}</span></div>
            <div v-if="packaging==='gift'" class="flex justify-between text-gray-500"><span>Gift Packing</span><span>₹50</span></div>
            <div class="flex justify-between text-gray-500"><span>Delivery</span><span>{{ deliveryType==='pickup' ? 'FREE' : (pinResult?.serviceable ? `₹${pinResult.deliveryFee}` : 'TBD') }}</span></div>
            <div class="flex justify-between font-bold text-base border-t border-gray-100 pt-2"><span>Total</span><span>₹{{ orderTotal }}</span></div>
          </div>

          <button @click="placeOrder" :disabled="placingOrder || !canPlaceOrder" class="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {{ placingOrder ? 'Processing...' : `✅ Place Order — ₹${orderTotal}` }}
          </button>
          <p v-if="orderError" class="text-red-500 text-xs text-center">{{ orderError }}</p>
        </div>
      </div>
    </div>
    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useCartStore, useAuthStore, useToastStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const router    = useRouter()
const cart      = useCartStore()
const auth      = useAuthStore()
const toast     = useToastStore()

const deliveryType   = ref('home')
const packaging      = ref('standard')
const giftMessage    = ref('')
const orderNotes     = ref('')
const payMethod      = ref('razorpay-upi')
const couponCode     = ref('')
const couponDiscount = ref(0)
const couponMsg      = ref(null)
const pinResult      = ref(null)
const placingOrder   = ref(false)
const orderError     = ref('')
const paymentScreenshot = ref('')
const businessHours = ref([])

const form = ref({ name: auth.user?.name||'', phone: auth.user?.phone||'', email: auth.user?.email||'', line1:'', line2:'', city:'', state:'', pincode:'', preferredDate:'', pickupDate:'' })

const minDate      = computed(() => { const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().split('T')[0] })
const tomorrowDate = computed(() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] })
const pickupHours = computed(() => {
  const openDays = businessHours.value.filter(day => day.isOpen && day.day !== 'sunday')
  if (!openDays.length) return 'Mon-Sat: 7:00 AM - 6:00 PM'
  return 'Mon-Sat: 7:00 AM - 6:00 PM'
})

const deliveryFee = computed(() => {
  if (deliveryType.value === 'pickup') return 0
  return pinResult.value?.serviceable ? pinResult.value.deliveryFee : 0
})

const orderTotal = computed(() => {
  let t = cart.subtotal - couponDiscount.value + deliveryFee.value
  if (packaging.value === 'gift') t += 50
  return Math.max(0, t)
})
const canPlaceOrder = computed(() => cart.minMet && (deliveryType.value === 'pickup' || pinResult.value?.serviceable))

const checkPin = async () => {
  if (form.value.pincode?.length === 6) {
    try {
      const { data } = await api.get(`/delivery/check/${form.value.pincode}`)
      pinResult.value = data
      if (!data.serviceable) deliveryType.value = 'pickup'
    } catch {
      pinResult.value = { serviceable: false }
      deliveryType.value = 'pickup'
    }
  }
}

const applyCoupon = async () => {
  if (!couponCode.value.trim()) return
  try {
    const { data } = await api.post('/coupons/apply', { code: couponCode.value, subtotal: cart.subtotal, userId: auth.user?._id })
    couponDiscount.value = data.discount
    couponMsg.value = { ok: true, text: `✅ ${data.description} — ₹${data.discount} saved!` }
  } catch (err) {
    couponDiscount.value = 0
    couponMsg.value = { ok: false, text: err.response?.data?.message || 'Invalid coupon' }
  }
}

const removeCoupon = () => {
  couponCode.value = ''
  couponDiscount.value = 0
  couponMsg.value = null
}

const onScreenshotSelected = (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    paymentScreenshot.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    paymentScreenshot.value = String(reader.result || '')
  }
  reader.readAsDataURL(file)
}

const placeOrder = async () => {
  orderError.value = ''
  if (!form.value.name || !form.value.phone) { orderError.value = 'Please fill in your name and phone.'; return }
  if (!cart.minMet) { orderError.value = 'Minimum order is 3kg.'; return }
  if (deliveryType.value === 'home') {
    if (!form.value.line1 || !form.value.city || !form.value.pincode) { orderError.value = 'Please fill in complete address.'; return }
    if (!pinResult.value?.serviceable) { orderError.value = 'Please enter a valid serviceable PIN code.'; return }
  }
  if (deliveryType.value === 'pickup' && !form.value.pickupDate) { orderError.value = 'Please select a pickup date.'; return }

  placingOrder.value = true
  try {
    const payload = {
      deliveryType: deliveryType.value,
      items: cart.cartForCheckout,
      packaging: packaging.value,
      giftMessage: giftMessage.value,
      orderNotes: orderNotes.value,
      paymentMethod: payMethod.value,
      couponCode: couponCode.value || undefined,
      paymentScreenshot: paymentScreenshot.value || undefined,
    }
    if (deliveryType.value === 'home') {
      payload.deliveryAddress = { line1: form.value.line1, line2: form.value.line2, city: form.value.city, state: form.value.state, pincode: form.value.pincode }
      payload.preferredDeliveryDate = form.value.preferredDate || undefined
    } else {
      payload.pickupDate = form.value.pickupDate
    }

    const { data } = await api.post('/orders', payload)
    const order = data.order

    // Handle payment
    if (['razorpay-upi','razorpay-card','razorpay-nb'].includes(payMethod.value)) {
      await handleRazorpay(order)
    } else {
      // Direct UPI or pay-at-farm
      handleDirectPayment(order)
    }
  } catch (err) {
    orderError.value = err.response?.data?.message || 'Failed to place order. Please try again.'
  } finally { placingOrder.value = false }
}

const handleRazorpay = async (order) => {
  const { data } = await api.post('/payment/create-order', { orderId: order._id })
  const options = {
    key:       data.keyId,
    amount:    data.amount,
    currency:  'INR',
    name:      'MagiliniFarms',
    description: 'Fresh Mango Order',
    order_id:  data.razorpayOrderId,
    prefill:   { name: form.value.name, contact: form.value.phone, email: form.value.email },
    theme:     { color: '#1B4D2E' },
    handler: async (response) => {
      try {
        await api.post('/payment/verify', { ...response, orderId: order._id })
        cart.clear()
        router.push({ name: 'CheckoutSuccess', query: { order: order.orderNumber } })
      } catch (err) {
        toast.error(err.response?.data?.message || 'Payment verification failed.')
      }
    },
    modal: {
      ondismiss: () => {
        toast.error('Payment cancelled. Your order remains pending.')
      }
    },
  }
  new window.Razorpay(options).open()
}

const handleDirectPayment = (order) => {
  cart.clear()
  const msg = `Hi! I just placed order ${order.orderNumber} for ₹${order.total}. Please confirm and share payment details.`
  setTimeout(() => window.open(`https://wa.me/919999999999?text=${encodeURIComponent(msg)}`, '_blank'), 1500)
  router.push({ name: 'CheckoutSuccess', query: { order: order.orderNumber } })
}

onMounted(() => {
  if (auth.user?.savedAddress?.line1) Object.assign(form.value, auth.user.savedAddress)
  api.get('/business-hours').then(({ data }) => {
    businessHours.value = data.hours || []
  }).catch(() => {
    businessHours.value = []
  })
})

watch([deliveryType, orderTotal], () => {
  if (deliveryType.value === 'pickup' && payMethod.value === 'razorpay-upi') {
    payMethod.value = 'pay-at-farm'
    return
  }
  if (deliveryType.value === 'home' && payMethod.value === 'pay-at-farm') {
    payMethod.value = orderTotal.value <= 2000 ? 'razorpay-upi' : 'direct-upi'
  }
})
</script>

