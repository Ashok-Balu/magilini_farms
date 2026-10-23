<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="font-serif text-2xl text-gray-900">Notification Deliveries</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total }} recorded WhatsApp messages</p>
      </div>
      <button @click="load" :disabled="loading" class="btn btn-ghost btn-sm">↻ Refresh</button>
    </div>

    <div class="card card-body mb-5 flex flex-wrap items-center gap-3">
      <label for="notification-status" class="text-sm font-medium text-gray-700">Status</label>
      <select id="notification-status" v-model="status" @change="changeStatus" class="form-input w-44 py-2 text-sm">
        <option value="">All statuses</option>
        <option value="failed">Failed</option>
        <option value="pending">Pending</option>
        <option value="sending">Sending</option>
        <option value="delivered">Delivered</option>
        <option value="simulated">Simulated</option>
      </select>
    </div>

    <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>
    <div v-if="loading" class="card card-body text-sm text-gray-500">Loading notification deliveries…</div>
    <div v-else-if="!deliveries.length" class="card card-body text-center text-sm text-gray-500">No notifications match this filter.</div>
    <div v-else class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Created</th>
            <th class="px-4 py-3">Order</th>
            <th class="px-4 py-3">Recipient</th>
            <th class="px-4 py-3">Template</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Attempts / last error</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="delivery in deliveries" :key="delivery._id">
            <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(delivery.createdAt) }}</td>
            <td class="px-4 py-3">{{ delivery.orderNumber || '—' }}</td>
            <td class="px-4 py-3">{{ delivery.recipient }}</td>
            <td class="px-4 py-3">{{ delivery.templateName }}</td>
            <td class="px-4 py-3">
              <span :class="statusClass(delivery.status)" class="rounded-full px-2 py-1 text-xs font-semibold">{{ delivery.status }}</span>
            </td>
            <td class="px-4 py-3">
              {{ delivery.attempts }}
              <div v-if="delivery.lastError" class="max-w-xs whitespace-normal text-xs text-red-600">{{ delivery.lastError }}</div>
            </td>
            <td class="px-4 py-3">
              <button v-if="delivery.status === 'failed'" @click="retry(delivery)" :disabled="retryingId === delivery._id" class="text-green font-semibold hover:underline disabled:opacity-50">
                {{ retryingId === delivery._id ? 'Retrying…' : 'Retry' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
        <span>Page {{ page }} of {{ pageCount }}</span>
        <div class="flex gap-2">
          <button @click="changePage(page - 1)" :disabled="page <= 1 || loading" class="btn btn-ghost btn-sm disabled:opacity-40">Previous</button>
          <button @click="changePage(page + 1)" :disabled="page >= pageCount || loading" class="btn btn-ghost btn-sm disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const toast = useToastStore()
const deliveries = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 50
const status = ref('')
const loading = ref(false)
const error = ref('')
const retryingId = ref('')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/notifications', {
      params: { page: page.value, limit: pageSize, ...(status.value ? { status: status.value } : {}) }
    })
    deliveries.value = data.deliveries || []
    total.value = Number(data.total) || 0
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load notification deliveries.'
  } finally {
    loading.value = false
  }
}

const changePage = async (nextPage) => {
  page.value = nextPage
  await load()
}

const changeStatus = async () => {
  page.value = 1
  await load()
}

const retry = async (delivery) => {
  retryingId.value = delivery._id
  try {
    await api.post(`/admin/notifications/${delivery._id}/retry`)
    toast.success('Notification delivered.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Notification retry failed.')
  } finally {
    retryingId.value = ''
    await load()
  }
}

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—'
const statusClass = (value) => ({
  delivered: 'bg-green-100 text-green-800',
  simulated: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  sending: 'bg-amber-100 text-amber-800',
  pending: 'bg-gray-100 text-gray-700'
}[value] || 'bg-gray-100 text-gray-700')

onMounted(load)
</script>
