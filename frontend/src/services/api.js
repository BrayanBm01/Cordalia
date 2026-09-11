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

function buildQuery(params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, v))
    } else {
      qs.append(key, value)
    }
  })
  const qsStr = qs.toString()
  return qsStr ? `?${qsStr}` : ''
}

// Planes turísticos y promociones (precios SOLO informativos, sin pagos)
export const planesAPI = {
  list: (params) => api.get(`/planes${buildQuery(params)}`),
  getById: (id) => api.get(`/planes/${id}`),
  precio: (id, personas) => api.get(`/planes/${id}/precio?personas=${personas}`),
  salidas: (id) => api.get(`/planes/${id}/salidas`),
  transporteSugerir: (id, personas) => api.get(`/planes/${id}/transporte/sugerir?personas=${personas}`),
  transporteSalida: (planId, salidaId) => api.get(`/planes/${planId}/salidas/${salidaId}/transporte`),
  inscribir: (businessId, planId, salidaId, data) =>
    api.post(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/inscripciones`, data),
}

export const businessPlanesAPI = {
  list: (businessId) => api.get(`/businesses/${businessId}/planes`),
  getById: (businessId, planId) => api.get(`/businesses/${businessId}/planes/${planId}`),
  create: (businessId, data) => api.post(`/businesses/${businessId}/planes`, data),
  update: (businessId, planId, data) => api.put(`/businesses/${businessId}/planes/${planId}`, data),
  remove: (businessId, planId) => api.delete(`/businesses/${businessId}/planes/${planId}`),
  setEstado: (businessId, planId, estado) => api.put(`/businesses/${businessId}/planes/${planId}/estado`, { estado }),
  imagenes: {
    add: (businessId, planId, data) => api.post(`/businesses/${businessId}/planes/${planId}/imagenes`, data),
    setPrimary: (businessId, planId, imageId) => api.put(`/businesses/${businessId}/planes/${planId}/imagenes/${imageId}/principal`),
    remove: (businessId, planId, imageId) => api.delete(`/businesses/${businessId}/planes/${planId}/imagenes/${imageId}`),
  },
  precio: (businessId, planId, personas) =>
    api.get(`/businesses/${businessId}/planes/${planId}/precio?personas=${personas}`),
  salidas: {
    list: (businessId, planId) => api.get(`/businesses/${businessId}/planes/${planId}/salidas`),
    create: (businessId, planId, data) => api.post(`/businesses/${businessId}/planes/${planId}/salidas`, data),
    update: (businessId, planId, salidaId, data) => api.put(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}`, data),
    remove: (businessId, planId, salidaId) => api.delete(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}`),
    inscripciones: {
      list: (businessId, planId, salidaId) => api.get(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/inscripciones`),
      create: (businessId, planId, salidaId, data) => api.post(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/inscripciones`, data),
      cancelar: (businessId, planId, salidaId, inscripcionId) =>
        api.put(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/inscripciones/${inscripcionId}/cancelar`),
      resumen: (businessId, planId, salidaId) =>
        api.get(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/inscripciones/resumen`),
    },
    transporte: {
      sugerir: (businessId, planId, salidaId) =>
        api.get(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/transporte/sugerir`),
      asignados: (businessId, planId, salidaId) =>
        api.get(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/transporte`),
      asignar: (businessId, planId, salidaId, data) =>
        api.post(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/transporte`, data),
      quitar: (businessId, planId, salidaId, transporteId) =>
        api.delete(`/businesses/${businessId}/planes/${planId}/salidas/${salidaId}/transporte/${transporteId}`),
    },
  },
  transporte: {
    list: (businessId, planId) => api.get(`/businesses/${businessId}/planes/${planId}/transporte`),
    add: (businessId, planId, data) => api.post(`/businesses/${businessId}/planes/${planId}/transporte`, data),
    remove: (businessId, planId, transporteId) => api.delete(`/businesses/${businessId}/planes/${planId}/transporte/${transporteId}`),
    sugerir: (businessId, planId, personas) =>
      api.get(`/businesses/${businessId}/planes/${planId}/transporte/sugerir?personas=${personas}`),
  },
}

export const businessFlotaAPI = {
  vehiculos: {
    list: (businessId) => api.get(`/businesses/${businessId}/vehiculos`),
    add: (businessId, data) => api.post(`/businesses/${businessId}/vehiculos`, data),
    update: (businessId, vehiculoId, data) => api.put(`/businesses/${businessId}/vehiculos/${vehiculoId}`, data),
    remove: (businessId, vehiculoId) => api.delete(`/businesses/${businessId}/vehiculos/${vehiculoId}`),
  },
  conductores: {
    list: (businessId) => api.get(`/businesses/${businessId}/conductores`),
    add: (businessId, data) => api.post(`/businesses/${businessId}/conductores`, data),
    update: (businessId, conductorId, data) => api.put(`/businesses/${businessId}/conductores/${conductorId}`, data),
    remove: (businessId, conductorId) => api.delete(`/businesses/${businessId}/conductores/${conductorId}`),
  },
}

export const promocionesAPI = {
  list: (businessId) => api.get(`/businesses/${businessId}/promociones`),
  create: (businessId, data) => api.post(`/businesses/${businessId}/promociones`, data),
  update: (businessId, promoId, data) => api.put(`/businesses/${businessId}/promociones/${promoId}`, data),
  remove: (businessId, promoId) => api.delete(`/businesses/${businessId}/promociones/${promoId}`),
  setEstado: (businessId, promoId, estado) => api.put(`/businesses/${businessId}/promociones/${promoId}/estado`, { estado }),
}
