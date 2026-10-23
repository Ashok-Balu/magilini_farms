<template>
  <section>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h1 class="font-serif text-2xl text-gray-900">Admin Audit History</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total }} recorded admin actions</p>
      </div>
      <button @click="load" :disabled="loading" class="btn btn-ghost btn-sm">↻ Refresh</button>
    </div>

    <div class="card card-body mb-5 flex flex-wrap items-center gap-3">
      <label for="audit-action" class="text-sm font-medium text-gray-700">Action</label>
      <input id="audit-action" v-model="action" class="form-input w-64 py-2 text-sm" placeholder="Filter action (e.g. coupon_created)" @keyup.enter="changeAction"/>
      <button @click="changeAction" class="btn btn-ghost btn-sm">Apply</button>
    </div>

    <div v-if="error" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</div>
    <div v-if="loading" class="card card-body text-sm text-gray-500">Loading audit history…</div>
    <div v-else-if="!logs.length" class="card card-body text-center text-sm text-gray-500">No audit entries match this filter.</div>
    <div v-else class="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th class="px-4 py-3">Time</th>
            <th class="px-4 py-3">Admin</th>
            <th class="px-4 py-3">Action</th>
            <th class="px-4 py-3">Resource</th>
            <th class="px-4 py-3">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="log in logs" :key="log._id">
            <td class="px-4 py-3 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-4 py-3">{{ log.actorId?.name || log.actorId?.email || 'Admin' }}</td>
            <td class="px-4 py-3 font-medium">{{ log.action }}</td>
            <td class="px-4 py-3 font-mono text-xs">{{ log.resourceId || '—' }}</td>
            <td class="px-4 py-3"><pre class="max-w-lg whitespace-pre-wrap break-words text-xs text-gray-600">{{ formatDetails(log.details) }}</pre></td>
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

const logs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 50
const action = ref('')
const appliedAction = ref('')
const loading = ref(false)
const error = ref('')
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/admin/audit-logs', {
      params: { page: page.value, limit: pageSize, ...(appliedAction.value ? { action: appliedAction.value } : {}) }
    })
    logs.value = data.logs || []
    total.value = Number(data.total) || 0
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not load audit history.'
  } finally {
    loading.value = false
  }
}

const changeAction = async () => {
  appliedAction.value = action.value.trim()
  page.value = 1
  await load()
}

const changePage = async (nextPage) => {
  page.value = nextPage
  await load()
}

const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN') : '—'
const formatDetails = (details) => JSON.stringify(details || {}, null, 2)

onMounted(load)
</script>
