<template>
  <div>
    <router-link to="/admin/orders" class="text-green text-sm font-semibold flex items-center gap-1 mb-5">← Back to Orders</router-link>
    <div v-if="loading" class="h-64 bg-gray-100 rounded-2xl animate-pulse"></div>
    <div v-else-if="order" class="grid lg:grid-cols-3 gap-6">
      <!-- Left: Details -->
      <div class="lg:col-span-2 space-y-5">
        <div class="card card-body">
          <div class="flex items-center justify-between mb-4">
            <h1 class="font-serif text-2xl">{{ order.orderNumber }}</h1>
            <span :class="`status-${order.status}`">{{ order.status }}</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div><div class="text-xs text-gray-400 mb-1">Customer</div><div class="font-semibold">{{ order.customer.name }}</div><div class="text-gray-500">{{ order.customer.phone }}</div></div>
            <div><div class="text-xs text-gray-400 mb-1">Delivery</div><div class="font-semibold">{{ order.deliveryType==='pickup'?'🏪 Farm Pickup':'🚚 Home Delivery' }}</div><div v-if="order.deliveryType==='home'" class="text-gray-500 text-xs">{{ order.deliveryAddress?.line1 }}, {{ order.deliveryAddress?.city }} {{ order.deliveryAddress?.pincode }}</div><div v-else class="text-gray-500 text-xs">{{ fmtDate(order.pickupDate) }}</div></div>
            <div><div class="text-xs text-gray-400 mb-1">Payment</div><div class="font-semibold">{{ order.paymentMethod }}</div><div :class="order.paymentStatus==='paid'?'text-green':'text-amber-600'" class="text-xs font-medium">{{ order.paymentStatus?.toUpperCase() }}</div><div v-if="order.utrNumber" class="text-xs text-gray-400">UTR: {{ order.utrNumber }}</div></div>
            <div><div class="text-xs text-gray-400 mb-1">Placed On</div><div class="font-semibold">{{ fmtDate(order.createdAt) }}</div></div>
          </div>
          <div class="mt-3 text-xs text-gray-500" v-if="order.customer.email">Email: {{ order.customer.email }}</div>
        </div>

        <div class="card card-body">
          <h3 class="font-semibold mb-3">Items</h3>
          <div v-for="item in order.items" :key="item.name" class="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
            <div><div class="font-medium">{{ item.name }}</div><div class="text-xs text-gray-400">{{ item.weight }} × {{ item.qty }}</div></div>
            <span class="font-bold">₹{{ item.subtotal }}</span>
          </div>
          <div class="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm">
            <div class="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{{ order.subtotal }}</span></div>
            <div v-if="order.couponDiscount" class="flex justify-between text-green"><span>Discount ({{ order.couponCode }})</span><span>−₹{{ order.couponDiscount }}</span></div>
            <div v-if="order.packagingFee" class="flex justify-between text-gray-500"><span>Gift Packing</span><span>₹{{ order.packagingFee }}</span></div>
            <div class="flex justify-between text-gray-500"><span>Delivery</span><span>{{ order.deliveryFee?'₹'+order.deliveryFee:'FREE' }}</span></div>
            <div class="flex justify-between font-bold text-base border-t border-gray-100 pt-2"><span>Total</span><span>₹{{ order.total }}</span></div>
          </div>
        </div>

        <div class="card card-body" v-if="order.orderNotes||order.giftMessage">
          <h3 class="font-semibold mb-3">Notes</h3>
          <div v-if="order.orderNotes" class="text-sm text-gray-600 mb-2"><strong>Order Note:</strong> {{ order.orderNotes }}</div>
          <div v-if="order.giftMessage" class="text-sm text-gray-600"><strong>🎁 Gift Message:</strong> {{ order.giftMessage }}</div>
        </div>
      </div>

      <!-- Right: Actions -->
      <div class="space-y-5">
        <!-- Update Status -->
        <div class="card card-body">
          <h3 class="font-semibold mb-4">Update Status</h3>
          <select v-model="newStatus" class="form-input mb-3 text-sm">
            <option v-for="s in validStatuses" :key="s" :value="s">{{ s }}</option>
          </select>
          <div v-if="newStatus==='Shipped'" class="space-y-2 mb-3">
            <input v-model="courierName" class="form-input text-sm" placeholder="Courier name (e.g. DTDC)"/>
            <input v-model="courierTracking" class="form-input text-sm" placeholder="Tracking number"/>
          </div>
          <textarea v-model="statusNote" class="form-input text-sm resize-none h-16 mb-3" :placeholder="newStatus==='Cancelled' ? 'Cancellation reason (required)' : 'Internal note (optional)'"></textarea>
          <button @click="updateStatus" :disabled="updating" class="btn btn-primary w-full btn-sm">{{ updating?'Updating...':'Update Status' }}</button>
          <p v-if="updateMsg" class="text-green text-xs text-center mt-2">{{ updateMsg }}</p>
        </div>

        <!-- Actions -->
        <div class="card card-body space-y-3">
          <h3 class="font-semibold mb-1">Actions</h3>
          <a :href="waLink" target="_blank" class="btn btn-wa w-full btn-sm">💬 WhatsApp Customer</a>
          <button @click="downloadInvoice" class="btn btn-ghost w-full btn-sm">⬇ Download Invoice</button>
          <div v-if="['direct-upi','pay-at-farm'].includes(order.paymentMethod)&&order.paymentStatus==='pending'&&order.status==='New'" class="border border-amber-200 rounded-xl p-3">
            <div class="text-xs font-semibold text-amber-700 mb-2">{{ order.paymentMethod==='direct-upi' ? 'Confirm UPI Payment' : 'Record Collection Payment' }}</div>
            <input v-if="order.paymentMethod==='direct-upi'" v-model="upiRef" class="form-input text-xs mb-2" placeholder="UPI transaction reference"/>
            <button @click="confirmUPI" class="btn btn-primary w-full btn-sm text-xs">{{ order.paymentMethod==='direct-upi' ? 'Confirm Payment' : 'Record Payment' }}</button>
          </div>
          <div v-if="order.refundRequired" class="border border-red-200 rounded-lg bg-red-50 p-3 space-y-2">
            <div class="text-xs font-semibold text-red-800">Refund requires reconciliation</div>
            <input v-if="['direct-upi','pay-at-farm'].includes(order.paymentMethod)" v-model="refundReference" class="form-input text-xs" placeholder="Manual refund bank reference"/>
            <template v-else>
              <input v-model="gatewayRefundId" class="form-input text-xs" placeholder="Existing Razorpay refund ID, if any"/>
              <input v-if="gatewayRefundId" v-model="providerPaymentId" class="form-input text-xs" placeholder="Related Razorpay payment ID"/>
            </template>
            <button @click="processRefund" :disabled="processingRefund" class="btn btn-primary w-full btn-sm text-xs">
              {{ processingRefund ? 'Processing…' : ['direct-upi','pay-at-farm'].includes(order.paymentMethod) ? 'Record Manual Refund' : gatewayRefundId ? 'Reconcile Gateway Refund' : 'Process / Refresh Refund' }}
            </button>
          </div>
          <div v-if="order.paymentTransactions?.length" class="border-t border-gray-100 pt-3">
            <h4 class="text-xs font-semibold mb-2">Payment records</h4>
            <div v-for="transaction in order.paymentTransactions" :key="transaction._id" class="text-xs text-gray-600 py-1">
              {{ transaction.provider }} · {{ transaction.status }} · refund {{ transaction.refundStatus }}
              <span v-if="transaction.providerPaymentId"> · {{ transaction.providerPaymentId }}</span>
            </div>
          </div>
        </div>

        <!-- Status Timeline -->
        <div class="card card-body">
          <h3 class="font-semibold mb-3">Timeline</h3>
          <div class="space-y-3">
            <div v-for="h in order.statusHistory" :key="h.time" class="flex gap-3 text-xs">
              <div class="shrink-0 w-16 text-gray-400">{{ fmtDate(h.time) }}</div>
              <div>
                <span :class="`status-${h.status}`">{{ h.status }}</span>
                <div v-if="h.note" class="text-gray-400 mt-0.5">{{ h.note }}</div>
                <div v-if="h.adminName" class="text-gray-400 mt-0.5">By {{ h.adminName }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api.js'
import { useToastStore } from '@/stores/index.js'

const route    = useRoute()
const toast    = useToastStore()
const order    = ref(null)
const loading  = ref(true)
const newStatus = ref('')
const statusNote = ref('')
const courierName = ref('')
const courierTracking = ref('')
const upiRef   = ref('')
const refundReference = ref('')
const gatewayRefundId = ref('')
const providerPaymentId = ref('')
const processingRefund = ref(false)
const updating = ref(false)
const updateMsg = ref('')

const validStatuses = ['New','Confirmed','Packed','Shipped','Delivered','Pickup Ready','Picked-Up','Cancelled']
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : ''
const waLink  = computed(() => order.value ? `https://wa.me/91${order.value.customer.phone}?text=${encodeURIComponent(`Hi ${order.value.customer.name}! Update on your order ${order.value.orderNumber}.`)}` : '#')

const updateStatus = async () => {
  if (newStatus.value === 'Cancelled' && !String(statusNote.value || '').trim()) {
    toast.error('Cancellation reason is required.')
    return
  }
  if (newStatus.value === 'Shipped' && (!courierName.value || !courierTracking.value)) {
    toast.error('Courier name and tracking number are required.')
    return
  }
  if (newStatus.value === 'Cancelled' && !window.confirm('Cancel this order? Stock will be restored automatically.')) {
    return
  }

  updating.value = true
  try {
    const { data } = await api.patch(`/admin/orders/${route.params.id}/status`, { status: newStatus.value, note: statusNote.value, courierName: courierName.value, courierTracking: courierTracking.value })
    order.value = data.order; newStatus.value = data.order.status; updateMsg.value = '✅ Status updated!'
    setTimeout(() => updateMsg.value = '', 3000)
    toast.success(data.message || 'Order status updated.')
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to update status.')
  } finally { updating.value = false }
}

const confirmUPI = async () => {
  if (order.value.paymentMethod === 'direct-upi' && !String(upiRef.value || '').trim()) {
    toast.error('UTR number is required to confirm payment.')
    return
  }
  try {
    await api.patch(`/admin/orders/${order.value._id}/payment`, { utrNumber: upiRef.value })
    toast.success('Payment confirmed successfully.')
    await loadOrder()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to confirm payment.')
  }
}

const processRefund = async () => {
  if (processingRefund.value) return
  if (['direct-upi', 'pay-at-farm'].includes(order.value.paymentMethod) && !refundReference.value.trim()) {
    toast.error('Enter the bank refund reference before recording the refund.')
    return
  }
  processingRefund.value = true
  try {
    const { data } = await api.post(`/admin/orders/${order.value._id}/refund`, {
      refundReference: refundReference.value.trim() || undefined,
      refundId: gatewayRefundId.value.trim() || undefined,
      providerPaymentId: providerPaymentId.value.trim() || undefined
    })
    order.value = data.order
    toast.success(data.message || 'Refund state updated.')
    await loadOrder()
  } catch (err) {
    toast.error(err.response?.data?.message || 'Could not update refund state.')
  } finally {
    processingRefund.value = false
  }
}

const downloadInvoice = async () => {
  try {
    const res = await api.get(`/admin/orders/${route.params.id}/invoice`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data],{type:'application/pdf'}))
    const a = document.createElement('a'); a.href=url; a.download=`MagiliniFarms-${order.value?.orderNumber}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.error(err.response?.data?.message || 'Failed to download invoice.')
  }
}

const loadOrder = async () => {
  const { data } = await api.get(`/admin/orders/${route.params.id}`)
  order.value = data.order; newStatus.value = data.order.status; loading.value = false
}

onMounted(loadOrder)
</script>

