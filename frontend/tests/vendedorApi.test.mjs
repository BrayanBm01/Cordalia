/**
 * Pruebas del servicio HTTP del frontend (Cordalia).
 *
 * Consola: `node tests/vendedorApi.test.mjs`
 *
 * Comprueban el CONTRATO con el backend (sin red):
 *   - El flujo turistico NO tiene pagos: `inscripcionesAPI` no expone
 *     'pagar' ni 'estadoPagos', y expone la cancelacion.
 *   - `vendedorAPI`: estado comercial, catálogo de planes, contratación
 *     y cancelacion apuntan a los endpoints correctos.
 *   - `adminVendedoresAPI`: listado y suspension de vendedores.
 *   - `authAPI.setPassword` y el flujo de recuperacion de contraseña.
 *   - El 403 de "prueba vencida" NO cierra la sesión válida (el
 *     vendedor debe poder seguir viendo su perfil y su estado).
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
  import.meta.env = { VITE_GOOGLE_CLIENT_ID: 'cid-de-prueba' }
  const eventos = []
  const dispatches = []
  globalThis.localStorage = crearStorage({
    token: 'jwt-de-prueba',
    user: JSON.stringify({ id: 1, nombre: 'Ana', rol: 'BUSINESS' }),
  })
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }
  globalThis.window = {
    location: { pathname: '/panel-vendedor', get href() { return '/panel-vendedor' }, set href(_v) {} },
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
    dispatches,
    restaurar() {
      globalThis.fetch = previo.fetch
      globalThis.window = previo.window
      globalThis.localStorage = previo.localStorage
      globalThis.CustomEvent = previo.CustomEvent
      import.meta.env = previo.importMetaEnv
    },
  }
}

function respuesta(status, cuerpo) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async text() {
      return cuerpo === undefined ? '' : JSON.stringify(cuerpo)
    },
  }
}

let n = 0
const importarApi = () => {
  n += 1
  return import(`../src/services/api.js?prueba=${n}`)
}

async function main() {
  console.log('\n=== API del vendedor, suscripciones y autenticación ===\n')

  await check('el flujo turistico NO expone pagos (inscripciones gratuitas)', async () => {
    const env = crearEntorno()
    try {
      const { inscripcionesAPI } = await importarApi()
      assert.equal(inscripcionesAPI.pagar, undefined, 'no debe existir el método pagar')
      assert.equal(inscripcionesAPI.estadoPagos, undefined, 'no debe existir estadoPagos')
      assert.equal(typeof inscripcionesAPI.cancelar, 'function', 'debe existir cancelar')
      assert.equal(typeof inscripcionesAPI.misInscripciones, 'function')
      assert.equal(typeof inscripcionesAPI.comprobante, 'function')
    } finally {
      env.restaurar()
    }
  })

  await check('vendedorAPI.estado consulta /vendedor/estado con el token de sesión', async () => {
    const env = crearEntorno()
    try {
      let url = null
      let headers = null
      globalThis.fetch = async (u, opts) => {
        url = u
        headers = opts.headers
        return respuesta(200, { data: { estado: 'TRIALING', dias_restantes: 7 } })
      }
      const { vendedorAPI } = await importarApi()
      const res = await vendedorAPI.estado()
      assert.ok(String(url).endsWith('/vendedor/estado'), `url inesperada: ${url}`)
      assert.ok(headers.Authorization === 'Bearer jwt-de-prueba', 'debe enviar el token')
      assert.equal(res.data.estado, 'TRIALING')
    } finally {
      env.restaurar()
    }
  })

  await check('vendedorAPI.planes consulta /vendedor/planes', async () => {
    const env = crearEntorno()
    try {
      let url = null
      globalThis.fetch = async (u) => {
        url = u
        return respuesta(200, { data: [{ id: 2, nombre: 'Profesional' }] })
      }
      const { vendedorAPI } = await importarApi()
      const res = await vendedorAPI.planes()
      assert.ok(String(url).endsWith('/vendedor/planes'), `url inesperada: ${url}`)
      assert.equal(res.data[0].nombre, 'Profesional')
    } finally {
      env.restaurar()
    }
  })

  await check('vendedorAPI.contratar envía SOLO el plan_id (el importe lo fija el servidor)', async () => {
    const env = crearEntorno()
    try {
      let cuerpo = null
      let url = null
      globalThis.fetch = async (u, opts) => {
        url = u
        cuerpo = JSON.parse(opts.body)
        return respuesta(201, { data: { suscripcion: { id: 1, monto: 49000 } } })
      }
      const { vendedorAPI } = await importarApi()
      const res = await vendedorAPI.contratar(2)
      assert.ok(String(url).endsWith('/vendedor/suscripciones'), `url inesperada: ${url}`)
      assert.deepEqual(cuerpo, { plan_id: 2 }, 'no debe enviar monto ni precio')
      assert.equal(res.data.suscripcion.monto, 49000)
    } finally {
      env.restaurar()
    }
  })

  await check('vendedorAPI.cancelar llama al endpoint de cancelación con PUT', async () => {
    const env = crearEntorno()
    try {
      let url = null
      let metodo = null
      globalThis.fetch = async (u, opts) => {
        url = u
        metodo = opts.method
        return respuesta(200, { data: { id: 1, estado: 'cancelled' } })
      }
      const { vendedorAPI } = await importarApi()
      await vendedorAPI.cancelar(1)
      assert.ok(String(url).endsWith('/vendedor/suscripciones/1/cancelar'), `url inesperada: ${url}`)
      assert.equal(metodo, 'PUT')
    } finally {
      env.restaurar()
    }
  })

  await check('adminVendedoresAPI expone listado y suspension con el rol ADMIN', async () => {
    const env = crearEntorno()
    try {
      const llamadas = []
      globalThis.fetch = async (u, opts) => {
        llamadas.push({ url: u, method: opts.method, body: opts.body })
        return respuesta(200, { data: [] })
      }
      const { adminVendedoresAPI } = await importarApi()
      await adminVendedoresAPI.listar()
      await adminVendedoresAPI.setEstado(9, true, 'motivo')
      assert.ok(String(llamadas[0].url).endsWith('/admin/vendedores'))
      assert.ok(String(llamadas[1].url).endsWith('/admin/vendedores/9/estado'))
      assert.equal(llamadas[1].method, 'PUT')
      assert.deepEqual(JSON.parse(llamadas[1].body), { suspendido: true, motivo: 'motivo' })
    } finally {
      env.restaurar()
    }
  })

  await check('authAPI.setPassword envía la nueva y la actual (si la hay)', async () => {
    const env = crearEntorno()
    try {
      const cuerpos = []
      globalThis.fetch = async (_u, opts) => {
        cuerpos.push(JSON.parse(opts.body))
        return respuesta(200, { message: 'ok' })
      }
      const { authAPI } = await importarApi()
      await authAPI.setPassword('NuevaClave1')
      await authAPI.setPassword('NuevaClave1', 'Actual1')
      // JSON.stringify omite los valores `undefined`: sin contraseña actual
      // el cuerpo solo lleva la nueva.
      assert.deepEqual(cuerpos[0], { password_nueva: 'NuevaClave1' })
      assert.equal(cuerpos[1].password_actual, 'Actual1')
    } finally {
      env.restaurar()
    }
  })

  await check('el flujo de recuperación de contraseña usa los endpoints correctos', async () => {
    const env = crearEntorno()
    try {
      const llamadas = []
      globalThis.fetch = async (u, opts) => {
        llamadas.push({ url: u, method: opts.method })
        return respuesta(200, { message: 'ok' })
      }
      const { authAPI } = await importarApi()
      assert.equal(typeof authAPI.recuperarPassword, 'function', 'debe existir recuperarPassword')
      assert.equal(typeof authAPI.resetearPassword, 'function', 'debe existir resetearPassword')
      await authAPI.recuperarPassword('correo@x.com')
      await authAPI.resetearPassword('token123', 'NuevaClave1')
      assert.ok(String(llamadas[0].url).endsWith('/auth/recuperar-password'))
      assert.ok(String(llamadas[1].url).endsWith('/auth/resetear-password'))
    } finally {
      env.restaurar()
    }
  })

  await check('el 403 de prueba vencida NO cierra la sesión del vendedor', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () =>
        respuesta(403, { success: false, code: 'PRUEBA_VENCIDA', message: 'Tu prueba gratuita de 7 días terminó' })
      const { vendedorAPI } = await importarApi()
      await assert.rejects(
        () => vendedorAPI.estado(),
        /prueba gratuita de 7 días terminó/
      )
      assert.equal(env.storage.has('token'), true, 'la sesión debe seguir viva')
      assert.equal(
        env.dispatches.filter((t) => t === 'cordalia:sesion-invalida').length,
        0,
        'no debe emitir el evento de sesión inválida'
      )
    } finally {
      env.restaurar()
    }
  })

  await check('el 403 de cuenta suspendida tampoco cierra la sesión', async () => {
    const env = crearEntorno()
    try {
      globalThis.fetch = async () =>
        respuesta(403, { success: false, code: 'CUENTA_SUSPENDIDA', message: 'Tu cuenta está suspendida' })
      const { api } = await importarApi()
      await assert.rejects(() => api.post('/businesses', { nombre: 'X' }), /suspendida/)
      assert.equal(env.storage.has('token'), true, 'la sesión debe seguir viva')
    } finally {
      env.restaurar()
    }
  })

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`)
  process.exit(fail ? 1 : 0)
}

main()
