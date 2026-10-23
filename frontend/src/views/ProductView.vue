<template>
  <div>
    <AppNavbar/>
    <div class="mt-[60px] sm:mt-[68px]">
      <!-- Loading -->
      <div v-if="loading" class="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div class="grid lg:grid-cols-2 gap-10 lg:gap-16">
          <div class="aspect-square bg-gray-100 rounded-3xl animate-pulse"></div>
          <div class="space-y-5 py-8"><div class="h-4 bg-gray-100 rounded w-1/4 animate-pulse"></div><div class="h-10 bg-gray-100 rounded-xl w-3/4 animate-pulse"></div><div class="h-5 bg-gray-100 rounded w-1/2 animate-pulse"></div><div class="h-32 bg-gray-100 rounded-xl animate-pulse mt-4"></div></div>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else-if="!product" class="text-center py-24 px-4">
        <div class="text-6xl mb-5">😕</div>
        <h2 class="font-serif text-2xl mb-3">Product not found</h2>
        <router-link to="/shop" class="btn btn-primary">Browse Shop</router-link>
      </div>

      <div v-else>
        <!-- ═══ PRODUCT SECTION ═══ -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
          <!-- Breadcrumb -->
          <nav class="flex items-center gap-1.5 text-xs text-gray-400 py-4 overflow-x-auto">
            <router-link to="/" class="hover:text-green shrink-0">Home</router-link><span class="text-gray-300">/</span>
            <router-link to="/shop" class="hover:text-green shrink-0">Shop</router-link><span class="text-gray-300">/</span>
            <router-link v-if="product.category" :to="`/shop?category=${product.category.slug}`" class="hover:text-green shrink-0">{{ product.category.name }}</router-link>
            <span v-if="product.category" class="text-gray-300">/</span>
            <span class="text-gray-600 font-medium truncate">{{ product.name }}</span>
          </nav>

          <div class="grid lg:grid-cols-2 gap-8 lg:gap-16">
            <!-- ─── IMAGE GALLERY ─── -->
            <div class="lg:sticky lg:top-24 self-start">
              <div class="relative rounded-3xl overflow-hidden bg-white shadow-sm border border-gray-100 group cursor-zoom-in" @click="zoomedImage = activeImage">
                <div class="aspect-square">
                  <img v-if="activeImage" :src="activeImage" :alt="product.name" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"/>
                  <div v-else class="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-cream to-amber-50">{{ product.category?.emoji || '🥭' }}</div>
                </div>
                <!-- Arrows -->
                <button v-if="product.images?.length > 1" @click.stop="prevImage"
                  class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">‹</button>
                <button v-if="product.images?.length > 1" @click.stop="nextImage"
                  class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-700 hover:bg-white transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">›</button>
                <!-- Counter -->
                <div v-if="product.images?.length > 1" class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-[11px] px-3 py-1 rounded-full font-medium">
                  {{ currentImageIndex + 1 }}/{{ product.images.length }}
                </div>
                <!-- Discount Badge -->
                <div v-if="discountPct > 0" class="absolute top-4 right-4 bg-green text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">{{ discountPct }}% OFF</div>
                <!-- Seasonal Overlay -->
                <div v-if="product.seasonalStatus !== 'available'" class="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                  <span class="text-white font-bold text-xl">{{ product.seasonalStatus === 'off-season' ? 'Out of Season' : 'Coming Soon' }}</span>
                  <span v-if="product.seasonNote" class="text-white/70 text-sm mt-2">{{ product.seasonNote }}</span>
                </div>
              </div>
              <!-- Thumbnails -->
              <div v-if="product.images?.length > 1" class="flex gap-3 mt-4">
                <button v-for="(img, i) in product.images" :key="i" @click="activeImage = img.url; currentImageIndex = i"
                  :class="['w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 transition-all duration-200 border-2', activeImage===img.url ? 'border-green shadow-md scale-105' : 'border-transparent opacity-50 hover:opacity-100']">
                  <img :src="img.url" class="w-full h-full object-cover"/>
                </button>
              </div>
            </div>

            <!-- ─── PRODUCT INFO ─── -->
            <div class="py-0 lg:py-4">
              <!-- Category -->
              <p class="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">{{ product.category?.name }}</p>

              <!-- Name -->
              <h1 class="font-serif text-3xl sm:text-4xl lg:text-[42px] text-gray-900 leading-[1.15] mb-4">{{ product.name }}</h1>

              <!-- Tags -->
              <div v-if="product.tags?.length" class="flex flex-wrap gap-2 mb-4">
                <span v-for="tag in product.tags" :key="tag" class="text-[11px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">{{ tag }}</span>
              </div>

              <!-- Rating Row -->
              <div class="flex items-center gap-4 mb-6">
                <div class="flex items-center gap-1.5">
                  <div class="flex gap-0.5">
                    <span v-for="i in 5" :key="i" :class="['text-sm', i <= Math.round(reviewStats.avg || 0) ? 'text-mango' : 'text-gray-200']">★</span>
                  </div>
                  <span class="text-sm font-semibold text-gray-800">{{ reviewStats.avg?.toFixed(1) || '0.0' }}</span>
                </div>
                <a href="#reviews" class="text-xs text-gray-400 hover:text-green transition-colors">{{ reviewStats.count || 0 }} Reviews</a>
                <span class="text-gray-200">|</span>
                <span :class="['text-xs font-medium flex items-center gap-1.5', product.seasonalStatus === 'available' ? 'text-green' : 'text-gray-400']">
                  <span :class="['w-2 h-2 rounded-full', product.seasonalStatus === 'available' ? 'bg-green' : 'bg-gray-300']"></span>
                  {{ product.seasonalStatus === 'available' ? 'In Stock' : product.seasonalStatus === 'off-season' ? 'Off Season' : 'Coming Soon' }}
                </span>
              </div>

              <!-- Price Block -->
              <div class="bg-gradient-to-r from-gray-50 to-transparent rounded-2xl p-5 mb-6">
                <div class="flex items-baseline gap-3">
                  <span class="text-4xl font-bold text-gray-900">₹{{ selectedVariant?.price }}</span>
                  <span class="text-lg text-gray-400 line-through">₹{{ selectedVariant?.mrp }}</span>
                  <span class="text-sm font-bold text-green bg-green/10 px-2.5 py-1 rounded-lg">Save ₹{{ (selectedVariant?.mrp || 0) - (selectedVariant?.price || 0) }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-2">for {{ selectedVariant?.weight }} · Inclusive of all taxes</p>
              </div>

              <!-- Description -->
              <p class="text-[15px] text-gray-600 leading-relaxed mb-6">{{ product.description }}</p>

              <!-- Stock Urgency -->
              <div v-if="selectedVariant?.stock > 0 && selectedVariant.stock <= 20" class="flex items-center gap-2 mb-5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <span class="text-amber-600 text-sm">🔥</span>
                <span class="text-sm font-medium text-amber-700">Only <strong>{{ selectedVariant.stock }}</strong> left in stock</span>
              </div>

              <!-- Pack Size -->
              <div class="mb-6">
                <p class="text-sm font-semibold text-gray-900 mb-3">Select Size</p>
                <div class="flex flex-wrap gap-3">
                  <button v-for="v in product.variants" :key="v._id" @click="selectVariant(v)" :disabled="v.stock === 0"
                    :class="['px-5 py-3.5 rounded-xl border-2 transition-all text-left min-w-[120px]', selectedVariant?._id === v._id ? 'border-green bg-green/5 ring-2 ring-green/10' : 'border-gray-200 hover:border-gray-300 bg-white', v.stock === 0 ? 'opacity-30 cursor-not-allowed' : '']">
                    <div class="text-sm font-bold" :class="selectedVariant?._id === v._id ? 'text-green' : 'text-gray-800'">{{ v.weight }}</div>
                    <div class="text-xs mt-1" :class="selectedVariant?._id === v._id ? 'text-green/70' : 'text-gray-400'">
                      ₹{{ v.price }}
                      <span v-if="v.stock === 0" class="text-red-400 ml-1">· Sold out</span>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Qty + Actions -->
              <div v-if="product.seasonalStatus === 'available' && selectedVariant?.stock > 0" class="space-y-4 mb-8">
                <div class="flex items-center gap-4">
                  <div class="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                    <button @click="qty = Math.max(1, qty-1)" class="w-11 h-11 flex items-center justify-center hover:bg-gray-50 text-lg text-gray-600 transition-colors">−</button>
                    <span class="w-12 h-11 flex items-center justify-center font-bold text-sm border-x border-gray-200 bg-gray-50">{{ qty }}</span>
                    <button @click="qty = Math.min(selectedVariant?.stock || 1, qty+1)" :disabled="qty >= (selectedVariant?.stock || 1)" class="w-11 h-11 flex items-center justify-center hover:bg-gray-50 text-lg text-gray-600 disabled:opacity-30 transition-colors">+</button>
                  </div>
                  <div>
                    <div class="text-2xl font-bold text-gray-900">₹{{ (selectedVariant?.price || 0) * qty }}</div>
                    <p class="text-[10px] text-gray-400">Total</p>
                  </div>
                </div>

                <!-- CTA Buttons -->
                <div class="hidden sm:grid grid-cols-2 gap-3">
                  <button @click="handleAddToCart" class="border-2 border-green text-green hover:bg-green hover:text-white font-semibold py-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"/></svg>
                    Add to Cart
                  </button>
                  <button @click="handleBuyNow" class="bg-green hover:bg-green-mid text-white font-semibold py-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-green/20 active:scale-[0.98]">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    Buy Now
                  </button>
                </div>
                <a :href="waLink" target="_blank" class="hidden sm:flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:border-green hover:text-green transition-colors">
                  💬 Have questions? Chat on WhatsApp
                </a>
              </div>

              <!-- Notify Me Button (Off Season) -->
              <div v-else-if="product.seasonalStatus !== 'available' || selectedVariant?.stock === 0" class="mb-8">
                <button @click="notifyModal.open = true" class="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl text-sm hover:bg-gray-800 transition-colors">
                  📲 Notify When Available
                </button>
              </div>

              <!-- Delivery Check -->
              <div class="border border-gray-100 rounded-2xl p-5 mb-6">
                <p class="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Check Delivery
                </p>
                <div class="flex gap-2">
                  <input v-model="productPincodeInput" type="text" maxlength="6" placeholder="Enter PIN code"
                    class="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/10 transition-all min-w-0" @input="onProductPincodeInput" @keyup.enter="checkProductPincode"/>
                  <button @click="checkProductPincode" :disabled="productPincodeInput.length !== 6 || checkingPin" class="bg-gray-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl disabled:opacity-30 hover:bg-gray-800 transition-colors shrink-0 flex items-center gap-1.5">
                    <span v-if="checkingPin" class="spinner"></span>Check
                  </button>
                </div>
                <div v-if="productPinResult !== null" class="mt-3 text-sm font-medium flex items-center gap-2" :class="productPinResult.lookupError ? 'text-amber-700' : productPinResult.serviceable ? 'text-green' : 'text-red-500'">
                  <svg v-if="productPinResult.serviceable" class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  <svg v-else class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  {{ productPinResult.lookupError ? productPinResult.message : productPinResult.serviceable ? `Delivers to ${productPinResult.city} · ₹${productPinResult.deliveryFee} · ${productPinResult.estimatedDays}` : productPinResult.message || 'Not serviceable. Try another PIN.' }}
                </div>
              </div>

              <!-- Key Points -->
              <div v-if="product.keyPoints?.length" class="mb-6">
                <p class="text-sm font-semibold text-gray-900 mb-3">Why you'll love it</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div v-for="p in product.keyPoints" :key="p" class="flex items-center gap-2.5 bg-green/[0.03] rounded-lg px-3 py-2">
                    <svg class="w-4 h-4 text-green shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    <span class="text-sm text-gray-700">{{ p }}</span>
                  </div>
                </div>
              </div>

              <!-- Storage Tips -->
              <div v-if="product.storageTips" class="mb-6">
                <p class="text-sm font-semibold text-gray-900 mb-2">Storage Tips</p>
                <div class="bg-amber-50/70 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <span class="text-amber-500 mt-0.5">💡</span>
                  <p class="text-sm text-gray-700 leading-relaxed">{{ product.storageTips }}</p>
                </div>
              </div>

              <!-- Trust Signals -->
              <div class="grid grid-cols-4 gap-2 p-4 bg-gray-50 rounded-2xl">
                <div v-for="t in trustSignals" :key="t.label" class="flex flex-col items-center gap-1.5 py-2">
                  <span class="text-lg">{{ t.icon }}</span>
                  <span class="text-[9px] sm:text-[10px] text-gray-500 font-medium text-center leading-tight">{{ t.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ REVIEWS SECTION ═══ -->
        <div class="bg-gray-50 border-t border-gray-100" id="reviews">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div class="text-center mb-10">
              <h2 class="font-serif text-2xl sm:text-3xl text-gray-900 mb-2">Customer Reviews</h2>
              <p class="text-sm text-gray-400">Real feedback from our community</p>
            </div>

            <div class="grid lg:grid-cols-12 gap-8 lg:gap-10">
              <!-- Rating Summary -->
              <div class="lg:col-span-3">
                <div class="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm sticky top-24">
                  <div class="text-5xl font-bold text-gray-900 mb-2">{{ reviewStats.avg?.toFixed(1) || '0.0' }}</div>
                  <div class="flex justify-center gap-0.5 mb-2">
                    <span v-for="i in 5" :key="i" :class="['text-lg', i <= Math.round(reviewStats.avg || 0) ? 'text-mango' : 'text-gray-200']">★</span>
                  </div>
                  <p class="text-xs text-gray-400 mb-5">{{ reviewStats.count || 0 }} ratings</p>

                  <!-- Distribution -->
                  <div class="space-y-2">
                    <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center gap-2">
                      <span class="text-[11px] text-gray-500 w-3 text-right font-medium">{{ star }}</span>
                      <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                          :class="[star >= 4 ? 'bg-green' : star === 3 ? 'bg-amber-400' : 'bg-red-400']"
                          :style="{ width: ratingDistribution[star] + '%' }"></div>
                      </div>
                      <span class="text-[10px] text-gray-400 w-5 text-right">{{ ratingDistribution[star + '_count'] || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Reviews List -->
              <div class="lg:col-span-5">
                <div v-if="!productReviews.length" class="bg-white rounded-2xl border border-gray-100 p-10 text-center shadow-sm">
                  <div class="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">💬</div>
                  <h3 class="text-base font-semibold text-gray-700 mb-1">No reviews yet</h3>
                  <p class="text-sm text-gray-400">Be the first to share your experience!</p>
                </div>

                <div v-else class="space-y-4">
                  <div v-for="r in productReviews" :key="r._id" class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center text-sm font-bold text-green shrink-0">
                        {{ r.name?.[0]?.toUpperCase() || '?' }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-gray-900">{{ r.name }}</span>
                          <span v-if="r.isVerifiedPurchase" class="inline-flex items-center gap-0.5 text-[9px] font-bold text-green bg-green/10 px-1.5 py-0.5 rounded-full">
                            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                            Verified
                          </span>
                        </div>
                        <span class="text-[11px] text-gray-400">
                          <span v-if="r.location">{{ r.location }} · </span>{{ formatReviewDate(r.createdAt) }}
                        </span>
                      </div>
                    </div>
                    <div class="flex gap-0.5 mb-2">
                      <span v-for="i in 5" :key="i" :class="['text-sm', i <= r.rating ? 'text-mango' : 'text-gray-200']">★</span>
                    </div>
                    <p class="text-sm text-gray-700 leading-relaxed">{{ r.comment }}</p>
                    <div v-if="r.adminReply" class="mt-3 bg-green/[0.03] border-l-[3px] border-green rounded-r-lg p-3">
                      <p class="text-[10px] font-bold text-green uppercase tracking-wider mb-1">Magilini Farms</p>
                      <p class="text-xs text-gray-600">{{ r.adminReply }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Write Review Form -->
              <div class="lg:col-span-4">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-24">
                  <div class="bg-green/5 border-b border-green/10 px-6 py-4">
                    <h3 class="text-sm font-bold text-gray-900">Write a Review</h3>
                    <p class="text-[11px] text-gray-500 mt-0.5">Share your experience</p>
                  </div>
                  <div class="p-6 space-y-4">
                    <div>
                      <label class="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-2">Rating *</label>
                      <div class="flex gap-1.5">
                        <button v-for="i in 5" :key="i" @click="reviewForm.rating = i" @mouseenter="hoverRating = i" @mouseleave="hoverRating = 0"
                          :class="['text-2xl transition-transform duration-150', i <= (hoverRating || reviewForm.rating) ? 'text-mango scale-110' : 'text-gray-200 hover:text-mango/40']">★</button>
                      </div>
                      <p class="text-[10px] text-gray-400 mt-1">{{ ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewForm.rating] }}</p>
                    </div>
                    <div>
                      <label class="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Name *</label>
                      <input v-model="reviewForm.name" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/10 transition-all" placeholder="Your name"/>
                    </div>
                    <div>
                      <label class="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block mb-1.5">Location <span class="text-gray-300 normal-case">(optional)</span></label>
                      <input v-model="reviewForm.location" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/10 transition-all" placeholder="e.g. Chennai, Tamil Nadu"/>
                    </div>
                    <div>
                      <div class="flex justify-between mb-1.5">
                        <label class="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Review *</label>
                        <span :class="['text-[10px]', reviewForm.comment.length > 400 ? 'text-amber-500' : 'text-gray-300']">{{ reviewForm.comment.length }}/500</span>
                      </div>
                      <textarea v-model="reviewForm.comment" maxlength="500" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green focus:ring-2 focus:ring-green/10 transition-all resize-none h-24" placeholder="How was the quality and freshness?"></textarea>
                    </div>
                    <button @click="submitReview" :disabled="submittingReview"
                      class="w-full bg-green text-white text-sm font-semibold py-3 rounded-xl hover:bg-green-mid disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm shadow-green/20">
                      {{ submittingReview ? 'Submitting...' : 'Submit Review' }}
                    </button>
                    <p v-if="reviewSuccess" class="text-xs text-green font-medium text-center bg-green/5 rounded-lg py-2">{{ reviewSuccess }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Related Products -->
        <section v-if="related.length" class="bg-white py-12 sm:py-16 px-4 sm:px-6 border-t border-gray-100">
          <div class="max-w-7xl mx-auto">
            <div class="flex items-center justify-between mb-8">
              <h2 class="font-serif text-xl sm:text-2xl">You Might Also Like</h2>
              <router-link :to="`/shop?category=${product.category?.slug || ''}`" class="text-xs sm:text-sm text-green font-semibold hover:underline">View All →</router-link>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <ProductCard v-for="p in related" :key="p._id" :product="p"/>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- Mobile Sticky CTA -->
    <div v-if="product && product.seasonalStatus === 'available' && selectedVariant?.stock > 0" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30 sm:hidden safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div class="flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-xl font-bold text-gray-900 leading-none">₹{{ (selectedVariant?.price || 0) * qty }}</div>
          <div class="text-[10px] text-gray-400 mt-0.5">{{ selectedVariant?.weight }} × {{ qty }}</div>
        </div>
        <button @click="handleAddToCart" class="bg-white border-2 border-green text-green text-xs font-bold px-4 py-2.5 rounded-xl shrink-0 active:scale-95 transition-transform">Cart</button>
        <button @click="handleBuyNow" class="bg-green text-white text-xs font-bold px-6 py-2.5 rounded-xl shrink-0 shadow-md shadow-green/30 active:scale-95 transition-transform">Buy Now</button>
      </div>
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

    <!-- Zoom Modal -->
    <Teleport to="body">
      <div v-if="zoomedImage" class="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4" @click="zoomedImage = null">
        <button class="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/20 transition-colors z-10">✕</button>
        <button v-if="product?.images?.length > 1" @click.stop="prevImage" class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/20">‹</button>
        <button v-if="product?.images?.length > 1" @click.stop="nextImage" class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white text-xl hover:bg-white/20">›</button>
        <img :src="activeImage" class="max-w-full max-h-[85vh] object-contain" @click.stop/>
      </div>
    </Teleport>

    <AppFooter/>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import ProductCard from '@/components/shop/ProductCard.vue'
import { useCartStore, useToastStore, useProductStore, usePincodeStore } from '@/stores/index.js'
import api from '@/lib/api.js'

const route = useRoute()
const router = useRouter()
const cart  = useCartStore()
const toast = useToastStore()
const productStore = useProductStore()
const pincodeStore = usePincodeStore()

const product = ref(null)
const loading = ref(true)
const related = ref([])
const selectedVariant = ref(null)
const qty = ref(1)
const productPincodeInput = ref(pincodeStore.pincode || '')
const productPinResult = ref(pincodeStore.result)
const activeImage = ref(null)
const currentImageIndex = ref(0)
const zoomedImage = ref(null)
const productReviews = ref([])
const reviewStats = ref({ avg: 0, count: 0 })
const submittingReview = ref(false)
const reviewSuccess = ref('')
const reviewForm = reactive({ name: '', location: '', rating: 5, comment: '' })
const hoverRating = ref(0)

const ratingDistribution = computed(() => {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '1_count': 0, '2_count': 0, '3_count': 0, '4_count': 0, '5_count': 0 }
  const reviews = productReviews.value
  if (!reviews.length) return dist
  reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating + '_count']++ })
  for (let i = 1; i <= 5; i++) dist[i] = Math.round((dist[i + '_count'] / reviews.length) * 100)
  return dist
})

const trustSignals = computed(() => [
  { icon: '🌿', label: 'No Carbide' },
  { icon: '🚚', label: cart.freeDeliveryMin > 0 ? `Free above ₹${cart.freeDeliveryMin}` : 'Delivery calculated at checkout' },
  { icon: '📦', label: '24hr Dispatch' },
  { icon: '🔒', label: 'Secure Pay' },
])

const discountPct = computed(() => {
  const v = selectedVariant.value
  if (!v) return 0
  return Math.round((v.mrp - v.price) / v.mrp * 100)
})

const waLink = computed(() => {
  if (!product.value || !selectedVariant.value) return 'https://wa.me/919943996614'
  const msg = `Hi! I want to order ${product.value.name} (${selectedVariant.value.weight} × ${qty.value}). Please confirm.`
  return `https://wa.me/919943996614?text=${encodeURIComponent(msg)}`
})

const prevImage = () => {
  if (!product.value?.images?.length) return
  currentImageIndex.value = (currentImageIndex.value - 1 + product.value.images.length) % product.value.images.length
  activeImage.value = product.value.images[currentImageIndex.value].url
}

const nextImage = () => {
  if (!product.value?.images?.length) return
  currentImageIndex.value = (currentImageIndex.value + 1) % product.value.images.length
  activeImage.value = product.value.images[currentImageIndex.value].url
}

const selectVariant = (v) => { if (v.stock > 0) selectedVariant.value = v }

const handleAddToCart = () => {
  if (!selectedVariant.value) return
  qty.value = Math.min(qty.value, selectedVariant.value.stock)
  cart.addItem(product.value, selectedVariant.value, qty.value)
  toast.success(`${product.value.name} added to cart!`)
}

const handleBuyNow = () => {
  if (!selectedVariant.value) return
  qty.value = Math.min(qty.value, selectedVariant.value.stock)
  cart.addItem(product.value, selectedVariant.value, qty.value)
  router.push('/checkout')
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
    toast.error(notifyModal.error)
    return
  }
  notifyModal.loading = true
  try {
    await api.post('/notify-me', { phone, productId: product.value._id })
    localStorage.setItem('notify_phone', phone)
    notifyModal.success = true
    toast.success('We\'ll notify you when this is back in stock!')
  } catch (err) {
    notifyModal.error = err.response?.data?.message || 'Something went wrong. Please try again.'
    toast.error(notifyModal.error)
  } finally {
    notifyModal.loading = false
  }
}

const checkingPin = ref(false)
const onProductPincodeInput = () => {
  const clean = String(productPincodeInput.value || '').replace(/\D/g, '')
  productPincodeInput.value = clean
  if (clean.length === 6) {
    clearTimeout(loadProductTimer)
    loadProductTimer = setTimeout(checkProductPincode, 250)
  }
}

const checkProductPincode = async () => {
  if (productPincodeInput.value.length !== 6) return
  checkingPin.value = true
  try {
    const data = await pincodeStore.check(productPincodeInput.value)
    productPinResult.value = data
  } finally {
    checkingPin.value = false
  }
}

const loadReviews = async () => {
  if (!product.value) return
  try {
    const { data } = await api.get(`/products/${product.value.slug}/reviews`)
    productReviews.value = data.reviews || []
    reviewStats.value = data.stats || { avg: 0, count: 0 }
  } catch {
    productReviews.value = []
  }
}

const submitReview = async () => {
  if (!reviewForm.name || !reviewForm.comment || !reviewForm.rating) {
    toast.error('Please fill name, rating and comment.')
    return
  }
  submittingReview.value = true
  reviewSuccess.value = ''
  try {
    await api.post(`/products/${product.value.slug}/reviews`, {
      name: reviewForm.name,
      location: reviewForm.location,
      rating: reviewForm.rating,
      comment: reviewForm.comment
    })
    reviewSuccess.value = 'Thank you! Your review has been submitted.'
    reviewForm.name = ''
    reviewForm.location = ''
    reviewForm.rating = 5
    reviewForm.comment = ''
    await loadReviews()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to submit review.')
  } finally {
    submittingReview.value = false
  }
}

const formatReviewDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  const diff = Math.floor((now - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return `${diff} days ago`
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

let loadProductTimer

const loadProduct = async () => {
  loading.value = true
  try {
    const p = await productStore.fetchProduct(route.params.slug)
    product.value = p
    activeImage.value = p.images?.[0]?.url || null
    currentImageIndex.value = 0
    selectedVariant.value = p.variants?.find(v => v.stock > 0) || p.variants?.[0]
    qty.value = 1
    const { data } = await api.get('/products', { params: { category: p.category?.slug, limit: 5 } })
    related.value = data.products.filter(r => r._id !== p._id).slice(0, 4)
    await loadReviews()
  } catch { product.value = null }
  finally { loading.value = false }
}

onMounted(() => {
  loadProduct()
  cart.loadSettings()
})
watch(() => route.params.slug, loadProduct)
watch(selectedVariant, (v) => {
  if (!v) return
  qty.value = Math.min(Math.max(1, qty.value), v.stock || 1)
})
</script>

<style scoped>
.safe-bottom { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
</style>
