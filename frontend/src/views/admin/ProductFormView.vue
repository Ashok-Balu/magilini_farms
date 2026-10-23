<template>
  <div class="pb-20">
    <!-- Breadcrumb -->
    <div class="text-xs text-gray-400 mb-4">
      <router-link to="/admin/products" class="hover:text-green transition-colors">Products</router-link>
      <span class="mx-1.5">›</span>
      <span class="text-gray-600">{{ isEdit ? 'Edit Product' : 'Add Product' }}</span>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-900">{{ form.name || 'New Product' }}</h1>
        <span v-if="isEdit" :class="['text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', form.isActive ? 'bg-green/10 text-green' : 'bg-red-50 text-red-500']">
          {{ form.isActive ? 'Active' : 'Hidden' }}
        </span>
      </div>
      <div class="flex gap-2">
        <a v-if="isEdit" :href="`/product/${form.slug}`" target="_blank" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-green hover:text-green transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          Preview
        </a>
        <button v-if="isEdit" @click="duplicateProduct" class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-green hover:text-green transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          Duplicate
        </button>
      </div>
    </div>

    <!-- Form Card -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div class="p-6 sm:p-8 space-y-8">

        <!-- ─── BASIC INFO ─── -->
        <div>
          <!-- Category, Badge, Qty -->
          <div class="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Category *</label>
              <select v-model="form.category" class="form-input py-2.5 text-sm">
                <option value="" disabled>Choose</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.emoji }} {{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Badge</label>
              <input v-model="form.badge" class="form-input py-2.5 text-sm" placeholder="Exotic"/>
            </div>
            <div>
              <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Min. Qty</label>
              <input v-model.number="form.minimumQty" type="number" min="1" class="form-input py-2.5 text-sm"/>
            </div>
          </div>

          <!-- Name -->
          <div class="mb-5">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Product Name *</label>
            <input v-model="form.name" class="form-input py-2.5 text-sm" placeholder="e.g. Watermelon (Seedless)"/>
          </div>

          <!-- Description -->
          <div class="mb-5">
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Description *</label>
            <textarea v-model="form.description" rows="3" class="form-input resize-none text-sm leading-relaxed" placeholder="Describe taste, texture, origin..."></textarea>
          </div>

          <!-- Tags (Chips) -->
          <div>
            <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Tags</label>
            <div class="form-input py-2 px-3 flex flex-wrap items-center gap-2 min-h-[42px]">
              <span v-for="(tag, i) in parsedTags" :key="i" class="inline-flex items-center gap-1 bg-green/10 text-green text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                {{ tag }}
                <button @click="removeTag(i)" class="w-4 h-4 rounded-full hover:bg-green/20 flex items-center justify-center transition-colors">
                  <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </span>
              <input v-model="tagInput" @keydown.enter.prevent="addTag" @keydown.,.prevent="addTag" class="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder-gray-400" placeholder="Add tag and press Enter"/>
            </div>
            <p class="text-[10px] text-gray-400 mt-1">Comma separated — helps search</p>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── PRICING ─── -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-bold text-gray-900">Pricing</h2>
            <button @click="addVariant" class="text-xs font-semibold text-green hover:text-green-mid transition-colors">+ Add variant</button>
          </div>

          <div v-if="form.variants.length">
            <!-- Table Header -->
            <div class="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_40px] gap-3 px-3 mb-2">
              <span class="text-[9px] font-bold text-gray-400 uppercase">Weight</span>
              <span class="text-[9px] font-bold text-gray-400 uppercase">Price ₹</span>
              <span class="text-[9px] font-bold text-gray-400 uppercase">MRP ₹</span>
              <span class="text-[9px] font-bold text-gray-400 uppercase">Stock</span>
              <span class="text-[9px] font-bold text-gray-400 uppercase">Actions</span>
            </div>
            <!-- Rows -->
            <div class="space-y-2">
              <div v-for="(v,i) in form.variants" :key="i" class="grid grid-cols-[1.5fr_1fr_1fr_0.8fr_40px] gap-3 items-center bg-gray-50 rounded-xl px-3 py-2.5">
                <input v-model="v.weight" class="form-input py-2 text-sm bg-white" placeholder="1 kg"/>
                <input v-model.number="v.price" type="number" class="form-input py-2 text-sm bg-white" placeholder="99"/>
                <input v-model.number="v.mrp" type="number" class="form-input py-2 text-sm bg-white" placeholder="129"/>
                <input v-model.number="v.stock" type="number" min="0" class="form-input py-2 text-sm bg-white" placeholder="50"/>
                <button @click="form.variants.splice(i,1)" class="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors mx-auto">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
            <button @click="addVariant" class="text-green font-medium">+ Add first variant</button>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── KEY POINTS ─── -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-gray-900">Key Points</h2>
            <button @click="form.keyPoints.push('')" class="text-xs font-semibold text-green hover:text-green-mid transition-colors">+ Add</button>
          </div>
          <div class="space-y-2">
            <div v-for="(kp, i) in form.keyPoints" :key="i" class="flex items-center gap-2 group">
              <span class="text-gray-300 cursor-grab shrink-0 text-sm">⫶</span>
              <span class="w-1.5 h-1.5 rounded-full bg-gray-900 shrink-0"></span>
              <input v-model="form.keyPoints[i]" class="form-input flex-1 py-2 text-sm" placeholder="e.g. Naturally ripened"/>
              <button @click="form.keyPoints.splice(i,1)" class="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── STORAGE TIPS ─── -->
        <div>
          <h2 class="text-sm font-bold text-gray-900 mb-3">Storage Tips</h2>
          <div class="bg-green/5 border border-green/10 rounded-xl p-4 flex items-start gap-3">
            <span class="text-green text-sm mt-0.5 shrink-0">💡</span>
            <textarea v-model="form.storageTips" rows="2" class="flex-1 bg-transparent outline-none text-sm text-gray-700 leading-relaxed resize-none placeholder-gray-400" placeholder="How to store, ripen, and consume..."></textarea>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── PHOTOS ─── -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-bold text-gray-900">Photos</h2>
            <span class="text-[10px] text-gray-400">{{ totalImageCount }} of 5</span>
          </div>
          <div class="flex gap-3 flex-wrap">
            <!-- Existing -->
            <div v-for="(img, i) in existingImages" :key="'e'+img.url" class="relative group w-[88px] h-[88px] rounded-xl overflow-hidden border border-gray-200 shrink-0">
              <img :src="img.url" class="w-full h-full object-cover"/>
              <button @click="removeExistingImage(i)" class="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <!-- New -->
            <div v-for="(img, i) in imagePreview" :key="'n'+i" class="relative group w-[88px] h-[88px] rounded-xl overflow-hidden border-2 border-green/30 shrink-0">
              <img :src="img" class="w-full h-full object-cover"/>
              <button @click="removeNewImage(i)" class="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <!-- Upload Button -->
            <label v-if="totalImageCount < 5" class="w-[88px] h-[88px] rounded-xl border-2 border-dashed border-gray-200 hover:border-green/40 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 group">
              <svg class="w-5 h-5 text-gray-300 group-hover:text-green/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
              <span class="text-[9px] text-gray-400 mt-1">Add Photo</span>
              <input type="file" accept="image/*" multiple @change="onImages" class="hidden"/>
            </label>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── SETTINGS ─── -->
        <div>
          <h2 class="text-sm font-bold text-gray-900 mb-4">Settings</h2>
          <div class="space-y-4 mb-6">
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="text-sm font-medium text-gray-700">Visible in store</span>
                <p class="text-[10px] text-gray-400">Product is visible to customers</p>
              </div>
              <div :class="['w-10 h-[22px] rounded-full transition-colors relative cursor-pointer', form.isActive ? 'bg-green' : 'bg-gray-200']" @click="form.isActive = !form.isActive">
                <div :class="['absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform', form.isActive ? 'translate-x-[22px]' : 'translate-x-[3px]']"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer">
              <div>
                <span class="text-sm font-medium text-gray-700">Featured on homepage</span>
                <p class="text-[10px] text-gray-400">Show this product in homepage</p>
              </div>
              <div :class="['w-10 h-[22px] rounded-full transition-colors relative cursor-pointer', form.isFeatured ? 'bg-green' : 'bg-gray-200']" @click="form.isFeatured = !form.isFeatured">
                <div :class="['absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform', form.isFeatured ? 'translate-x-[22px]' : 'translate-x-[3px]']"></div>
              </div>
            </label>
          </div>
        </div>

        <!-- ─── DIVIDER ─── -->
        <hr class="border-gray-100"/>

        <!-- ─── SEASON ─── -->
        <div>
          <h2 class="text-sm font-bold text-gray-900 mb-3">Season</h2>
          <div class="inline-flex rounded-lg overflow-hidden border border-gray-200 mb-3">
            <button v-for="opt in seasonOptions" :key="opt.value" @click="form.seasonalStatus = opt.value"
              :class="['px-4 py-2 text-xs font-medium transition-all border-r border-gray-200 last:border-r-0', form.seasonalStatus === opt.value ? 'bg-green text-white' : 'bg-white text-gray-500 hover:bg-gray-50']">
              {{ opt.label }}
            </button>
          </div>
          <p class="text-[10px] text-gray-400 mb-4">Set the seasonal availability status of this product.</p>

          <div v-if="form.seasonalStatus !== 'available'" class="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Available from</label>
              <input v-model="form.availableFrom" type="date" class="form-input py-2 text-sm"/>
            </div>
            <div>
              <label class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Season note</label>
              <input v-model="form.seasonNote" class="form-input py-2 text-sm" placeholder="April – July"/>
            </div>
          </div>
        </div>

      </div>

      <!-- ─── BOTTOM ACTIONS ─── -->
      <div class="border-t border-gray-100 px-6 sm:px-8 py-4 flex items-center justify-between rounded-b-2xl bg-gray-50/50">
        <router-link to="/admin/products" class="text-sm text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300">Cancel</router-link>
        <div class="flex items-center gap-3">
          <p v-if="error" class="text-red-500 text-xs">{{ error }}</p>
          <button @click="save" :disabled="saving" class="bg-green hover:bg-green-mid text-white font-semibold px-6 py-2.5 rounded-xl transition-all active:scale-[0.97] disabled:opacity-50 text-sm shadow-sm flex items-center gap-2">
            <span v-if="saving" class="spinner"></span>{{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const route  = useRoute()
const router = useRouter()
const toast  = useToastStore()
const isEdit = computed(() => !!route.params.id)

const seasonOptions = [
  { value: 'available', label: 'Available' },
  { value: 'off-season', label: 'Off Season' },
  { value: 'coming-soon', label: 'Coming Soon' },
]

const categories   = ref([])
const imageFiles   = ref([])
const imagePreview = ref([])
const existingImages = ref([])
const saving       = ref(false)
const error        = ref('')
const tagInput     = ref('')

const form = ref({
  name: '', slug: '', category: '', badge: '', minimumQty: 1,
  description: '', keyPoints: [''], storageTips: '', tags: [],
  seasonalStatus: 'available', availableFrom: '', seasonNote: '',
  isFeatured: false, isActive: true,
  variants: [{ weight: '1 kg', price: '', mrp: '', stock: 0 }]
})

const parsedTags = computed(() => form.value.tags)
const addTag = () => {
  const val = tagInput.value.replace(/,/g, '').trim()
  if (val && !form.value.tags.includes(val)) {
    form.value.tags.push(val)
  }
  tagInput.value = ''
}
const removeTag = (i) => { form.value.tags.splice(i, 1) }

const totalImageCount = computed(() => existingImages.value.length + imageFiles.value.length)
const addVariant = () => form.value.variants.push({ weight: '', price: '', mrp: '', stock: 0 })

const onImages = (e) => {
  const selectedFiles = Array.from(e.target.files)
  const allowed = Math.max(0, 5 - existingImages.value.length)
  const newFiles = selectedFiles.slice(0, allowed - imageFiles.value.length)
  imageFiles.value = [...imageFiles.value, ...newFiles].slice(0, allowed)
  imagePreview.value = imageFiles.value.map(f => URL.createObjectURL(f))
  if (selectedFiles.length > allowed) error.value = `Max 5 images.`
}

const removeExistingImage = (index) => { existingImages.value.splice(index, 1) }
const removeNewImage = (index) => { imageFiles.value.splice(index, 1); imagePreview.value.splice(index, 1) }

const duplicateProduct = () => {
  const data = { ...form.value }
  delete data._id
  data.name = `${data.name} (Copy)`
  data.slug = ''
  data.variants = data.variants.map(({ _id, _initialStock, ...variant }) => variant)
  sessionStorage.setItem('duplicateProduct', JSON.stringify(data))
  router.push('/admin/products/new?duplicate=true')
}

const save = async () => {
  error.value = ''
  if (!form.value.name || !form.value.category || !form.value.description) { error.value = 'Name, category, and description required.'; toast.error(error.value); return }
  if (!form.value.variants.length) { error.value = 'Add at least one variant.'; toast.error(error.value); return }
  saving.value = true
  try {
    const categoryId = typeof form.value.category === 'object' ? form.value.category?._id || form.value.category?.id : form.value.category

    const fd = new FormData()
    fd.append('name', form.value.name)
    fd.append('category', categoryId)
    fd.append('badge', form.value.badge || '')
    fd.append('minimumQty', form.value.minimumQty)
    fd.append('description', form.value.description)
    fd.append('keyPoints', JSON.stringify(form.value.keyPoints.filter(Boolean)))
    fd.append('storageTips', form.value.storageTips || '')
    fd.append('tags', JSON.stringify(form.value.tags))
    fd.append('variants', JSON.stringify(form.value.variants))
    fd.append('seasonalStatus', form.value.seasonalStatus)
    fd.append('availableFrom', form.value.availableFrom || '')
    fd.append('seasonNote', form.value.seasonNote || '')
    fd.append('isFeatured', form.value.isFeatured)
    fd.append('isActive', form.value.isActive)
    if (isEdit.value) fd.append('existingImages', JSON.stringify(existingImages.value))
    imageFiles.value.forEach(f => fd.append('images', f))

    if (isEdit.value) await api.patch(`/admin/products/${route.params.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    else await api.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

    toast.success(isEdit.value ? 'Product updated!' : 'Product created!')
    router.push('/admin/products')
  } catch (err) { error.value = err.response?.data?.message || 'Failed to save.'; toast.error(error.value) }
  finally { saving.value = false }
}

onMounted(async () => {
  const { data } = await api.get('/categories')
  categories.value = data.categories

  if (route.query.duplicate && sessionStorage.getItem('duplicateProduct')) {
    try {
      const dup = JSON.parse(sessionStorage.getItem('duplicateProduct'))
      Object.assign(form.value, dup)
      sessionStorage.removeItem('duplicateProduct')
    } catch {}
  }

  if (isEdit.value) {
    const { data: pd } = await api.get(`/admin/products/${route.params.id}`)
    const p = pd.product || pd
    Object.assign(form.value, p)
    form.value.variants = (p.variants || []).map(variant => ({ ...variant, _initialStock: Number(variant.stock) }))
    form.value.category = p.category?._id || p.category || ''
    form.value.availableFrom = p.availableFrom ? new Date(p.availableFrom).toISOString().split('T')[0] : ''
    form.value.tags = Array.isArray(p.tags) ? [...p.tags] : []
    existingImages.value = Array.isArray(p.images) ? [...p.images] : []
  }
})
</script>
