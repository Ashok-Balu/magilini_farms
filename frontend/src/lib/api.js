import axios from 'axios'

const rawApiUrl = String(import.meta.env.VITE_API_URL || '/api').trim()
const normalizeApiUrl = (url) => {
  if (!url) return '/api'
  const trimmed = url.replace(/\/+$|\s+/g, '')
  if (trimmed === '/api') return '/api'
  if (trimmed.endsWith('/api')) return trimmed
  return `${trimmed}/api`
}

const api = axios.create({
  baseURL: normalizeApiUrl(rawApiUrl),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
})

// Response interceptor — handle auth errors globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/logout')) {
      // Clear auth and redirect to login
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(err)
  }
)

export default api
