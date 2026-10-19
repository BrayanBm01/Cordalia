const BASE_URL = '/api'

/**
 * Error de API con el status HTTP real, para que la interfaz pueda distinguir
 * entre credenciales inválidas (401), sesión ya activa (403), rate limit (429),
 * servidor caído (500/502/503) o backend no disponible (sin status).
 */
export class ApiError extends Error {
  constructor(message, status = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Lee el cuerpo de la respuesta sin asumir que siempre es JSON.
 * Si el backend (o un rewrite/proxy) devuelve HTML o texto plano, se produce
 * un mensaje diagnóstico en lugar de un críptico "Unexpected token <".
 */
async function leerCuerpo(res) {
  const texto = await res.text()
  if (!texto) return { data: null, json: true }

  try {
    return { data: JSON.parse(texto), json: true }
  } catch {
    const esHtml = /^\s*</.test(texto)
    return {
      data: null,
      json: false,
      mensaje: esHtml
        ? `El servidor respondió con HTML (${res.status}). Verifica que el backend esté disponible y que el proxy /api esté configurado.`
        : texto.slice(0, 200),
    }
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      null
    )
  }

  const { data, json, mensaje } = await leerCuerpo(res)

  // Sesión inválida/expirada: se limpia el estado local, salvo en el propio
  // intento de login de Google (para poder mostrar el motivo real en pantalla).
  if (res.status === 401) {
    const esIntentoDeLogin = endpoint.startsWith('/auth/google') || endpoint.startsWith('/auth/login')
    if (!esIntentoDeLogin) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    throw new ApiError(
      json ? data.message || 'Sesión expirada' : mensaje || 'Sesión expirada',
      401
    )
  }

  if (!res.ok) {
    throw new ApiError(json ? data.message || 'Error del servidor' : mensaje || 'Error del servidor', res.status)
  }

  if (!json) {
    throw new ApiError(mensaje || 'Respuesta del servidor no reconocida', res.status)
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
  contenido: (id) => api.get(`/lugares/${id}/contenido`),
  presupuesto: (id) => api.get(`/lugares/${id}/presupuesto`),
  administrar: (id) => api.get(`/lugares/${id}/administrar`),
  assignActividad: (id, actividadId, orden = 0) =>
    api.post(`/lugares/${id}/administrar/contenido/actividades`, { actividad_id: actividadId, orden }),
  unassignActividad: (id, actividadId) =>
    api.delete(`/lugares/${id}/administrar/contenido/actividades/${actividadId}`),
  assignPunto: (id, puntoId, orden = 0) =>
    api.post(`/lugares/${id}/administrar/contenido/puntos`, { punto_interes_id: puntoId, orden }),
  unassignPunto: (id, puntoId) =>
    api.delete(`/lugares/${id}/administrar/contenido/puntos/${puntoId}`),
  saveInfoViaje: (id, data) => api.post(`/lugares/${id}/administrar/info-viaje`, data),
}

export const contenidoAPI = {
  actividades: {
    list: (activo) => api.get(`/contenido/actividades${activo ? `?activo=${activo}` : ''}`),
    create: (data) => api.post('/contenido/actividades', data),
    update: (id, data) => api.put(`/contenido/actividades/${id}`, data),
    remove: (id) => api.delete(`/contenido/actividades/${id}`),
  },
  puntos: {
    list: (activo) => api.get(`/contenido/puntos${activo ? `?activo=${activo}` : ''}`),
    create: (data) => api.post('/contenido/puntos', data),
    update: (id, data) => api.put(`/contenido/puntos/${id}`, data),
    remove: (id) => api.delete(`/contenido/puntos/${id}`),
  },
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

// Inscripciones y pagos del turista (Cordalia)
export const inscripcionesAPI = {
  misInscripciones: () => api.get('/mis-inscripciones'),
  comprobante: (id) => api.get(`/inscripciones/${id}/comprobante`),
  pagar: (id, metodoPago) => api.post(`/inscripciones/${id}/pagar`, { metodo_pago: metodoPago }),
  estadoPagos: () => api.get('/pagos/estado'),
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
