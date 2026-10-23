<template>
  <div>
    <AppNavbar/>
    <div class="mt-[60px] sm:mt-[68px] bg-gray-50 min-h-screen">
      <!-- Header -->
      <div class="bg-white border-b border-gray-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="font-serif text-xl sm:text-2xl text-gray-900">Checkout</h1>
              <nav class="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                <router-link to="/cart" class="hover:text-green">Cart</router-link><span>/</span><span class="text-gray-600 font-medium">Checkout</span>
              </nav>
            </div>
            <!-- Progress -->
            <div class="hidden sm:flex items-center gap-2">
              <div class="flex items-center gap-1.5"><span class="w-6 h-6 bg-green text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span><span class="text-xs text-green font-medium">Delivery</span></div>
              <div class="w-6 h-px bg-gray-300"></div>
              <div class="flex items-center gap-1.5"><span class="w-6 h-6 bg-green text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span><span class="text-xs text-green font-medium">Payment</span></div>
              <div class="w-6 h-px bg-gray-300"></div>
              <div class="flex items-center gap-1.5"><span class="w-6 h-6 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-[10px] font-bold">3</span><span class="text-xs text-gray-400">Confirm</span></div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!cart.items.length" class="text-center py-20 px-4">
        <div class="text-5xl mb-4">🛒</div>
        <p class="text-gray-500 mb-4">Your cart is empty</p>
        <router-link to="/shop" class="btn btn-primary">Shop Now</router-link>
      </div>

      <div v-else class="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
        <!-- Min weight warning -->
        <div v-if="!cart.minMet" class="bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-5 flex items-center gap-3">
          <span class="text-xl shrink-0">⚠️</span>
          <div class="flex-1">
            <p class="font-semibold text-xs sm:text-sm text-amber-800">Minimum order: {{ cart.minimumOrderKg }}kg</p>
            <p class="text-[10px] sm:text-xs text-amber-600">Add {{ Math.max(0, cart.minimumOrderKg - cart.totalKg).toFixed(1) }}kg more. Current: {{ cart.totalKg.toFixed(1) }}kg</p>
          </div>
          <router-link to="/shop" class="text-[10px] sm:text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg shrink-0">Add More</router-link>
        </div>

        <div class="grid lg:grid-cols-5 gap-5 sm:gap-8">
          <!-- ═══ LEFT: FORM (3 cols) ═══ -->
          <div class="lg:col-span-3 space-y-4 sm:space-y-5">

            <!-- DELIVERY METHOD -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h3 class="font-semibold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2.5">
                <span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                Delivery Method
              </h3>
              <div class="grid grid-cols-2 gap-2 sm:gap-3">
                <button @click="deliveryType='home'" :class="['rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-left transition-all', deliveryType==='home' ? 'border-green bg-green/5 shadow-sm' : 'border-gray-200 hover:border-gray-300']">
                  <div class="text-lg sm:text-xl mb-1">🚚</div>
                  <div class="font-semibold text-xs sm:text-sm">Home Delivery</div>
                  <div class="text-[10px] sm:text-xs text-gray-500 mt-0.5">To your address</div>
                </button>
                <button @click="deliveryType='pickup'" :class="['rounded-xl sm:rounded-2xl border-2 p-3 sm:p-4 text-left transition-all', deliveryType==='pickup' ? 'border-green bg-green/5 shadow-sm' : 'border-gray-200 hover:border-gray-300']">
                  <div class="text-lg sm:text-xl mb-1">🏪</div>
                  <div class="font-semibold text-xs sm:text-sm">Farm Pickup</div>
                  <div class="text-[10px] sm:text-xs text-gray-500 mt-0.5">Free · Collect yourself</div>
                </button>
              </div>

              <!-- Home Delivery Form -->
              <div v-if="deliveryType==='home'" class="mt-5 space-y-3 sm:space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                  <div><label class="form-label">Full Name *</label><input v-model="form.name" :class="['form-input text-sm', isInvalid('name') && 'is-invalid']" placeholder="Your name"/></div>
                  <div><label class="form-label">Phone *</label><input v-model="form.phone" :class="['form-input text-sm', isInvalid('phone') && 'is-invalid']" placeholder="9876543210" maxlength="10"/></div>
                </div>
                <div><label class="form-label">Email (optional)</label><input v-model="form.email" type="email" class="form-input text-sm" placeholder="you@email.com"/></div>
                <div><label class="form-label">Address *</label><input v-model="form.line1" :class="['form-input text-sm', isInvalid('line1') && 'is-invalid']" placeholder="Door no, Street, Area"/></div>
                <div><label class="form-label">Landmark</label><input v-model="form.line2" class="form-input text-sm" placeholder="Near..."/></div>
                <div class="grid grid-cols-3 gap-3">
                  <div><label class="form-label">City *</label><input v-model="form.city" :class="['form-input text-sm', isInvalid('city') && 'is-invalid']" placeholder="City"/></div>
                  <div><label class="form-label">State *</label><input v-model="form.state" class="form-input text-sm" placeholder="State"/></div>
                  <div>
                    <label class="form-label">PIN *</label>
                    <input v-model="form.pincode" :class="['form-input text-sm', isInvalid('pincode') && 'is-invalid']" placeholder="639001" maxlength="6" @input="onPincodeInput"/>
                  </div>
                </div>
                <div v-if="locationStatus" class="text-[10px] sm:text-xs text-gray-400">{{ locationStatus }}</div>
                <div v-if="pinResult" :class="['text-xs font-medium rounded-lg px-3 py-2', pinResult.lookupError ? 'bg-amber-50 text-amber-700' : pinResult.serviceable ? 'bg-green/5 text-green' : 'bg-red-50 text-red-500']">
                  {{ pinResult.lookupError ? pinResult.message : pinResult.serviceable ? `✅ ${pinResult.city} · ₹${pinResult.deliveryFee} delivery · ${pinResult.estimatedDays}` : `❌ ${pinResult.message || 'Not serviceable. Try Farm Pickup.'}` }}
                </div>
                <div v-if="detectedAddress" class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <p class="font-semibold">Confirm detected address before using it</p>
                  <p class="mt-1">{{ detectedAddress.city || 'City unavailable' }}, {{ detectedAddress.state || 'State unavailable' }} · {{ detectedAddress.pincode }}</p>
                  <div class="mt-2 flex gap-3">
                    <button type="button" @click="confirmDetectedAddress" class="font-semibold underline">Use this address</button>
                    <button type="button" @click="detectedAddress = null; locationStatus = 'Enter your address and PIN manually.'" class="underline">Dismiss</button>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button type="button" @click="useMyLocation" class="text-xs text-green font-medium hover:underline">📍 Detect my location</button>
                </div>
                <div><label class="form-label">Preferred Delivery Date</label><input v-model="form.preferredDate" type="date" :min="minDate" class="form-input text-sm"/></div>
              </div>

              <!-- Farm Pickup Form -->
              <div v-if="deliveryType==='pickup'" class="mt-5 space-y-3 sm:space-y-4">
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                  <div><label class="form-label">Full Name *</label><input v-model="form.name" :class="['form-input text-sm', isInvalid('name') && 'is-invalid']" placeholder="Your name"/></div>
                  <div><label class="form-label">Phone *</label><input v-model="form.phone" :class="['form-input text-sm', isInvalid('phone') && 'is-invalid']" placeholder="9876543210" maxlength="10"/></div>
                </div>
                <div><label class="form-label">Pickup Date *</label><input v-model="form.pickupDate" type="date" :min="tomorrowDate" :class="['form-input text-sm', isInvalid('pickupDate') && 'is-invalid']"/></div>
                <div class="bg-gray-50 rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-gray-600 space-y-1.5">
                  <div class="font-semibold text-gray-800">📍 Farm Location</div>
                  <div>7/72 Manjanayakkanpatti Pirivu, Esanatham Main Road, Paganatham, Karur — 639118</div>
                  <div>🕐 {{ pickupHours }} · 📞 +91 9943996614</div>
                  <a href="https://maps.app.goo.gl/pD5kpNbr5AteYKMYA" target="_blank" class="inline-block text-green font-medium text-xs hover:underline">🗺️ Get Directions →</a>
                </div>
              </div>
            </div>

            <!-- PACKAGING & NOTES -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h3 class="font-semibold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2.5">
                <span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                Packaging & Notes
              </h3>
              <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
                <button @click="packaging='standard'" :class="['rounded-xl border-2 p-3 text-left transition-all', packaging==='standard' ? 'border-green bg-green/5' : 'border-gray-200']">
                  <div class="font-semibold text-xs sm:text-sm">📦 Standard</div>
                  <div class="text-[10px] sm:text-xs text-gray-500">Free</div>
                </button>
                <button @click="packaging='gift'" :class="['rounded-xl border-2 p-3 text-left transition-all', packaging==='gift' ? 'border-green bg-green/5' : 'border-gray-200']">
                  <div class="font-semibold text-xs sm:text-sm">🎁 Gift Box</div>
                  <div class="text-[10px] sm:text-xs text-gray-500">+₹50 · Premium</div>
                </button>
              </div>
              <div v-if="packaging==='gift'" class="mb-4">
                <input v-model="giftMessage" class="form-input text-sm" placeholder="Gift message (optional)" maxlength="100"/>
              </div>
              <textarea v-model="orderNotes" class="form-input text-sm resize-none h-16 sm:h-20" placeholder="Order notes (optional): e.g. Call before delivery"></textarea>
            </div>

            <!-- PAYMENT -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
              <h3 class="font-semibold text-base sm:text-lg text-gray-900 mb-4 flex items-center gap-2.5">
                <span class="w-7 h-7 bg-green text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                Payment Method
              </h3>
              <div class="space-y-2 sm:space-y-3">
                <!-- Pay at farm (only for pickup) -->
                <label v-if="deliveryType==='pickup'" :class="['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', payMethod==='pay-at-farm' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                  <input type="radio" v-model="payMethod" value="pay-at-farm" class="accent-green w-4 h-4 shrink-0"/>
                  <div class="flex-1">
                    <div class="font-semibold text-xs sm:text-sm">💵 Pay at Farm</div>
                    <div class="text-[10px] sm:text-xs text-gray-500">Cash or UPI when you collect</div>
                  </div>
                  <span class="text-[9px] font-bold bg-green/10 text-green px-2 py-0.5 rounded shrink-0">₹0 FEE</span>
                </label>
                <!-- UPI (Razorpay) - recommended -->
                <label :class="['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', payMethod==='razorpay-upi' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                  <input type="radio" v-model="payMethod" value="razorpay-upi" class="accent-green w-4 h-4 shrink-0"/>
                  <div class="flex-1">
                    <div class="font-semibold text-xs sm:text-sm flex items-center gap-2">📱 UPI <span class="text-[8px] bg-green text-white px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span></div>
                    <div class="text-[10px] sm:text-xs text-gray-500">GPay, PhonePe, Paytm, BHIM</div>
                  </div>
                  <span class="text-[9px] font-bold bg-green/10 text-green px-2 py-0.5 rounded shrink-0">₹0 FEE</span>
                </label>
                <!-- Card -->
                <label :class="['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', payMethod==='razorpay-card' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                  <input type="radio" v-model="payMethod" value="razorpay-card" class="accent-green w-4 h-4 shrink-0"/>
                  <div class="flex-1">
                    <div class="font-semibold text-xs sm:text-sm">💳 Credit / Debit Card</div>
                    <div class="text-[10px] sm:text-xs text-gray-500">Visa, Mastercard, RuPay</div>
                  </div>
                </label>
                <!-- Net Banking -->
                <label :class="['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', payMethod==='razorpay-nb' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                  <input type="radio" v-model="payMethod" value="razorpay-nb" class="accent-green w-4 h-4 shrink-0"/>
                  <div class="flex-1">
                    <div class="font-semibold text-xs sm:text-sm">🏦 Net Banking</div>
                    <div class="text-[10px] sm:text-xs text-gray-500">All major banks supported</div>
                  </div>
                </label>
                <label v-if="directUpiAvailable" :class="['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all', payMethod==='direct-upi' ? 'border-green bg-green/5' : 'border-gray-200 hover:border-gray-300']">
                  <input type="radio" v-model="payMethod" value="direct-upi" class="accent-green w-4 h-4 shrink-0"/>
                  <div class="flex-1">
                    <div class="font-semibold text-xs sm:text-sm">🏦 Direct UPI to Farm</div>
                    <div class="text-[10px] sm:text-xs text-gray-500 mt-0.5">For orders above ₹2,000 · Admin verifies your UTR</div>
                  </div>
                  <span class="text-[9px] font-bold bg-green/10 text-green px-2 py-0.5 rounded shrink-0">0% FEE</span>
                </label>
              </div>
              <p v-if="payMethod==='direct-upi'" class="mt-3 rounded-lg bg-green/5 px-3 py-2 text-xs text-green">After placing the order, pay using the farm UPI ID and submit the transaction reference for verification.</p>
              <!-- Payment Security -->
              <div class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[10px] sm:text-xs text-gray-400">
                <span>🔒</span>
                <span>Payments are 100% secure. Powered by Razorpay. Your card details are never stored.</span>
              </div>
            </div>

            <!-- Note -->
            <div class="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 text-[10px] sm:text-xs text-amber-700 space-y-1">
              <div class="font-semibold text-xs">⚠️ Before you order:</div>
              <div>• Orders cannot be cancelled once placed</div>
              <div>• No returns — fresh perishable produce</div>
              <div>• Delivered within 1-3 days</div>
            </div>
          </div>

          <!-- ═══ RIGHT: SUMMARY (2 cols) ═══ -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 lg:sticky lg:top-24 space-y-4">
              <h3 class="font-semibold text-base sm:text-lg text-gray-900">Order Summary</h3>

              <!-- Items -->
              <div class="space-y-3 max-h-48 overflow-y-auto">
                <div v-for="item in cart.items" :key="item.productId+item.variantId" class="flex items-center gap-3">
                  <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                    <img v-if="item.product.images?.[0]" :src="item.product.images[0].url" class="w-full h-full object-cover"/>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-xs sm:text-sm font-medium text-gray-800 truncate">{{ item.product.name }}</div>
                    <div class="text-[10px] sm:text-xs text-gray-400">{{ item.variant.weight }} × {{ item.qty }}</div>
                  </div>
                  <span class="text-xs sm:text-sm font-semibold text-gray-700 shrink-0">₹{{ item.variant.price * item.qty }}</span>
                </div>
              </div>

              <!-- Coupon -->
              <div class="border-t border-gray-100 pt-3">
                <div class="flex gap-2">
                  <input v-model="couponCode" placeholder="Coupon code" class="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-green min-w-0" @keyup.enter="applyCoupon"/>
                  <button @click="applyCoupon" :disabled="applyingCoupon" class="bg-green text-white text-[10px] sm:text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg hover:bg-green-mid transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1.5">
                    <span v-if="applyingCoupon" class="spinner"></span>Apply
                  </button>
                </div>
                <button v-if="couponDiscount || deliveryCouponApplied" @click="removeCoupon" class="text-[10px] text-red-500 font-semibold mt-1.5">✕ Remove</button>
                <div v-if="couponMsg" :class="['text-[10px] sm:text-xs px-3 py-1.5 rounded-lg font-medium mt-2', couponMsg.ok ? 'bg-green/5 text-green' : 'bg-red-50 text-red-600']">{{ couponMsg.text }}</div>
              </div>

              <!-- Totals -->
              <div class="space-y-2 text-xs sm:text-sm border-t border-gray-100 pt-3">
                <div class="flex justify-between text-gray-500"><span>Subtotal ({{ cart.count }} items)</span><span class="text-gray-700">₹{{ cart.subtotal }}</span></div>
                <div v-if="couponTotalDiscount" class="flex justify-between text-green font-medium"><span>Discount</span><span>−₹{{ couponTotalDiscount }}</span></div>
                <div v-if="packaging==='gift'" class="flex justify-between text-gray-500"><span>Gift Packing</span><span>₹50</span></div>
                <div class="flex justify-between text-gray-500"><span>Delivery</span><span class="text-gray-700">{{ deliveryType==='pickup' ? 'FREE' : (pinResult?.serviceable ? (deliveryAmountDue ? `₹${deliveryAmountDue}` : 'FREE') : '—') }}</span></div>
              </div>
              <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                <span class="font-bold text-sm sm:text-base text-gray-900">Total</span>
                <span class="font-bold text-xl sm:text-2xl text-green">₹{{ orderTotal }}</span>
              </div>

              <!-- Place Order -->
              <button @click="placeOrder" :disabled="placingOrder || paymentSessionOpen || !canPlaceOrder"
                class="w-full bg-green text-white font-semibold py-3.5 sm:py-4 rounded-xl text-sm hover:bg-green-mid transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-green/20 active:scale-[0.98] flex items-center justify-center gap-2">
                <span v-if="placingOrder" class="spinner"></span>{{ placingOrder ? 'Processing…' : `Place Order — ₹${orderTotal}` }}
              </button>
              <p v-if="orderError" class="text-red-500 text-[10px] sm:text-xs text-center font-medium">{{ orderError }}</p>

              <!-- Trust -->
              <div class="flex items-center justify-center gap-3 sm:gap-4 pt-2 text-[10px] sm:text-[11px] text-gray-400">
                <span class="flex items-center gap-1">🔒 Secure</span>
                <span class="flex items-center gap-1">🌿 Fresh</span>
                <span class="flex items-center gap-1">🚚 1-3 days</span>
              </div>
            </div>
          </div>
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
import { useCartStore, useAuthStore, useToastStore, usePincodeStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const router    = useRouter()
const cart      = useCartStore()
const auth      = useAuthStore()
const toast     = useToastStore()
const pincodeStore = usePincodeStore()

const deliveryType   = ref('home')
const packaging      = ref('standard')
const giftMessage    = ref('')
const orderNotes     = ref('')
const payMethod      = ref('razorpay-upi')
const couponCode     = ref('')
const couponDiscount = ref(0)
const deliveryCouponApplied = ref(false)
const deliveryCouponLimit = ref(0)
const couponMsg      = ref(null)
const applyingCoupon = ref(false)
const pinResult      = ref(null)
const locationStatus = ref('')
const detectedAddress = ref(null)
const placingOrder   = ref(false)
const paymentSessionOpen = ref(false)
const orderError     = ref('')
const paymentIdempotencyKey = ref('')
const orderRequestKey = ref(sessionStorage.getItem('nm_order_request_key') || '')
const submitAttempted = ref(false)
const businessHours = ref([])
const directUpiEnabled = ref(false)

const form = ref({ name: auth.user?.name||'', phone: auth.user?.phone||'', email: auth.user?.email||'', line1:'', line2:'', city:'', state:'', pincode:'', preferredDate:'', pickupDate:'' })

const minDate      = computed(() => { const d = new Date(); d.setDate(d.getDate()+2); return d.toISOString().split('T')[0] })
const tomorrowDate = computed(() => { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] })
const pickupHours = computed(() => {
  const openDays = businessHours.value.filter(day => day.isOpen)
  if (!openDays.length) return 'Farm pickup is currently closed'
  const formatTime = (value) => {
    const [hours, minutes] = String(value || '').split(':').map(Number)
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value || ''
    return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  }
  const schedule = openDays.map(day => {
    const label = day.day[0].toUpperCase() + day.day.slice(1, 3)
    return `${label} ${formatTime(day.pickupOpenTime)}-${formatTime(day.pickupCloseTime)}`
  })
  return schedule.join(' · ')
})

const deliveryFee = computed(() => {
  if (deliveryType.value === 'pickup') return 0
  if (!pinResult.value?.serviceable) return 0
  if (cart.freeDeliveryMin > 0 && cart.subtotal >= cart.freeDeliveryMin) return 0
  return pinResult.value.deliveryFee
})

const deliveryAmountDue = computed(() =>
  Math.max(0, deliveryFee.value - (deliveryCouponApplied.value ? Math.min(deliveryFee.value, deliveryCouponLimit.value) : 0))
)
const couponTotalDiscount = computed(() => couponDiscount.value + (deliveryCouponApplied.value ? Math.min(deliveryFee.value, deliveryCouponLimit.value) : 0))

const orderTotal = computed(() => {
  let t = cart.subtotal - couponDiscount.value + deliveryAmountDue.value
  if (packaging.value === 'gift') t += 50
  return Math.max(0, t)
})
const directUpiAvailable = computed(() => directUpiEnabled.value && cart.subtotal > 2000)
const canPlaceOrder = computed(() => cart.minMet && (deliveryType.value === 'pickup' || pinResult.value?.serviceable))

let pincodeTimer
const onPincodeInput = () => {
  clearTimeout(pincodeTimer)
  const code = String(form.value.pincode || '').replace(/\D/g, '')
  form.value.pincode = code
  if (code.length === 6) {
    pincodeTimer = setTimeout(checkPin, 250)
  }
}

const useMyLocation = async () => {
  if (!navigator.geolocation) {
    locationStatus.value = 'Geolocation is not supported by your browser.'
    return
  }

  locationStatus.value = 'Detecting location…'
  pinResult.value = null
  detectedAddress.value = null

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
            !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          locationStatus.value = 'Your browser returned invalid coordinates. Please enter your PIN manually.'
          return
        }
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`
        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'MagiliniFarms/1.0'
          },
          signal: AbortSignal.timeout(10000)
        })
        if (!response.ok) throw new Error('Reverse geocoding service returned an error.')
        const data = await response.json()
        const address = data.address || {}
        const pincode = String(address.postcode || '').trim()
        const city = address.city || address.town || address.village || address.county || ''
        const state = address.state || ''

        if (!/^[1-9][0-9]{5}$/.test(pincode)) {
          locationStatus.value = 'Unable to determine a valid 6-digit pincode from your location.'
          return
        }

        detectedAddress.value = { pincode, city, state }
        locationStatus.value = ''
      } catch {
        locationStatus.value = 'Could not resolve your address. Please enter pincode manually.'
      }
    },
    (error) => {
      locationStatus.value = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Please enter your PIN manually.'
        : error.code === error.TIMEOUT
          ? 'Location detection timed out. Please enter your PIN manually.'
          : 'Your location is unavailable. Please enter your PIN manually.'
    },
    { enableHighAccuracy: true, timeout: 20000 }
  )
}

const confirmDetectedAddress = async () => {
  if (!detectedAddress.value) return
  form.value.pincode = detectedAddress.value.pincode
  if (detectedAddress.value.city) form.value.city = detectedAddress.value.city
  if (detectedAddress.value.state) form.value.state = detectedAddress.value.state
  locationStatus.value = `Using ${detectedAddress.value.city || 'detected location'}, ${detectedAddress.value.state || ''}`.trim()
  detectedAddress.value = null
  await checkPin()
}

const checkPin = async () => {
  if (!/^[1-9][0-9]{5}$/.test(form.value.pincode || '')) {
    pinResult.value = { serviceable: false, lookupError: true, message: 'Enter a valid 6-digit Indian PIN code.' }
    return
  }
  const data = await pincodeStore.check(form.value.pincode)
  pinResult.value = data
  if (!data?.lookupError && !data?.serviceable) deliveryType.value = 'pickup'
}

const applyCoupon = async () => {
  if (!couponCode.value.trim()) { couponMsg.value = { ok: false, text: 'Please enter a coupon code.' }; toast.error('Please enter a coupon code.'); return }
  couponMsg.value = null
  applyingCoupon.value = true
  try {
    const { data } = await api.post('/coupons/apply', { code: couponCode.value, subtotal: cart.subtotal })
    if (data.couponType === 'delivery') {
      couponDiscount.value = 0
      deliveryCouponApplied.value = true
      deliveryCouponLimit.value = Number(data.deliveryDiscountLimit) || 0
      couponMsg.value = { ok: true, text: `🚚 ${data.description} — applied!` }
    } else {
      deliveryCouponApplied.value = false
      deliveryCouponLimit.value = 0
      couponDiscount.value = data.discount
      couponMsg.value = { ok: true, text: `🎉 ${data.description} — you save ₹${data.discount}!` }
    }
    toast.success(couponMsg.value.text)
  } catch (err) {
    couponDiscount.value = 0
    deliveryCouponApplied.value = false
    deliveryCouponLimit.value = 0
    const message = err.response?.data?.message || 'Something went wrong.'
    couponMsg.value = { ok: false, text: message }
    toast.error(message)
  } finally {
    applyingCoupon.value = false
  }
}

const removeCoupon = () => {
  couponCode.value = ''
  couponDiscount.value = 0
  deliveryCouponApplied.value = false
  deliveryCouponLimit.value = 0
  couponMsg.value = null
}


const placeOrder = async () => {
  orderError.value = ''
  submitAttempted.value = true

  // Validations
  if (!form.value.name?.trim()) { orderError.value = 'Please enter your full name.'; toast.error(orderError.value); return }
  if (!form.value.phone?.trim() || form.value.phone.length !== 10) { orderError.value = 'Please enter a valid 10-digit phone number.'; toast.error(orderError.value); return }
  if (!cart.minMet) { orderError.value = `Minimum order is ${cart.minimumOrderKg}kg. You have ${cart.totalKg.toFixed(1)}kg.`; toast.error(orderError.value); return }

  if (deliveryType.value === 'home') {
    if (!form.value.line1?.trim()) { orderError.value = 'Please enter your delivery address.'; toast.error(orderError.value); return }
    if (!form.value.city?.trim()) { orderError.value = 'Please enter your city.'; toast.error(orderError.value); return }
    if (!/^[1-9][0-9]{5}$/.test(form.value.pincode || '')) { orderError.value = 'Please enter a valid 6-digit Indian PIN code.'; toast.error(orderError.value); return }
    if (!pinResult.value?.serviceable) { orderError.value = 'We don\'t deliver to this PIN code. Please check or choose Farm Pickup.'; toast.error(orderError.value); return }
  }

  if (deliveryType.value === 'pickup' && !form.value.pickupDate) { orderError.value = 'Please select a pickup date.'; toast.error(orderError.value); return }
  if (!payMethod.value) { orderError.value = 'Please select a payment method.'; toast.error(orderError.value); return }

  placingOrder.value = true
  try {
    const payload = {
      deliveryType: deliveryType.value,
      items: cart.cartForCheckout,
      packaging: packaging.value,
      giftMessage: giftMessage.value || undefined,
      orderNotes: orderNotes.value || undefined,
      paymentMethod: payMethod.value,
      couponCode: couponCode.value || undefined,
    }
    if (deliveryType.value === 'home') {
      payload.deliveryAddress = {
        fullName: form.value.name.trim(),
        phone: form.value.phone.trim(),
        line1: form.value.line1,
        line2: form.value.line2,
        city: form.value.city,
        state: form.value.state,
        pincode: form.value.pincode
      }
      payload.preferredDeliveryDate = form.value.preferredDate || undefined
    } else {
      payload.pickupDate = form.value.pickupDate
    }

    if (!orderRequestKey.value) {
      orderRequestKey.value = globalThis.crypto?.randomUUID?.() || `order-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('nm_order_request_key', orderRequestKey.value)
    }
    const { data } = await api.post('/orders', payload, { headers: { 'Idempotency-Key': orderRequestKey.value } })
    const order = data.order
    sessionStorage.removeItem('nm_order_request_key')
    orderRequestKey.value = ''

    if (payMethod.value === 'pay-at-farm') {
      // No online payment needed — order confirmed
      cart.clear()
      toast.success('Order placed! Pay when you collect.')
      router.push({ name: 'CheckoutSuccess', query: { order: order.orderNumber } })
    } else if (payMethod.value === 'direct-upi') {
      cart.clear()
      toast.success('Order placed. Complete your Direct UPI payment to confirm it.')
      router.push({ name: 'CheckoutSuccess', query: { order: order.orderNumber, orderId: order._id, payment: 'direct-upi' } })
    } else {
      // All Razorpay methods (UPI, Card, Net Banking)
      paymentSessionOpen.value = true
      await handleRazorpay(order)
    }
  } catch (err) {
    orderError.value = err.response?.data?.message || 'Failed to place order. Please try again.'
    toast.error(orderError.value)
  } finally { placingOrder.value = false }
}

const isInvalid = (field) => {
  if (!submitAttempted.value) return false
  if (field === 'name') return !form.value.name?.trim()
  if (field === 'phone') return !form.value.phone?.trim() || form.value.phone.length !== 10
  if (field === 'line1') return deliveryType.value === 'home' && !form.value.line1?.trim()
  if (field === 'city') return deliveryType.value === 'home' && !form.value.city?.trim()
  if (field === 'pincode') return deliveryType.value === 'home' && !/^[1-9][0-9]{5}$/.test(form.value.pincode || '')
  if (field === 'pickupDate') return deliveryType.value === 'pickup' && !form.value.pickupDate
  return false
}

const handleRazorpay = async (order) => {
  try {
    if (!paymentIdempotencyKey.value) {
      paymentIdempotencyKey.value = globalThis.crypto?.randomUUID?.() || `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }
    const { data } = await api.post('/payment/create-order', { orderId: order._id }, {
      headers: { 'Idempotency-Key': paymentIdempotencyKey.value }
    })
    const options = {
      key:       data.keyId,
      amount:    data.amount,
      currency:  'INR',
      name:      'Magilini Farms',
      description: `Order ${order.orderNumber}`,
      order_id:  data.razorpayOrderId,
      prefill:   { name: form.value.name, contact: form.value.phone, email: form.value.email || undefined },
      theme:     { color: '#1B4D2E' },
      handler: async (response) => {
        try {
          await api.post('/payment/verify', { ...response, orderId: order._id })
          paymentIdempotencyKey.value = ''
          cart.clear()
          toast.success('Payment successful!')
          router.push({ name: 'CheckoutSuccess', query: { order: order.orderNumber } })
        } catch (err) {
          orderError.value = 'Payment received but verification failed. Contact us with your order number: ' + order.orderNumber
          toast.error('Payment verification issue. Please contact support.')
          router.push({ name: 'OrderDetail', params: { id: order._id } })
        }
      },
      modal: {
        ondismiss: () => {
          paymentIdempotencyKey.value = ''
          orderError.value = 'Payment was cancelled. Your order is saved — you can retry payment from My Orders.'
          toast.info('Payment cancelled. Order saved as pending.')
          router.push({ name: 'OrderDetail', params: { id: order._id } })
        }
      },
    }

    if (!window.Razorpay) {
      orderError.value = 'Payment gateway not loaded. Please refresh and try again.'
      return
    }
    new window.Razorpay(options).open()
  } catch (err) {
    orderError.value = err.response?.data?.message || 'Could not initiate payment. Please try again.'
    if (order?._id) router.push({ name: 'OrderDetail', params: { id: order._id } })
  }
}

onMounted(async () => {
  await cart.loadSettings()
  const defaultAddress = auth.user?.addresses?.find(a => a.isDefault) || auth.user?.addresses?.[0]
  if (defaultAddress) {
    form.value.name     = defaultAddress.fullName || form.value.name
    form.value.phone    = defaultAddress.phone || form.value.phone
    form.value.line1    = defaultAddress.line1
    form.value.line2    = defaultAddress.line2 || defaultAddress.landmark
    form.value.city     = defaultAddress.city
    form.value.state    = defaultAddress.state
    form.value.pincode  = defaultAddress.pincode
    if (form.value.pincode) await checkPin()
  }
  // Auto-fill pincode from global store
  if (pincodeStore.pincode && !form.value.pincode) {
    form.value.pincode = pincodeStore.pincode
    if (pincodeStore.result) {
      pinResult.value = pincodeStore.result
    } else {
      await checkPin()
    }
  }
  api.get('/business-hours').then(({ data }) => {
    businessHours.value = data.hours || []
  }).catch(() => {
    businessHours.value = []
  })
  api.get('/payment/options').then(({ data }) => {
    directUpiEnabled.value = Boolean(data.directUpi?.enabled)
  }).catch(() => {
    directUpiEnabled.value = false
  })
})

watch(deliveryType, (newType) => {
  if (newType === 'pickup') {
    payMethod.value = 'pay-at-farm'
  } else if (payMethod.value === 'pay-at-farm') {
    payMethod.value = 'razorpay-upi'
  }
})
</script>
