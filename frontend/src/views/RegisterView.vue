<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,.18),_transparent_38%),linear-gradient(135deg,_#0f7a4b_0%,_#137d58_42%,_#d9c65d_100%)] px-4 py-6 sm:py-8 flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/60">
        <div class="bg-green px-6 sm:px-8 py-7 text-center text-white">
          <router-link to="/" class="font-serif text-2xl font-bold inline-block mb-2">Magilini🥭Farms</router-link>
          <p class="text-white/70 text-sm">Create your account</p>
        </div>

        <div class="p-5 sm:p-8 space-y-4">
          <div>
            <h2 class="font-serif text-2xl mb-1">Sign Up</h2>
            <p class="text-gray-500 text-sm">Only a few details needed to get started.</p>
          </div>

          <div>
            <label class="form-label">Full Name *</label>
            <input v-model="form.name" type="text" placeholder="Your full name" :class="['form-input', fieldErrors.name && 'is-invalid']"/>
            <p v-if="fieldErrors.name" class="form-error">{{ fieldErrors.name }}</p>
          </div>
          <div>
            <label class="form-label">Email *</label>
            <input v-model="form.email" type="email" placeholder="you@email.com" :class="['form-input', fieldErrors.email && 'is-invalid']"/>
            <p v-if="fieldErrors.email" class="form-error">{{ fieldErrors.email }}</p>
          </div>
          <div>
            <label class="form-label">Phone (optional)</label>
            <input v-model="form.phone" type="tel" inputmode="numeric" maxlength="10" placeholder="9876543210" :class="['form-input', fieldErrors.phone && 'is-invalid']"/>
            <p v-if="fieldErrors.phone" class="form-error">{{ fieldErrors.phone }}</p>
          </div>
          <div>
            <label class="form-label">Password *</label>
            <PasswordInput v-model="form.password" placeholder="Minimum 8 characters" :class="fieldErrors.password && 'is-invalid'"/>
            <p v-if="fieldErrors.password" class="form-error">{{ fieldErrors.password }}</p>
          </div>
          <div>
            <label class="form-label">Confirm Password *</label>
            <PasswordInput v-model="form.confirmPassword" placeholder="Re-enter password" :class="fieldErrors.confirmPassword && 'is-invalid'" @keyup.enter="submit"/>
            <p v-if="fieldErrors.confirmPassword" class="form-error">{{ fieldErrors.confirmPassword }}</p>
          </div>
          <p v-if="error" class="form-error">{{ error }}</p>

          <button @click="submit" :disabled="authStore.loading" class="btn btn-primary w-full">
            <span v-if="authStore.loading" class="spinner"></span>{{ authStore.loading ? 'Creating account…' : 'Create Account' }}
          </button>

          <p class="text-center text-sm text-gray-500">
            Already have an account?
            <router-link to="/login" class="text-green font-semibold hover:underline">Login</router-link>
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
import { isRequired, isEmail, isPhone10, minLen, runValidation } from '@/lib/validators.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const form = ref({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
const error = ref('')
const fieldErrors = ref({})

const submit = async () => {
  error.value = ''
  fieldErrors.value = runValidation(form.value, {
    name: [[isRequired, 'Name is required.']],
    email: [[isRequired, 'Email is required.'], [isEmail, 'Enter a valid email address.']],
    phone: [[(v) => !v || isPhone10(v), 'Enter a valid 10-digit phone number.']],
    password: [[(v) => minLen(v, 8), 'Password must be at least 8 characters.']],
    confirmPassword: [[(v) => v === form.value.password, 'Passwords do not match.']]
  })
  if (Object.keys(fieldErrors.value).length) return

  const result = await authStore.register({
    name: form.value.name.trim(),
    email: form.value.email.trim(),
    password: form.value.password,
    confirmPassword: form.value.confirmPassword,
    phone: form.value.phone.trim() || undefined
  })

  if (!result.success) {
    error.value = result.message
    toast.error(result.message)
    return
  }

  toast.success('Account created successfully!')
  router.push(route.query.redirect || '/')
}
</script>
