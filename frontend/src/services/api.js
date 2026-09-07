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
  getBySlug: (slug) => api.get(`/lugares/slug/${slug}`),
  businesses: (id) => api.get(`/lugares/${id}/negocios`),
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

export const businessesAPI = {
  categories: () => api.get('/businesses/categories'),
  list: () => api.get('/businesses'),
  getById: (id) => api.get(`/businesses/${id}`),
  create: (data) => api.post('/businesses', data),
  update: (id, data) => api.put(`/businesses/${id}`, data),
  remove: (id) => api.delete(`/businesses/${id}`),
  setEstado: (id, estado) => api.put(`/businesses/${id}/estado`, { estado }),
  imagenes: {
    list: (id) => api.get(`/businesses/${id}/imagenes`),
    add: (id, data) => api.post(`/businesses/${id}/imagenes`, data),
    update: (id, imageId, data) => api.put(`/businesses/${id}/imagenes/${imageId}`, data),
    setPrimary: (id, imageId) => api.put(`/businesses/${id}/imagenes/${imageId}/principal`),
    remove: (id, imageId) => api.delete(`/businesses/${id}/imagenes/${imageId}`),
  },
  servicios: {
    list: (id) => api.get(`/businesses/${id}/servicios`),
    add: (id, data) => api.post(`/businesses/${id}/servicios`, data),
    update: (id, serviceId, data) => api.put(`/businesses/${id}/servicios/${serviceId}`, data),
    remove: (id, serviceId) => api.delete(`/businesses/${id}/servicios/${serviceId}`),
  },
  horarios: {
    list: (id) => api.get(`/businesses/${id}/horarios`),
    add: (id, data) => api.post(`/businesses/${id}/horarios`, data),
    update: (id, hourId, data) => api.put(`/businesses/${id}/horarios/${hourId}`, data),
    remove: (id, hourId) => api.delete(`/businesses/${id}/horarios/${hourId}`),
  },
  redes: {
    list: (id) => api.get(`/businesses/${id}/redes`),
    add: (id, data) => api.post(`/businesses/${id}/redes`, data),
    update: (id, linkId, data) => api.put(`/businesses/${id}/redes/${linkId}`, data),
    remove: (id, linkId) => api.delete(`/businesses/${id}/redes/${linkId}`),
  },
  destinos: {
    list: (id) => api.get(`/businesses/${id}/destinos`),
    set: (id, destinationId) => api.put(`/businesses/${id}/destino`, { destination_id: destinationId }),
  },
}

export const favoritosAPI = {
  destinos: {
    list: () => api.get('/favoritos/destinos'),
    add: (id) => api.post(`/favoritos/destinos/${id}`),
    remove: (id) => api.delete(`/favoritos/destinos/${id}`),
  },
  negocios: {
    list: () => api.get('/favoritos/negocios'),
    add: (id) => api.post(`/favoritos/negocios/${id}`),
    remove: (id) => api.delete(`/favoritos/negocios/${id}`),
  },
}

export const reviewsAPI = {
  getByBusiness: (id) => api.get(`/reviews/business/${id}`),
  create: (id, data) => api.post(`/reviews/business/${id}`, data),
  update: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),
  remove: (reviewId) => api.delete(`/reviews/${reviewId}`),
  reply: (reviewId, reply) => api.post(`/reviews/${reviewId}/reply`, { reply }),
  removeReply: (reviewId) => api.delete(`/reviews/${reviewId}/reply`),
  moderar: (reviewId, estado) => api.put(`/reviews/${reviewId}/moderar`, { estado }),
  all: () => api.get('/reviews'),
}
