<template>
  <div class="max-w-3xl">
    <router-link to="/admin/products" class="text-green text-sm font-semibold flex items-center gap-1 mb-5">← Back to Products</router-link>
    <h1 class="font-serif text-2xl mb-6">{{ isEdit ? 'Edit Product' : 'Add New Product' }}</h1>

    <div class="space-y-5">
      <!-- Basic Info -->
      <div class="card card-body space-y-4">
        <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wider">Basic Info</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="form-label">Product Name *</label><input v-model="form.name" class="form-input" placeholder="Alphonso Mango"/></div>
          <div><label class="form-label">Category *</label>
            <select v-model="form.category" class="form-input">
              <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.emoji }} {{ c.name }}</option>
            </select>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="form-label">Badge (optional)</label><input v-model="form.badge" class="form-input" placeholder="Best Seller"/></div>
          <div><label class="form-label">Minimum Qty (kg)</label><input v-model.number="form.minimumQty" type="number" min="1" class="form-input"/></div>
        </div>
        <div><label class="form-label">Description *</label><textarea v-model="form.description" class="form-input resize-none h-28" placeholder="Detailed product description..."></textarea></div>
        <div>
          <label class="form-label">Key Points</label>
          <div v-for="(kp, i) in form.keyPoints" :key="i" class="flex gap-2 mb-2">
            <input v-model="form.keyPoints[i]" class="form-input flex-1 text-sm" placeholder="e.g. No carbide used"/>
            <button @click="moveKeyPoint(i, -1)" :disabled="i===0" class="px-2 text-gray-400 hover:text-gray-700 disabled:opacity-30">↑</button>
            <button @click="moveKeyPoint(i, 1)" :disabled="i===form.keyPoints.length-1" class="px-2 text-gray-400 hover:text-gray-700 disabled:opacity-30">↓</button>
            <button @click="form.keyPoints.splice(i,1)" class="text-red-400 hover:text-red-600 px-2">✕</button>
          </div>
          <button @click="form.keyPoints.push('')" class="text-green text-sm font-medium">+ Add Point</button>
        </div>
        <div><label class="form-label">Storage Tips</label><textarea v-model="form.storageTips" class="form-input resize-none h-16" placeholder="Storage and ripening instructions..."></textarea></div>
        <div><label class="form-label">Tags (comma separated)</label><input v-model="tagsInput" class="form-input" placeholder="No Carbide, Farm Fresh, Hand Picked"/></div>
      </div>

      <!-- Variants -->
      <div class="card card-body">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wider">Variants & Pricing</h3>
          <button @click="addVariant" class="text-green text-sm font-medium">+ Add Variant</button>
        </div>
        <table class="w-full text-sm">
          <thead><tr class="text-xs text-gray-400 uppercase tracking-wider"><th class="text-left pb-2">Weight</th><th class="text-left pb-2">Price (₹)</th><th class="text-left pb-2">MRP (₹)</th><th class="text-left pb-2">Stock</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(v,i) in form.variants" :key="i" class="border-t border-gray-50">
              <td class="py-2 pr-2"><input v-model="v.weight" class="form-input py-1.5 text-sm" placeholder="1 kg"/></td>
              <td class="py-2 pr-2"><input v-model.number="v.price" type="number" class="form-input py-1.5 text-sm" placeholder="350"/></td>
              <td class="py-2 pr-2"><input v-model.number="v.mrp" type="number" class="form-input py-1.5 text-sm" placeholder="420"/></td>
              <td class="py-2 pr-2"><input v-model.number="v.stock" type="number" class="form-input py-1.5 text-sm" placeholder="50"/></td>
              <td class="py-2"><button @click="form.variants.splice(i,1)" class="text-red-400 hover:text-red-600">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Seasonal -->
      <div class="card card-body space-y-4">
        <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wider">Seasonal Settings</h3>
        <div class="grid sm:grid-cols-2 gap-4">
          <div><label class="form-label">Status</label>
            <select v-model="form.seasonalStatus" class="form-input">
              <option value="available">Available</option>
              <option value="off-season">Off Season</option>
              <option value="coming-soon">Coming Soon</option>
            </select>
          </div>
          <div><label class="form-label">Available From (optional)</label><input v-model="form.availableFrom" type="date" class="form-input"/></div>
        </div>
        <div><label class="form-label">Season Note</label><input v-model="form.seasonNote" class="form-input" placeholder="e.g. Available April – July"/></div>
      </div>

      <!-- Images -->
      <div class="card card-body space-y-3">
        <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wider">Product Photos</h3>
        <input type="file" accept="image/*" multiple @change="onImages" class="form-input py-2"/>
        <div v-if="imagePreview.length" class="flex gap-2 flex-wrap">
          <img v-for="(img,i) in imagePreview" :key="i" :src="img" class="w-16 h-16 object-cover rounded-xl"/>
        </div>
      </div>

      <!-- Settings -->
      <div class="card card-body">
        <h3 class="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">Settings</h3>
        <div class="flex flex-wrap gap-6">
          <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="form.isFeatured" class="accent-green w-4 h-4"/><span class="text-sm">Featured on Homepage</span></label>
          <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="form.isActive" class="accent-green w-4 h-4"/><span class="text-sm">Active (visible in store)</span></label>
        </div>
      </div>

      <!-- Save -->
      <div class="flex gap-3">
        <router-link to="/admin/products" class="btn btn-ghost flex-1">Cancel</router-link>
        <button @click="save" :disabled="saving" class="btn btn-primary flex-1">{{ saving?'Saving...': isEdit?'Update Product':'Create Product' }}</button>
      </div>
      <p v-if="error" class="text-red-500 text-sm text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api.js'

const route  = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const categories   = ref([])
const imageFiles   = ref([])
const imagePreview = ref([])
const saving       = ref(false)
const error        = ref('')
const tagsInput    = ref('')

const form = ref({
  name: '', category: '', badge: '', minimumQty: 1,
  description: '', keyPoints: [''], storageTips: '', tags: [],
  seasonalStatus: 'available', availableFrom: '', seasonNote: '',
  isFeatured: false, isActive: true,
  variants: [{ weight: '1 kg', price: '', mrp: '', stock: 0 }]
})

const addVariant = () => form.value.variants.push({ weight: '', price: '', mrp: '', stock: 0 })
const onImages   = (e) => {
  const selectedFiles = Array.from(e.target.files)
  const existingCount = Array.isArray(form.value.images) ? form.value.images.length : 0
  const allowed = Math.max(0, 5 - existingCount)
  imageFiles.value   = selectedFiles.slice(0, allowed)
  imagePreview.value = imageFiles.value.map(f => URL.createObjectURL(f))
  if (selectedFiles.length > allowed) {
    error.value = `Only ${allowed} more image(s) can be uploaded. Maximum is 5.`
  }
}

const moveKeyPoint = (index, direction) => {
  const next = index + direction
  if (next < 0 || next >= form.value.keyPoints.length) return
  const points = [...form.value.keyPoints]
  const temp = points[index]
  points[index] = points[next]
  points[next] = temp
  form.value.keyPoints = points
}

const save = async () => {
  error.value = ''
  if (!form.value.name || !form.value.category || !form.value.description) { error.value = 'Please fill in name, category, and description.'; return }
  if ((form.value.images?.length || 0) + imageFiles.value.length > 5) { error.value = 'Maximum 5 images are allowed.'; return }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.value.name)
    fd.append('category', form.value.category)
    fd.append('badge', form.value.badge)
    fd.append('minimumQty', form.value.minimumQty)
    fd.append('description', form.value.description)
    fd.append('keyPoints', JSON.stringify(form.value.keyPoints.filter(Boolean)))
    fd.append('storageTips', form.value.storageTips)
    fd.append('tags', JSON.stringify(tagsInput.value.split(',').map(t=>t.trim()).filter(Boolean)))
    fd.append('variants', JSON.stringify(form.value.variants))
    fd.append('seasonalStatus', form.value.seasonalStatus)
    fd.append('availableFrom', form.value.availableFrom)
    fd.append('seasonNote', form.value.seasonNote)
    fd.append('isFeatured', form.value.isFeatured)
    fd.append('isActive', form.value.isActive)
    imageFiles.value.forEach(f => fd.append('images', f))

    if (isEdit.value) await api.patch(`/admin/products/${route.params.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    else              await api.post('/admin/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } })

    router.push('/admin/products')
  } catch (err) { error.value = err.response?.data?.message || 'Failed to save.' }
  finally { saving.value = false }
}

onMounted(async () => {
  const { data } = await api.get('/categories')
  categories.value = data.categories

  if (isEdit.value) {
    const { data: pd } = await api.get(`/admin/products/${route.params.id}`)
    const p = pd.product || pd
    Object.assign(form.value, p)
    tagsInput.value = p.tags?.join(', ') || ''
  }
})
</script>
