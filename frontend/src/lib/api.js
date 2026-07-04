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
    const requestUrl = String(err.config?.url || '')
    const isAuthMeRequest = requestUrl.includes('/auth/me')
    const isLogoutRequest = requestUrl.includes('/auth/logout')

    if (err.response?.status === 401 && !isLogoutRequest && !isAuthMeRequest) {
      // Clear auth and redirect to login only for protected actions,
      // not for the initial /auth/me auth-check request.
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(err)
  }
)

export default api
