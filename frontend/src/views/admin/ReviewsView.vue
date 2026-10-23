<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="font-serif text-3xl text-gray-900">Reviews</h1>
        <p class="text-sm text-gray-400 mt-1">Manage customer reviews & add new ones</p>
      </div>
      <button @click="openCreate" class="btn btn-primary">+ Add Review</button>
    </div>

    <!-- Filters -->
    <div class="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
      <select v-model="filterApproved" @change="load" class="form-input w-36 py-2 text-sm">
        <option value="">All Status</option>
        <option value="true">Approved</option>
        <option value="false">Pending</option>
      </select>
      <span class="text-xs text-gray-400">{{ total }} reviews</span>
    </div>

    <!-- Reviews List -->
    <div class="space-y-3">
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-20 bg-white rounded-2xl animate-pulse border border-gray-100"></div>
      </div>
      <div v-else-if="!reviews.length" class="text-center py-16 text-gray-400">
        <div class="text-4xl mb-3">💬</div>
        <p class="text-sm">No reviews yet</p>
      </div>
      <div v-else v-for="r in reviews" :key="r._id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
        <div class="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center text-sm font-bold text-green shrink-0">{{ r.name?.[0] || '?' }}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap mb-1">
            <span class="font-semibold text-sm text-gray-800">{{ r.name }}</span>
            <span class="text-mango text-xs">{{ '★'.repeat(r.rating) }}</span>
            <span v-if="r.isVerifiedPurchase" class="text-[9px] font-bold bg-green/10 text-green px-1.5 py-0.5 rounded">Verified</span>
            <span :class="['text-[10px] font-semibold px-2 py-0.5 rounded-full', r.isApproved ? 'bg-green/10 text-green' : 'bg-amber-100 text-amber-700']">{{ r.isApproved ? 'Approved' : 'Pending' }}</span>
          </div>
          <div class="text-xs text-gray-400 mb-1">{{ r.productId?.name || 'Unknown Product' }} · {{ new Date(r.createdAt).toLocaleDateString('en-IN') }}</div>
          <p class="text-sm text-gray-600">{{ r.comment }}</p>
          <div v-if="r.adminReply" class="mt-2 bg-green/5 border border-green/10 rounded-lg p-2 text-xs text-gray-600">
            <span class="font-bold text-green">Reply:</span> {{ r.adminReply }}
          </div>
        </div>
        <div class="flex gap-1.5 shrink-0">
          <button v-if="!r.isApproved" @click="approveReview(r)" class="w-8 h-8 rounded-lg bg-green/10 hover:bg-green/20 flex items-center justify-center text-sm" title="Approve">✓</button>
          <button @click="openReply(r)" class="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-sm" title="Reply">💬</button>
          <button @click="deleteReview(r)" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-sm" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Create/Reply Modal -->
    <div v-if="modal.open" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="modal.open = false">
      <div class="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div class="bg-gray-50 border-b border-gray-100 px-6 py-4">
          <h3 class="font-semibold text-gray-900">{{ modal.mode === 'create' ? 'Add Review' : 'Reply to Review' }}</h3>
        </div>
        <div class="p-6 space-y-3">
          <template v-if="modal.mode === 'create'">
            <div>
              <label class="form-label">Product *</label>
              <select v-model="modal.form.productId" class="form-input text-sm">
                <option value="">Select product</option>
                <option v-for="p in allProducts" :key="p._id" :value="p._id">{{ p.name }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Reviewer Name *</label>
              <input v-model="modal.form.name" class="form-input text-sm" placeholder="Customer name"/>
            </div>
            <div>
              <label class="form-label">Rating *</label>
              <div class="flex gap-1">
                <button v-for="i in 5" :key="i" @click="modal.form.rating = i" :class="['text-2xl', i <= modal.form.rating ? 'text-mango' : 'text-gray-200']">★</button>
              </div>
            </div>
            <div>
              <label class="form-label">Review Comment *</label>
              <textarea v-model="modal.form.comment" class="form-input text-sm resize-none h-20" placeholder="Write review..."></textarea>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="modal.form.isVerifiedPurchase" class="accent-green w-4 h-4"/>
              <span class="text-sm text-gray-600">Mark as Verified Purchase</span>
            </label>
          </template>
          <template v-else>
            <div class="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-2">
              <span class="font-semibold">{{ modal.review?.name }}:</span> "{{ modal.review?.comment }}"
            </div>
            <div>
              <label class="form-label">Your Reply</label>
              <textarea v-model="modal.form.adminReply" class="form-input text-sm resize-none h-20" placeholder="Reply to customer..."></textarea>
            </div>
          </template>
        </div>
        <div class="flex gap-3 px-6 pb-6">
          <button @click="modal.open = false" class="btn btn-ghost flex-1">Cancel</button>
          <button @click="saveModal" class="btn btn-primary flex-1">{{ modal.mode === 'create' ? 'Create Review' : 'Save Reply' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const toast = useToastStore()
const reviews = ref([])
const allProducts = ref([])
const loading = ref(true)
const total = ref(0)
const filterApproved = ref('')
const modal = reactive({ open: false, mode: 'create', review: null, form: { productId: '', name: '', rating: 5, comment: '', isVerifiedPurchase: false, adminReply: '' } })

const load = async () => {
  loading.value = true
  try {
    const params = { limit: 50 }
    if (filterApproved.value) params.approved = filterApproved.value
    const { data } = await api.get('/admin/reviews', { params })
    reviews.value = data.reviews || []
    total.value = data.total || 0
  } finally { loading.value = false }
}

const openCreate = () => {
  modal.mode = 'create'
  modal.form = { productId: '', name: '', rating: 5, comment: '', isVerifiedPurchase: false, adminReply: '' }
  modal.open = true
}

const openReply = (r) => {
  modal.mode = 'reply'
  modal.review = r
  modal.form = { adminReply: r.adminReply || '' }
  modal.open = true
}

const saveModal = async () => {
  try {
    if (modal.mode === 'create') {
      if (!modal.form.productId || !modal.form.name || !modal.form.comment) { toast.error('Fill all required fields.'); return }
      await api.post('/admin/reviews', modal.form)
      toast.success('Review created.')
    } else {
      await api.patch(`/admin/reviews/${modal.review._id}`, { adminReply: modal.form.adminReply })
      toast.success('Reply saved.')
    }
    modal.open = false
    await load()
  } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
}

const approveReview = async (r) => {
  try {
    await api.patch(`/admin/reviews/${r._id}`, { isApproved: true })
    r.isApproved = true
    toast.success('Review approved.')
  } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
}

const deleteReview = async (r) => {
  if (!confirm('Delete this review?')) return
  try {
    await api.delete(`/admin/reviews/${r._id}`)
    toast.success('Deleted.')
    await load()
  } catch (err) { toast.error(err.response?.data?.message || 'Failed.') }
}

onMounted(async () => {
  const { data } = await api.get('/admin/products', { params: { limit: 100 } })
  allProducts.value = data.products || []
  await load()
})
</script>
