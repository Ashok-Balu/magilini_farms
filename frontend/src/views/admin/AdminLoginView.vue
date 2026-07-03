<template>
  <div class="min-h-screen bg-green flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
      <div class="bg-green p-8 text-center border-b border-white/10">
        <div class="font-serif text-2xl font-bold text-white mb-1">Magilini🥭Farms</div>
        <div class="text-white/60 text-sm">Admin Panel</div>
      </div>
      <div class="p-8">
        <h2 class="font-serif text-2xl mb-6">Admin Login</h2>
        <div class="space-y-4">
          <div>
            <label class="form-label">Email or username</label>
            <input v-model="email" type="text" class="form-input" placeholder="admin" @keyup.enter="login"/>
          </div>
          <div>
            <label class="form-label">Password</label>
            <input v-model="password" type="password" class="form-input" placeholder="Your password" @keyup.enter="login"/>
          </div>
        </div>
        <p v-if="error" class="text-red-500 text-sm mt-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ error }}</p>
        <button @click="login" :disabled="loading" class="btn btn-primary w-full mt-6">
          {{ loading ? 'Signing in…' : 'Sign In →' }}
        </button>
        <router-link to="/" class="block text-center text-xs text-gray-400 mt-4 hover:text-green">← Back to Store</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/index.js'

const router   = useRouter()
const auth     = useAuthStore()
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const error    = ref('')

const login = async () => {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Email and password are required.'; return }
  loading.value = true
  const result = await auth.adminLogin(email.value, password.value)
  loading.value = false
  if (result.success) router.push('/admin')
  else error.value = result.message
}
</script>

