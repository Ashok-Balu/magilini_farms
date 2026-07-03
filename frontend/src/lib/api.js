import axios from 'axios'

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' }
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
