<template>
  <div>
    <router-view />
    <!-- Global Toast -->
    <teleport to="body">
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center px-4 w-full max-w-sm sm:max-w-md">
        <transition-group name="toast">
          <div v-for="toast in toastStore.toasts" :key="toast.id"
            :class="['w-full sm:w-auto flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-2xl sm:rounded-full text-sm font-semibold shadow-xl text-white',
              toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-green']">
            <span class="text-base leading-none shrink-0">{{ toast.type === 'error' ? '⚠️' : toast.type === 'info' ? 'ℹ️' : '✅' }}</span>
            <span class="leading-snug">{{ toast.message }}</span>
          </div>
        </transition-group>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useToastStore, useCartStore } from '@/stores/index.js'

const toastStore = useToastStore()
const cartStore  = useCartStore()

onMounted(() => {
  cartStore.loadCart()
  Promise.all([cartStore.loadSettings(), cartStore.reconcile()]).then(([, result]) => {
    if (result.changed) toastStore.info('Your cart was updated to reflect current product availability.')
  })
})
</script>
