const BASE_URL = '/api'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
    throw new Error(data.message || 'Sesión expirada')
  }

  if (!res.ok) {
    throw new Error(data.message || 'Error del servidor')
  }

  return data
}

export const api = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (nombre, email, password, rol) => api.post('/auth/register', { nombre, email, password, rol }),
  google: (idToken, rol) => api.post('/auth/google', { idToken, rol }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updateProfile: (id, data) => api.put(`/auth/me`, data),
}

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export const lugaresAPI = {
  getAll: (search) => api.get(`/lugares${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getById: (id) => api.get(`/lugares/${id}`),
  create: (data) => api.post('/lugares', data),
  update: (id, data) => api.put(`/lugares/${id}`, data),
  delete: (id) => api.delete(`/lugares/${id}`),
}

export const usuariosAPI = {
  getAll: () => api.get('/usuarios'),
  getById: (id) => api.get(`/usuarios/${id}`),
  create: (data) => api.post('/usuarios', data),
  update: (id, data) => api.put(`/usuarios/${id}`, data),
  delete: (id) => api.delete(`/usuarios/${id}`),
  revokeSession: (id) => api.post(`/usuarios/${id}/revoke-session`),
}

export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  loginHistory: () => api.get('/admin/login-history'),
}
