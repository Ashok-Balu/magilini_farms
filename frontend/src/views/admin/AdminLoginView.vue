<template>
  <div class="min-h-screen bg-gradient-to-br from-green via-[#143D24] to-[#0D2E18] flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
      <div class="bg-gradient-to-br from-green to-green-mid p-8 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.03)%22%20stroke-width%3D%222%22/%3E%3C/svg%3E')]"></div>
        <div class="relative">
          <div class="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3 backdrop-blur-sm border border-white/20">🥭</div>
          <div class="font-serif text-2xl font-bold text-white">Magilini Farms</div>
          <div class="text-mango text-xs font-bold tracking-widest uppercase mt-1">Admin Panel</div>
        </div>
      </div>
      <div class="p-8">
        <h2 class="font-serif text-xl text-gray-900 mb-1">Welcome back</h2>
        <p class="text-xs text-gray-400 mb-6">Sign in to manage your farm store</p>
        <div class="space-y-4">
          <div>
            <label class="form-label">Email</label>
            <input v-model="email" type="text" class="form-input" placeholder="admin@magilini.farms" @keyup.enter="login"/>
          </div>
          <div>
            <label class="form-label">Password</label>
            <PasswordInput v-model="password" placeholder="••••••••" @keyup.enter="login"/>
          </div>
        </div>
        <p v-if="error" class="text-red-600 text-sm mt-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-medium">{{ error }}</p>
        <button @click="login" :disabled="loading" class="btn btn-primary w-full mt-6 py-3">
          <span v-if="loading" class="spinner"></span>{{ loading ? 'Signing in…' : 'Sign In →' }}
        </button>
        <router-link to="/" class="block text-center text-xs text-gray-400 mt-5 hover:text-green transition-colors">← Back to Store</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores/index.js'
import PasswordInput from '@/components/ui/PasswordInput.vue'

const router   = useRouter()
const auth     = useAuthStore()
const toast    = useToastStore()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

const login = async () => {
  error.value = ''
  if (!email.value.trim() || !password.value) { error.value = 'Email and password are required.'; return }
  loading.value = true
  const result = await auth.adminLogin(email.value.trim(), password.value)
  loading.value = false
  if (result.success) {
    toast.success('Welcome back!')
    router.push('/admin')
  } else {
    error.value = result.message
    toast.error(result.message)
  }
}
</script>
