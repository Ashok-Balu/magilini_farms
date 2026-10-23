<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,.18),_transparent_38%),linear-gradient(135deg,_#0f7a4b_0%,_#137d58_42%,_#d9c65d_100%)] px-4 py-6 sm:py-8 flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/60">
        <div class="bg-green px-6 sm:px-8 py-7 text-center text-white">
          <router-link to="/" class="font-serif text-2xl font-bold inline-block mb-2">Magilini🥭Farms</router-link>
          <p class="text-white/70 text-sm">Set a new password</p>
        </div>

        <div class="p-5 sm:p-8 space-y-5">
          <template v-if="!done">
            <div>
              <h2 class="font-serif text-2xl mb-1">Reset Password</h2>
              <p class="text-gray-500 text-sm">Enter your new password below.</p>
            </div>
            <div>
              <label class="form-label">New Password</label>
              <PasswordInput v-model="password" placeholder="Minimum 8 characters" :class="fieldErrors.password && 'is-invalid'"/>
              <p v-if="fieldErrors.password" class="form-error">{{ fieldErrors.password }}</p>
            </div>
            <div>
              <label class="form-label">Confirm Password</label>
              <PasswordInput v-model="confirmPassword" placeholder="Re-enter password" :class="fieldErrors.confirmPassword && 'is-invalid'" @keyup.enter="submit"/>
              <p v-if="fieldErrors.confirmPassword" class="form-error">{{ fieldErrors.confirmPassword }}</p>
            </div>
            <p v-if="error" class="form-error">{{ error }}</p>
            <button @click="submit" :disabled="authStore.loading" class="btn btn-primary w-full">
              <span v-if="authStore.loading" class="spinner"></span>{{ authStore.loading ? 'Resetting…' : 'Reset Password' }}
            </button>
          </template>
          <template v-else>
            <div class="text-center py-4">
              <div class="text-4xl mb-3">✅</div>
              <h2 class="font-serif text-xl mb-2">Password updated</h2>
              <p class="text-gray-500 text-sm mb-4">You can now log in with your new password.</p>
              <router-link to="/login" class="btn btn-primary w-full inline-block">Go to Login</router-link>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores/index.js'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import { minLen, runValidation } from '@/lib/validators.js'

const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const done = ref(false)
const fieldErrors = ref({})

const submit = async () => {
  error.value = ''
  fieldErrors.value = runValidation({ password: password.value, confirmPassword: confirmPassword.value }, {
    password: [[(v) => minLen(v, 8), 'Password must be at least 8 characters.']],
    confirmPassword: [[(v) => v === password.value, 'Passwords do not match.']]
  })
  if (Object.keys(fieldErrors.value).length) return

  const result = await authStore.resetPassword(route.params.token, password.value)
  if (!result.success) {
    error.value = result.message
    toast.error(result.message)
    return
  }

  toast.success('Password reset successfully!')
  done.value = true
}
</script>
