<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,.18),_transparent_38%),linear-gradient(135deg,_#0f7a4b_0%,_#137d58_42%,_#d9c65d_100%)] px-4 py-6 sm:py-8 flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/60">
        <div class="bg-green px-6 sm:px-8 py-7 text-center text-white">
          <router-link to="/" class="font-serif text-2xl font-bold inline-block mb-2">Magilini🥭Farms</router-link>
          <p class="text-white/70 text-sm">Reset your password</p>
        </div>

        <div class="p-5 sm:p-8 space-y-5">
          <template v-if="!sent">
            <div>
              <h2 class="font-serif text-2xl mb-1">Forgot Password?</h2>
              <p class="text-gray-500 text-sm">Enter your email and we'll send you a reset link.</p>
            </div>
            <div>
              <label class="form-label">Email</label>
              <input v-model="email" type="email" placeholder="you@email.com" class="form-input" @keyup.enter="submit"/>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
            <button @click="submit" :disabled="authStore.loading" class="btn btn-primary w-full">
              <span v-if="authStore.loading" class="spinner"></span>{{ authStore.loading ? 'Sending…' : 'Send Reset Link' }}
            </button>
          </template>
          <template v-else>
            <div class="text-center py-4">
              <div class="text-4xl mb-3">📧</div>
              <h2 class="font-serif text-xl mb-2">Check your email</h2>
              <p class="text-gray-500 text-sm">{{ message }}</p>
            </div>
          </template>

          <p class="text-center text-sm text-gray-500">
            <router-link to="/login" class="text-green font-semibold hover:underline">← Back to Login</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore, useToastStore } from '@/stores/index.js'

const authStore = useAuthStore()
const toast = useToastStore()

const email = ref('')
const error = ref('')
const sent = ref(false)
const message = ref('')

const submit = async () => {
  error.value = ''
  if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) {
    error.value = 'Enter a valid email address.'
    return
  }

  const result = await authStore.forgotPassword(email.value.trim())
  if (!result.success) {
    error.value = result.message
    toast.error(result.message)
    return
  }

  message.value = result.message
  sent.value = true
}
</script>
