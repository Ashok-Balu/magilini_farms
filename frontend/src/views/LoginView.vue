<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,.18),_transparent_38%),linear-gradient(135deg,_#0f7a4b_0%,_#137d58_42%,_#d9c65d_100%)] px-4 py-6 sm:py-8 flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/60">
        <div class="bg-green px-6 sm:px-8 py-7 text-center text-white">
          <router-link to="/" class="font-serif text-2xl font-bold inline-block mb-2">Magilini🥭Farms</router-link>
          <p class="text-white/70 text-sm">Sign in to your account</p>
        </div>

        <div class="p-5 sm:p-8 space-y-5">
          <div>
            <h2 class="font-serif text-2xl mb-1">Welcome back</h2>
            <p class="text-gray-500 text-sm">Enter your email and password to continue.</p>
          </div>

          <div>
            <label class="form-label">Email</label>
            <input v-model="email" type="email" placeholder="you@email.com" :class="['form-input', fieldErrors.email && 'is-invalid']" @keyup.enter="submit"/>
            <p v-if="fieldErrors.email" class="form-error">{{ fieldErrors.email }}</p>
          </div>
          <div>
            <label class="form-label">Password</label>
            <PasswordInput v-model="password" placeholder="········" :class="fieldErrors.password && 'is-invalid'" @keyup.enter="submit"/>
            <p v-if="fieldErrors.password" class="form-error">{{ fieldErrors.password }}</p>
            <div class="text-right mt-1.5">
              <router-link to="/forgot-password" class="text-xs text-green font-medium hover:underline">Forgot Password?</router-link>
            </div>
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>

          <button @click="submit" :disabled="authStore.loading" class="btn btn-primary w-full">
            <span v-if="authStore.loading" class="spinner"></span>{{ authStore.loading ? 'Signing in…' : 'Login' }}
          </button>

          <p class="text-center text-sm text-gray-500">
            Don't have an account?
            <router-link to="/register" class="text-green font-semibold hover:underline">Create Account</router-link>
          </p>
        </div>

        <div class="px-5 sm:px-8 pb-6 sm:pb-8 text-center text-xs text-gray-400">
          By continuing you agree to our <router-link to="/terms" class="underline">Terms</router-link> and <router-link to="/privacy" class="underline">Privacy Policy</router-link>.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores/index.js'
import PasswordInput from '@/components/ui/PasswordInput.vue'
import { isRequired, isEmail, runValidation } from '@/lib/validators.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const error = ref('')
const fieldErrors = ref({})

const submit = async () => {
  error.value = ''
  fieldErrors.value = runValidation({ email: email.value, password: password.value }, {
    email: [[isRequired, 'Email is required.'], [isEmail, 'Enter a valid email address.']],
    password: [[isRequired, 'Password is required.']]
  })
  if (Object.keys(fieldErrors.value).length) return

  const result = await authStore.login(email.value.trim(), password.value)
  if (!result.success) {
    error.value = result.message
    toast.error(result.message)
    return
  }

  toast.success('Logged in successfully!')
  router.push(route.query.redirect || '/')
}
</script>

