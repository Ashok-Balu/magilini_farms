import { createApp }  from 'vue'
import { createPinia } from 'pinia'
import App    from './App.vue'
import router from './router/index.js'
import './assets/main.css'

const app   = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// Handle auth expiry globally
window.addEventListener('auth:expired', async () => {
  try {
    const { useAuthStore } = await import('./stores/index.js')
    useAuthStore().logout(true)
    const target = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
    router.push(target)
  } catch (e) { /* silent */ }
})
