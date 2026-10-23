import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/lib/api.js'
import { weightToKg } from '@/lib/weight.js'

// ── AUTH STORE ────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin    = computed(() => user.value?.role === 'admin')
  const isCustomer = computed(() => user.value?.role === 'customer')

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      user.value = data.user
    } catch {
      user.value = null
    }
  }

  const register = async ({ name, email, password, confirmPassword, phone }) => {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', { name, email, password, confirmPassword, phone })
      user.value = data.data.user
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to create account.' }
    } finally { loading.value = false }
  }

  const login = async (email, password) => {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      user.value = data.data.user
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid email or password.' }
    } finally { loading.value = false }
  }

  const forgotPassword = async (email) => {
    loading.value = true
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to send reset link.' }
    } finally { loading.value = false }
  }

  const resetPassword = async (token, password) => {
    loading.value = true
    try {
      const { data } = await api.post('/auth/reset-password', { token, password })
      return { success: true, ...data }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to reset password.' }
    } finally { loading.value = false }
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
    register,
    login,
    forgotPassword,
    resetPassword,
    adminLogin,
    logout
  }
})

// ── CART STORE ────────────────────────────────────────────
export const useCartStore = defineStore('cart', () => {
  const items = ref([])
  const minimumOrderKg = ref(3)
  const freeDeliveryMin = ref(0)
  const settingsLoaded = ref(false)

  const count    = computed(() => items.value.reduce((s, i) => s + i.qty, 0))
  const totalKg  = computed(() => items.value.reduce((s, i) => s + weightToKg(i.variant.weight) * i.qty, 0))
  const subtotal = computed(() => items.value.reduce((s, i) => s + i.variant.price * i.qty, 0))
  const minMet   = computed(() => totalKg.value >= minimumOrderKg.value)

  const loadSettings = async () => {
    if (settingsLoaded.value) return minimumOrderKg.value
    try {
      const { data } = await api.get('/store-settings')
      const value = Number(data.settings?.minimumOrderKg)
      if (Number.isFinite(value) && value > 0) minimumOrderKg.value = value
      const freeDeliveryValue = Number(data.settings?.freeDeliveryMin)
      if (Number.isFinite(freeDeliveryValue) && freeDeliveryValue > 0) freeDeliveryMin.value = freeDeliveryValue
      settingsLoaded.value = true
    } catch {
      settingsLoaded.value = true
    }
    return minimumOrderKg.value
  }

  const addItem = (product, variant, qty = 1) => {
    if (product.seasonalStatus && product.seasonalStatus !== 'available') return
    if (variant.isAvailable === false) return
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
    try {
      const saved = JSON.parse(localStorage.getItem('nm_cart') || '[]')
      items.value = Array.isArray(saved) ? saved.filter(item => item?.productId && item?.variantId && item?.variant?.weight) : []
    } catch { items.value = [] }
  }

  const reconcile = async () => {
    const productRequests = new Map()
    const reconciled = await Promise.all(items.value.map(async item => {
      const slug = item.product?.slug
      if (!slug) return item
      if (!productRequests.has(slug)) {
        productRequests.set(slug, api.get(`/products/${encodeURIComponent(slug)}`).then(({ data }) => data.product))
      }
      try {
        const product = await productRequests.get(slug)
        if (!product || product.seasonalStatus !== 'available') return null
        const variant = product.variants?.find(candidate => String(candidate._id) === String(item.variantId))
        if (!variant || variant.isAvailable === false || Number(variant.stock) <= 0) return null
        return {
          productId: product._id,
          variantId: variant._id,
          product: { _id: product._id, name: product.name, images: product.images, slug: product.slug },
          variant,
          qty: Math.min(Math.max(1, Number(item.qty) || 1), Number(variant.stock))
        }
      } catch (error) {
        if (error.response?.status === 404) return null
        return item
      }
    }))
    const validItems = reconciled.filter(Boolean)
    const changed = JSON.stringify(items.value) !== JSON.stringify(validItems)
    items.value = validItems
    if (changed) saveCart()
    return { changed, removed: reconciled.filter(item => item === null).length }
  }

  const cartForCheckout = computed(() =>
    items.value.map(i => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }))
  )

  return { items, count, totalKg, subtotal, minMet, minimumOrderKg, freeDeliveryMin, addItem, updateQty, removeItem, clear, loadCart, loadSettings, reconcile, cartForCheckout }
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

// ── PINCODE STORE ────────────────────────────────────────────
export const usePincodeStore = defineStore('pincode', () => {
  const pincode = ref(localStorage.getItem('nm_pincode') || '')
  const result  = ref(null)
  const loading = ref(false)

  const check = async (code) => {
    if (!code || code.length !== 6) return null
    pincode.value = code
    localStorage.setItem('nm_pincode', code)
    loading.value = true
    try {
      const { data } = await api.get(`/delivery/check/${code}`)
      result.value = data
      return data
    } catch (err) {
      result.value = {
        serviceable: false,
        lookupError: true,
        message: err.response?.data?.message || 'Unable to check delivery right now. Please try again.'
      }
      return result.value
    } finally { loading.value = false }
  }

  const clear = () => {
    pincode.value = ''
    result.value = null
    localStorage.removeItem('nm_pincode')
  }

  const loadSaved = async () => {
    if (pincode.value && pincode.value.length === 6 && !result.value) {
      await check(pincode.value)
    }
  }

  return { pincode, result, loading, check, clear, loadSaved }
})
