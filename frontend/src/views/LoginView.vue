<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,.18),_transparent_38%),linear-gradient(135deg,_#0f7a4b_0%,_#137d58_42%,_#d9c65d_100%)] px-4 py-6 sm:py-8 flex items-center justify-center">
    <div class="w-full max-w-md">
      <div class="bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/60">
        <div class="bg-green px-6 sm:px-8 py-7 text-center text-white">
          <router-link to="/" class="font-serif text-2xl font-bold inline-block mb-2">Magilini🥭Farms</router-link>
          <p class="text-white/70 text-sm">Phone-only login for customers</p>
        </div>

        <div class="p-5 sm:p-8">
          <div v-if="step === 'phone'" class="space-y-5">
            <div>
              <h2 class="font-serif text-2xl mb-1">Welcome</h2>
              <p class="text-gray-500 text-sm">Enter your 10-digit mobile number to continue.</p>
            </div>
            <div>
              <label class="form-label">Phone Number</label>
              <div class="flex gap-2">
                <span class="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 shrink-0">+91</span>
                <input
                  ref="phoneInputRef"
                  v-model="phone"
                  type="tel"
                  inputmode="numeric"
                  maxlength="10"
                  placeholder="9876543210"
                  class="form-input flex-1"
                  @keyup.enter="sendOtp"
                />
              </div>
              <p v-if="phoneError" class="form-error mt-2">{{ phoneError }}</p>
            </div>
            <button @click="sendOtp" :disabled="authStore.loading || sendingOtp" class="btn btn-primary w-full">
              {{ authStore.loading || sendingOtp ? 'Sending OTP…' : 'Send OTP' }}
            </button>
            <p class="text-center text-xs text-gray-400">Development mode shows OTP in the server console.</p>
            <button
              v-if="isDev"
              @click="clearDevOtpRecords"
              :disabled="clearingOtpRecords"
              class="w-full text-sm text-green underline"
            >
              {{ clearingOtpRecords ? 'Clearing OTP records…' : 'Clear OTP records (Dev)' }}
            </button>
          </div>

          <div v-else-if="step === 'otp'" class="space-y-5">
            <button @click="backToPhone" class="text-green text-sm font-semibold flex items-center gap-1">← Change number</button>
            <div>
              <h2 class="font-serif text-2xl mb-1">Verify OTP</h2>
              <p class="text-gray-500 text-sm">Sent to +91 {{ phone }}</p>
            </div>
            <div class="flex justify-between gap-2 sm:gap-3">
              <input
                v-for="(_, index) in 4"
                :key="index"
                :ref="(el) => { if (el) otpRefs[index] = el }"
                v-model="otpDigits[index]"
                type="tel"
                inputmode="numeric"
                maxlength="1"
                class="w-12 h-12 sm:w-14 sm:h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-2xl outline-none focus:border-green transition-colors"
                @input="handleOtpInput(index)"
                @keydown.backspace="handleOtpBackspace(index)"
              />
            </div>
            <p v-if="otpError" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{{ otpError }}</p>
            <button @click="verifyOtp" :disabled="authStore.loading || verifyingOtp || otp.length !== 4" class="btn btn-primary w-full">
              {{ authStore.loading || verifyingOtp ? 'Verifying…' : 'Verify OTP' }}
            </button>
            <div class="flex items-center justify-between text-sm gap-3">
              <button v-if="canResend" @click="sendOtp" class="font-semibold text-green">Resend OTP</button>
              <span v-else class="text-gray-400">Resend in {{ countdown }}s</span>
              <span class="text-gray-400">{{ isDev ? 'Unlimited tries in development' : '3 tries max' }}</span>
            </div>
          </div>

          <div v-else-if="step === 'profile'" class="space-y-5">
            <div>
              <h2 class="font-serif text-2xl mb-1">Complete Profile</h2>
              <p class="text-gray-500 text-sm">New customers only need a name. Email and address are optional.</p>
            </div>
            <div class="space-y-4">
              <div>
                <label class="form-label">Name *</label>
                <input v-model="profile.name" type="text" placeholder="Your full name" class="form-input" />
              </div>
              <div>
                <label class="form-label">Email (optional)</label>
                <input v-model="profile.email" type="email" placeholder="you@email.com" class="form-input" />
              </div>
              <div>
                <label class="form-label">Address (optional)</label>
                <textarea v-model="profile.address" rows="3" placeholder="Door no, street, area, city, pincode" class="form-input resize-none"></textarea>
              </div>
            </div>
            <p v-if="profileError" class="form-error">{{ profileError }}</p>
            <button @click="completeProfile" :disabled="authStore.loading || completingProfile || !profile.name.trim()" class="btn btn-primary w-full">
              {{ authStore.loading || completingProfile ? 'Creating account…' : 'Create Account' }}
            </button>
          </div>
        </div>

        <div class="px-5 sm:px-8 pb-6 sm:pb-8 text-center text-xs text-gray-400">
          By continuing you agree to our <router-link to="/terms" class="underline">Terms</router-link> and <router-link to="/privacy" class="underline">Privacy Policy</router-link>.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore, useToastStore } from '@/stores/index.js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const step = ref('phone')
const phone = ref('')
const otpDigits = ref(['', '', '', ''])
const otpRefs = ref([])
const profile = ref({ name: '', email: '', address: '' })
const phoneError = ref('')
const otpError = ref('')
const profileError = ref('')
const sendingOtp = ref(false)
const verifyingOtp = ref(false)
const completingProfile = ref(false)
const countdown = ref(0)
const canResend = ref(false)
const phoneInputRef = ref(null)
const isDev = import.meta.env.DEV
const clearingOtpRecords = ref(false)
let timer

const otp = computed(() => otpDigits.value.join(''))

const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10)

const clearTimer = () => {
  if (timer) clearInterval(timer)
  timer = null
}

const startCountdown = () => {
  clearTimer()
  canResend.value = false
  countdown.value = 30
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearTimer()
      canResend.value = true
      countdown.value = 0
    }
  }, 1000)
}

const focusOtp = async (index = 0) => {
  await nextTick()
  otpRefs.value[index]?.focus?.()
}

const backToPhone = async () => {
  step.value = 'phone'
  otpError.value = ''
  profileError.value = ''
  phoneError.value = ''
  await nextTick()
  phoneInputRef.value?.focus?.()
}

const sendOtp = async () => {
  phoneError.value = ''
  otpError.value = ''
  profileError.value = ''
  phone.value = normalizePhone(phone.value)
  if (!/^\d{10}$/.test(phone.value)) {
    phoneError.value = 'Enter a valid 10-digit mobile number.'
    toast.error(phoneError.value)
    return
  }

  sendingOtp.value = true
  const result = await authStore.sendOtp(phone.value)
  sendingOtp.value = false

  if (!result.success) {
    phoneError.value = result.message
    toast.error(result.message)
    return
  }

  step.value = 'otp'
  otpDigits.value = ['', '', '', '']
  startCountdown()
  toast.success(result.message || 'OTP sent successfully.')
  await focusOtp(0)
}

const handleOtpInput = (index) => {
  const digit = String(otpDigits.value[index] || '').replace(/\D/g, '').slice(-1)
  otpDigits.value[index] = digit
  if (digit && index < 3) {
    focusOtp(index + 1)
  }
  if (otp.value.length === 4) {
    verifyOtp()
  }
}

const handleOtpBackspace = (index) => {
  if (!otpDigits.value[index] && index > 0) {
    focusOtp(index - 1)
  }
}

const verifyOtp = async () => {
  otpError.value = ''
  if (otp.value.length !== 4) return

  verifyingOtp.value = true
  const result = await authStore.verifyOtp(phone.value, otp.value)
  verifyingOtp.value = false

  if (!result.success) {
    if (result.otpResent) {
      otpError.value = ''
      otpDigits.value = ['', '', '', '']
      startCountdown()
      toast.info(result.message || 'OTP expired. A new OTP has been generated.')
      await focusOtp(0)
      return
    }
    otpError.value = result.message
    toast.error(result.message)
    return
  }

  toast.success(result.message || 'OTP verified.')
  if (result.needsProfileCompletion) {
    step.value = 'profile'
    return
  }

  router.push(route.query.redirect || '/')
}

const clearDevOtpRecords = async () => {
  clearingOtpRecords.value = true
  const result = await authStore.clearDevOtpRecords()
  clearingOtpRecords.value = false
  if (!result.success) {
    toast.error(result.message)
    return
  }

  toast.success(result.message || 'Development OTP records cleared.')
}

const completeProfile = async () => {
  profileError.value = ''
  if (!profile.value.name.trim()) {
    profileError.value = 'Please enter your name.'
    toast.error(profileError.value)
    return
  }

  completingProfile.value = true
  const result = await authStore.completeProfile({
    name: profile.value.name.trim(),
    email: profile.value.email.trim() || undefined,
    address: profile.value.address.trim()
      ? { line1: profile.value.address.trim() }
      : undefined
  })
  completingProfile.value = false

  if (!result.success) {
    profileError.value = result.message
    toast.error(result.message)
    return
  }

  toast.success(result.message || 'Account created successfully.')
  router.push(route.query.redirect || '/')
}

onBeforeUnmount(() => clearTimer())
</script>
