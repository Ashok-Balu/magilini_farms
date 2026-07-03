<template>
  <div>
    <router-view />
    <!-- Global Toast -->
    <teleport to="body">
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center">
        <transition-group name="toast">
          <div v-for="toast in toastStore.toasts" :key="toast.id"
            :class="['px-5 py-3 rounded-full text-sm font-semibold shadow-xl text-white',
              toast.type === 'error' ? 'bg-red-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-green']">
            {{ toast.message }}
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
})
</script>
