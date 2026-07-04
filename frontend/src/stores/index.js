import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api.js'

// ── AUTH STORE ────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const user              = ref(null)
  const loading           = ref(false)
  const verificationToken = ref(null)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin    = computed(() => user.value?.role === 'admin')
  const isCustomer = computed(() => user.value?.role === 'customer')

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.user
    } catch {
      user.value = null
      verificationToken.value = null
    }
  }

  const sendOtp = async (phone) => {
    loading.value = true
    try {
      const normalizedPhone = String(phone || '').trim()
      const { data } = await api.post('/auth/send-otp', { phone: normalizedPhone })
      if (import.meta.env.DEV && data.otp) {
        console.log(`OTP for ${normalizedPhone}: ${data.otp}`)
      }
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to send OTP.' }
    } finally { loading.value = false }
  }

  const verifyOtp = async (phone, otp, name, email) => {
    loading.value = true
    try {
      const payload = { phone, otp }
      if (name)  payload.name  = name
      if (email) payload.email = email
      const { data } = await api.post('/auth/verify-otp', payload)
      if (data.user) user.value = data.user
      if (data.otp_ticket) verificationToken.value = data.otp_ticket
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid OTP.' }
    } finally { loading.value = false }
  }

  const clearDevOtpRecords = async () => {
    try {
      const { data } = await api.post('/auth/dev/clear-otp')
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to clear development OTP records.' }
    }
  }

  const completeProfile = async (profileData) => {
    try {
      const options = verificationToken.value
        ? { headers: { Authorization: `Bearer ${verificationToken.value}` } }
        : undefined

      const { data } = await api.post('/auth/complete-profile', profileData, options)
      user.value = data.user
      verificationToken.value = null
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to update profile.' }
    }
  }

  const adminLogin = async (email, password) => {
    loading.value = true
    try {
      const { data } = await api.post('/auth/admin-login', { email, password })
      user.value = data.user
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid credentials.' }
    } finally { loading.value = false }
  }

  const logout = async (skipServer = false) => {
    if (!skipServer) {
      try { await api.post('/auth/logout') } catch { /* ignore */ }
    }
    user.value = null
  }

  return {
    user,
    loading,
    isLoggedIn,
    isAdmin,
    isCustomer,
    fetchMe,
    sendOtp,
    verifyOtp,
    clearDevOtpRecords,
    completeProfile,
    adminLogin,
    logout
  }
})

// ── CART STORE ────────────────────────────────────────────
export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  const count    = computed(() => items.value.reduce((s, i) => s + i.qty, 0))
  const totalKg  = computed(() => items.value.reduce((s, i) => s + parseFloat(i.variant.weight) * i.qty, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.variant.price * i.qty, 0))
  const minMet   = computed(() => totalKg.value >= 3)

  const addItem = (product, variant, qty = 1) => {
    const existing = items.value.find(i => i.productId === product._id && i.variantId === variant._id)
    const maxStock = Math.max(0, Number(variant.stock || 0))
    if (maxStock === 0) return

    if (existing) {
      existing.qty = Math.min(maxStock, existing.qty + qty)
    }
    else items.value.push({
      productId: product._id,
      variantId: variant._id,
      product: { _id: product._id, name: product.name, images: product.images, slug: product.slug },
      variant,
      qty: Math.min(qty, maxStock)
    })
    saveCart()
  }

  const updateQty = (productId, variantId, qty) => {
    if (qty <= 0) { removeItem(productId, variantId); return }
    const item = items.value.find(i => i.productId === productId && i.variantId === variantId)
    if (item) {
      const maxStock = Math.max(0, Number(item.variant?.stock || 0))
      if (maxStock === 0) {
        removeItem(productId, variantId)
        return
      }
      item.qty = Math.min(qty, maxStock)
      saveCart()
    }
  }

  const removeItem = (productId, variantId) => {
    items.value = items.value.filter(i => !(i.productId === productId && i.variantId === variantId))
    saveCart()
  }

  const clear = () => { items.value = []; localStorage.removeItem('nm_cart') }

  const saveCart = () => {
    try { localStorage.setItem('nm_cart', JSON.stringify(items.value)) } catch { /* storage full */ }
  }

  const loadCart = () => {
    try { items.value = JSON.parse(localStorage.getItem('nm_cart') || '[]') } catch { items.value = [] }
  }

  const cartForCheckout = computed(() =>
    items.value.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }))
  )

  return { items, count, totalKg, subtotal, minMet, addItem, updateQty, removeItem, clear, loadCart, cartForCheckout }
})

// ── TOAST STORE ───────────────────────────────────────────
export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  const add = (message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, type })
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, duration)
  }

  const success = (msg) => add(msg, 'success')
  const error   = (msg) => add(msg, 'error', 4500)
  const info    = (msg) => add(msg, 'info')

  return { toasts, success, error, info }
})

// ── PRODUCT STORE ─────────────────────────────────────────
export const useProductStore = defineStore('products', () => {
  const products   = ref([])
  const categories = ref([])
  const loading    = ref(false)
  const total      = ref(0)

  const fetchProducts = async (params = {}) => {
    loading.value = true
    try {
      const { data } = await api.get('/products', { params })
      products.value = data.products
      total.value    = data.total
      return data
    } finally { loading.value = false }
  }

  const fetchProduct = async (slug) => {
    const { data } = await api.get(`/products/${slug}`)
    return data.product
  }

  const fetchCategories = async () => {
    if (categories.value.length) return categories.value
    const { data }   = await api.get('/categories')
    categories.value = data.categories
    return data.categories
  }

  const fetchFeatured = async () => {
    const { data } = await api.get('/products/featured')
    return data.products
  }

  return { products, categories, loading, total, fetchProducts, fetchProduct, fetchCategories, fetchFeatured }
})
