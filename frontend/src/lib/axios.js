import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

let refreshPromise = null

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message
    console.error('API Error:', { status, message })

    const request = error.config
    const isAuthRequest = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout']
      .some((path) => request?.url?.endsWith(path))

    if (status === 401 && request && !request._retry && !isAuthRequest) {
      request._retry = true

      try {
        refreshPromise ??= api.post('/api/auth/refresh')
          .then(({ data }) => {
            localStorage.setItem('token', data.token)
            return data.token
          })
          .finally(() => {
            refreshPromise = null
          })

        const token = await refreshPromise
        request.headers.Authorization = `Bearer ${token}`
        return api(request)
      } catch (refreshError) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    if (status === 401 && !isAuthRequest) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api 