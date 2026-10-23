<template>
  <div class="space-y-4 text-left">
    <p v-if="!options.enabled" class="text-sm text-red-600">Direct UPI is not configured. Please contact the farm.</p>
    <template v-else>
      <div class="rounded-xl bg-gray-50 p-4">
        <div class="text-xs text-gray-500">Pay exactly</div>
        <div class="text-2xl font-bold text-green">₹{{ order.total }}</div>
        <div class="mt-3 text-xs text-gray-500">UPI ID</div>
        <div class="flex items-center justify-between gap-2">
          <span class="min-w-0 break-all font-semibold text-gray-900">{{ options.upiId }}</span>
          <button @click="copyUpiId" class="btn btn-ghost btn-sm shrink-0">Copy</button>
        </div>
        <div class="mt-1 text-xs text-gray-500">{{ options.upiName }}</div>
      </div>
      <a :href="upiLink" class="btn btn-primary w-full">Open UPI App</a>
      <p v-if="referenceSubmitted" class="rounded-lg bg-green/5 px-3 py-2 text-sm text-green">
        UTR {{ order.utrNumber }} submitted. Payment is pending farm verification.
      </p>
      <form v-else @submit.prevent="submitReference" class="space-y-2">
        <label class="form-label" :for="`upi-ref-${order._id}`">UPI transaction reference (UTR)</label>
        <input :id="`upi-ref-${order._id}`" v-model="upiRef" class="form-input" maxlength="50" placeholder="Enter your UTR after paying"/>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" :disabled="submitting" class="btn btn-primary w-full">
          {{ submitting ? 'Submitting…' : 'Submit UTR for Verification' }}
        </button>
      </form>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const props = defineProps({ order: { type: Object, required: true } })
const toast = useToastStore()
const options = ref({ enabled: false, upiId: '', upiName: '' })
const upiRef = ref('')
const error = ref('')
const submitting = ref(false)
const referenceSubmitted = ref(Boolean(props.order.utrNumber))

const upiLink = computed(() => {
  const params = new URLSearchParams({
    pa: options.value.upiId,
    pn: options.value.upiName,
    am: String(props.order.total),
    cu: 'INR',
    tn: `Order ${props.order.orderNumber}`
  })
  return `upi://pay?${params.toString()}`
})

const copyUpiId = async () => {
  try {
    await navigator.clipboard.writeText(options.value.upiId)
    toast.success('UPI ID copied.')
  } catch {
    error.value = `Copy this UPI ID: ${options.value.upiId}`
  }
}

const submitReference = async () => {
  error.value = ''
  const reference = upiRef.value.trim()
  if (!/^[a-zA-Z0-9-]{6,50}$/.test(reference)) {
    error.value = 'Enter a valid UTR of 6–50 letters or numbers.'
    return
  }

  submitting.value = true
  try {
    await api.post('/payment/submit-upi-reference', { orderId: props.order._id, upiRef: reference })
    referenceSubmitted.value = true
    upiRef.value = ''
    toast.success('UTR submitted. Payment is awaiting verification.')
  } catch (err) {
    error.value = err.response?.data?.message || 'Could not submit the UTR. Please try again.'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/payment/options')
    options.value = data.directUpi || options.value
  } catch {
    options.value = { enabled: false, upiId: '', upiName: '' }
  }
})
</script>