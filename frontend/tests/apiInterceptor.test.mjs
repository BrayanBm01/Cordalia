/**
 * Pruebas del interceptor HTTP (frontend) con `fetch` simulado.
 *
 * Consola: `node tests/apiInterceptor.test.mjs`
 *
 * Comprueban el contrato real del backend sin red:
 *   - 401 con token  -> limpia token+usuario, emite `cordalia:sesion-invalida`
 *                       UNA sola vez (el cierre único es de AuthContext) y NO
 *                       recarga la página (causa del 404).
 *   - 401 sin token  -> no cierra nada (una petición pública no expira sesiones).
 *   - 401 en /auth/login y /auth/google -> NO cierra sesión, muestra el motivo.
 *   - 403 (permisos / "ya hay sesión activa") -> NO cierra la sesión válida.
 *   - 429, 500 y error de red -> NO cierran sesión; informan el motivo.
 *   - Respuesta no JSON (HTML) -> ApiError con mensaje claro, sin cierre.
 *   - El aviso visible (`cordalia:sesion-expirada`) NO lo emite el interceptor
 *     (eso duplicaría notificaciones): lo emite AuthContext al cerrar.
 */
import assert from 'node:assert/strict'

let pass = 0
let fail = 0

async function check(nombre, fn) {
  try {
    await fn()
    console.log(`  ✓ ${nombre}`)
    pass++
  } catch (e) {
    console.error(`  ✗ ${nombre}\n      ${e.message}`)
    fail++
  }
}

function crearStorage(inicial = {}) {
  const mapa = new Map(Object.entries(inicial))
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    has: (k) => mapa.has(k),
  }
}

function crearEntorno() {
  const previo = {
    fetch: globalThis.fetch,
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    CustomEvent: globalThis.CustomEvent,
    importMetaEnv: import.meta.env,
  }
  // `api.js` lee import.meta.env.VITE_GOOGLE_CLIENT_ID (solo lectura).
  import.meta.env = { VITE_GOOGLE_CLIENT_ID: 'cid-de-prueba' }
  const eventos = []
  const dispatches = []
  let hrefEscrito = null
  globalThis.localStorage = crearStorage({
    token: 'jwt-de-prueba',
    user: JSON.stringify({ id: 1, nombre: 'Ana', rol: 'TOURIST' }),
  })
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }
  globalThis.window = {
    location: {
      pathname: '/perfil',
      get href() {
        return '/perfil'
      },
      set href(v) {
        hrefEscrito = v
      },
    },
    addEventListener: (t, cb) => eventos.push([t, cb]),
    removeEventListener: () => {},
    dispatchEvent: (ev) => {
      dispatches.push(ev.type)
      eventos.filter(([t]) => t === ev.type).forEach(([, cb]) => cb(ev))
      return true
    },
  }
  return {
    storage: globalThis.localStorage,
    eventos,
    dispatches,
    get hrefEscrito() {
      return hrefEscrito
    },
    restaurar() {
      globalThis.fetch = previo.fetch
      globalThis.window = previo.window
      globalThis.localStorage = previo.localStorage
      globalThis.CustomEvent = previo.CustomEvent
      import.meta.env = previo.importMetaEnv
    },
  }
}

function respuesta(status, cuerpo, { html = false } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      if (cuerpo === undefined) return ''
      return html ? `<html><body>${cuerpo}</body></html>` : JSON.stringify(cuerpo)
    },
  }
}

let n = 0
const importarApi = () => {
  n += 1
  return import(`../src/services/api.js?prueba=${n}`)
}

// Cuenta los eventos REALMENTE emitidos por el módulo bajo prueba
// (no los listeners registrados, que estaban en 1 por el propio test).
const invalidaciones = (env) =>
  env.dispatches.filter((t) => t === 'cordalia:sesion-invalida')
const avisosVisibles = (env) =>
  env.dispatches.filter((t) => t === 'cordalia:sesion-expirada')

async function main() {
  console.log('\n=== Interceptor HTTP y expiración de sesión ===\n')

  await check('401 con token: limpia sesión, emite UNA vez el aviso bajo y no recarga', async () => {
    const env = crearEntorno()
    try {
      let recibidoPorAuthContext = 0
      // AuthContext escucha este evento de bajo nivel para cerrar UNA sola vez.
      globalThis.window.addEventListener('cordalia:sesion-invalida', () => {
        recibidoPorAuthContext++
      })
      globalThis.fetch = async () => respuesta(401, { message: 'Sesión expirada' })
      const { api } = await importarApi()
      await assert.rejects(() => api.get('/auth/me'), /Sesión expirada/)
      assert.equal(env.storage.has('token'), false, 'debe borrar el token')
      assert.equal(env.storage.has('user'), false, 'debe borrar el usuario')
      assert.equal(invalidaciones(env).length, 1, 'un único evento de sesión inválida')
      assert.equal(recibidoPorAuthContext, 1, 'el consumidor recibe el aviso una sola vez')
      assert.equal(
        avisosVisibles(env).length,
        0,
        'el interceptor NO emite el aviso visible (lo emite AuthContext al cerrar)'
      )
      assert.equal(env.hrefEscrito, null, 'no debe recargar la página (evita el 404)')
    } finally {
      env.restaurar()
    }
  })

  await check('401 sin token: no cierra ni avisa (petición anónima)', async () => {
    const env = crearEntorno()
    try {
      env.storage.removeItem('token')
      globalThis.fetch = async () => respuesta(401, { message: 'No autorizado' })
      const { api } = await importarApi()
      await assert.rejects(() => api.get('/lugares'))
      assert.equal(invalidaciones(env).length, 0, 'sin token no hay expiración')
      assert.equal(env.storage.has('user'), true, 'no debe tocar el usuario')
    } finally {
      env.restaurar()
    }
  })

  await check('401 en /auth/login: no cierra sesión, deja ver el motivo', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(401, { message: 'Credenciales inválidas' })
      const { authAPI } = await importarApi()
      await assert.rejects(() => authAPI.login('a@b.com', 'mala'), /Credenciales inválidas/)
      assert.equal(invalidaciones(env).length, 0, 'un login fallido no expira sesiones')
      assert.equal(env.storage.has('token'), true, 'conserva la sesión existente')
      assert.equal(env.hrefEscrito, null)
    } finally {
      env.restaurar()
    }
  })

  await check('401 en /auth/google: no cierra sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(401, { message: 'Token de Google inválido' })
      const { authAPI } = await importarApi()
      await assert.rejects(() => authAPI.google('malo'), /Token de Google inválido/)
      assert.equal(invalidaciones(env).length, 0)
    } finally {
      env.restaurar()
    }
  })

  await check('403 ("ya hay sesión activa"): NO cierra la sesión válida', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(403, { message: 'Ya hay una sesión activa' })
      const { authAPI } = await importarApi()
      await assert.rejects(() => authAPI.login('a@b.com', 'buena'), /sesión activa/)
      assert.equal(invalidaciones(env).length, 0, '403 es permisos, no expiración')
      assert.equal(env.storage.has('token'), true, 'debe conservar la sesión')
      assert.equal(env.storage.has('user'), true)
    } finally {
      env.restaurar()
    }
  })

  await check('403 de permisos en ruta protegida: no cierra sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(403, { message: 'No tienes permisos' })
      const { api } = await importarApi()
      const err = await api.get('/admin/stats').catch((e) => e)
      assert.equal(err.status, 403)
      assert.equal(invalidaciones(env).length, 0)
      assert.equal(env.storage.has('token'), true)
    } finally {
      env.restaurar()
    }
  })

  await check('429 (rate limit): no cierra sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(429, { message: 'Demasiados intentos' })
      const { authAPI } = await importarApi()
      const err = await authAPI.login('a@b.com', 'x').catch((e) => e)
      assert.equal(err.status, 429)
      assert.equal(invalidaciones(env).length, 0)
    } finally {
      env.restaurar()
    }
  })

  await check('500 del servidor: no cierra sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(500, { message: 'Error interno' })
      const { api } = await importarApi()
      const err = await api.get('/lugares').catch((e) => e)
      assert.equal(err.status, 500)
      assert.equal(invalidaciones(env).length, 0)
      assert.equal(env.hrefEscrito, null, 'un 500 no debe redirigir')
    } finally {
      env.restaurar()
    }
  })

  await check('error de red: mensaje claro y sin cierre de sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => {
        throw new TypeError('Failed to fetch')
      }
      const { api } = await importarApi()
      const err = await api.get('/lugares').catch((e) => e)
      assert.equal(err.name, 'ApiError')
      assert.equal(err.status, null)
      assert.match(err.message, /No se pudo conectar con el servidor/)
      assert.equal(invalidaciones(env).length, 0)
    } finally {
      env.restaurar()
    }
  })

  await check('respuesta HTML inesperada: ApiError claro, sin cierre', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(200, '404 Not Found', { html: true })
      const { api } = await importarApi()
      const err = await api.get('/lugares').catch((e) => e)
      assert.equal(err.name, 'ApiError')
      assert.match(err.message, /HTML|no reconocida/)
      assert.equal(invalidaciones(env).length, 0)
    } finally {
      env.restaurar()
    }
  })

  await check('304 u otras respuestas sin cuerpo JSON: no cierran sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(200, undefined)
      const { api } = await importarApi()
      const data = await api.get('/auth/me')
      assert.equal(data, null)
      assert.equal(invalidaciones(env).length, 0)
    } finally {
      env.restaurar()
    }
  })

  await check('respuesta compatible: devuelve los datos y conserva la sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () => respuesta(200, { data: { id: 7, nombre: 'Ana' } })
      const { authAPI } = await importarApi()
      const res = await authAPI.me()
      assert.deepEqual(res.data, { id: 7, nombre: 'Ana' })
      assert.equal(invalidaciones(env).length, 0)
      assert.equal(env.storage.has('token'), true)
    } finally {
      env.restaurar()
    }
  })

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`)
  process.exit(fail ? 1 : 0)
}

main()
