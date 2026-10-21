/**
 * Pruebas del flujo de registro/acceso del VENDEDOR (frontend).
 *
 * Consola: `node tests/registroVendedor.test.mjs`
 *
 * Cubre las decisiones que gobiernan el acceso del vendedor:
 *   1. El registro devuelve la sesión (token + usuario) y el frontend
 *      puede guardarla con `guardarSesion`.
 *   2. Cada rol entra a SU panel tras registrarse o iniciar sesión.
 *   3. El rol se normaliza (variantes 'VENDEDOR', 'SELLER'...).
 *   4. Recargar la página conserva la sesión (no se pierde el rol).
 *   5. Acceso directo a la ruta del panel: permitido para el vendedor.
 *   6. Un turista NO entra al panel del vendedor.
 *   7. Un vendedor NO entra al panel de administración.
 *   8. Sin sesión, la ruta protegida lleva a /login.
 *   9. El panel muestra la prueba gratuita con las fechas del backend.
 *  10. El panel ofrece contratar el plan mensual.
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
    get size() {
      return mapa.size
    },
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
  const dispatches = []
  globalThis.localStorage = crearStorage()
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }
  globalThis.window = {
    location: { pathname: '/', get href() { return '/' }, set href(_v) {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: (ev) => {
      dispatches.push(ev.type)
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

const importRoles = () => import('../src/utils/roles.js')

async function main() {
  console.log('\n=== Registro y acceso del vendedor (frontend) ===\n')

  // --- 1. El registro devuelve la sesión ---------------------------------
  await check('el registro envía el rol elegido y devuelve token + usuario', async () => {
    const env = crearEntorno()
    try {
      let url = null
      let cuerpo = null
      globalThis.fetch = async (u, opts) => {
        url = u
        cuerpo = JSON.parse(opts.body)
        return respuesta(201, {
          success: true,
          data: {
            token: 'jwt-vendedor',
            usuario: { id: 9, nombre: 'Vendedor', email: 'v@x.com', rol: 'BUSINESS' },
          },
        })
      }
      const { authAPI } = await importarApi()
      const res = await authAPI.register('Vendedor', 'v@x.com', 'Clave12345', 'BUSINESS')
      assert.ok(String(url).endsWith('/auth/register'), `url inesperada: ${url}`)
      assert.equal(cuerpo.rol, 'BUSINESS', 'debe enviar el rol elegido')
      assert.equal(res.data.token, 'jwt-vendedor', 'debe devolver el token')
      assert.equal(res.data.usuario.rol, 'BUSINESS', 'debe devolver el usuario con su rol')
    } finally {
      env.restaurar()
    }
  })

  // --- 2/3. Ruta por rol y normalización --------------------------------
  await check('cada rol entra a SU panel tras registrarse o iniciar sesión', async () => {
    const { rutaInicioPorRol, normalizarRol } = await importRoles()
    assert.equal(rutaInicioPorRol('BUSINESS'), '/panel-vendedor', 'el vendedor va a su panel')
    assert.equal(rutaInicioPorRol('ADMIN'), '/admin', 'el administrador va a su panel')
    assert.equal(rutaInicioPorRol('TOURIST'), '/', 'el turista va a la home')
    // Sin rol o con rol desconocido -> home (nunca a un panel restringido).
    assert.equal(rutaInicioPorRol(null), '/')
    assert.equal(rutaInicioPorRol('DESCONOCIDO'), '/')
  })

  await check('el rol se normaliza desde cualquier variante', async () => {
    const { normalizarRol, rutaInicioPorRol } = await importRoles()
    for (const variante of ['VENDEDOR', 'vendedor', 'VENDOR', 'SELLER', 'NEGOCIO', 'business']) {
      assert.equal(normalizarRol(variante), 'BUSINESS', `${variante} -> BUSINESS`)
      assert.equal(rutaInicioPorRol(variante), '/panel-vendedor', `${variante} -> panel`)
    }
    for (const variante of ['ADMINISTRATOR', 'admin', 0]) {
      assert.equal(normalizarRol(variante), 'ADMIN', `${variante} -> ADMIN`)
    }
    for (const variante of ['TURISTA', 'VIAJERO', 'user', 1]) {
      assert.equal(normalizarRol(variante), 'TOURIST', `${variante} -> TOURIST`)
    }
    assert.equal(normalizarRol(2), 'BUSINESS', 'rol numérico 2 -> BUSINESS')
    assert.equal(normalizarRol(undefined), 'TOURIST', 'sin rol -> TOURIST')
  })

  await check('una sesión guardada con una variante conserva el acceso del vendedor', async () => {
    const { normalizarUsuario } = await importRoles()
    // Simula el `user` guardado por una versión anterior de la app.
    const guardado = { id: 3, nombre: 'Vendedor', rol: 'VENDEDOR' }
    const restaurado = normalizarUsuario(guardado)
    assert.equal(restaurado.rol, 'BUSINESS', 'el rol se normaliza al restaurar')
    assert.equal(restaurado.id, 3, 'no se pierden los demás datos')
    assert.equal(normalizarUsuario(null), null, 'sin usuario no hay nada que restaurar')
  })

  // --- 4. La recarga conserva la sesión ---------------------------------
  await check('al recargar la página la sesión se restaura con su rol', async () => {
    const env = crearEntorno()
    try {
      // El token sigue en localStorage: la app lo restaura al montar.
      env.storage.setItem('token', 'jwt-vendedor')
      env.storage.setItem('user', JSON.stringify({ id: 9, nombre: 'Vendedor', rol: 'VENDEDOR' }))

      globalThis.fetch = async (u, opts) => {
        assert.ok(String(u).endsWith('/auth/me'), `url inesperada: ${u}`)
        assert.equal(opts.headers.Authorization, 'Bearer jwt-vendedor', 'debe enviar el token')
        return respuesta(200, { success: true, data: { id: 9, nombre: 'Vendedor', rol: 'BUSINESS' } })
      }
      const { authAPI } = await importarApi()
      const res = await authAPI.me()
      const { normalizarUsuario } = await importRoles()
      const restaurado = normalizarUsuario(res.data)
      assert.equal(restaurado.rol, 'BUSINESS', 'la sesión restaurada conserva el rol de vendedor')
      assert.equal(env.storage.has('token'), true, 'no se borra el token al recargar')
    } finally {
      env.restaurar()
    }
  })

  // --- 5/6/7/8. Decisiones de la ruta protegida -------------------------
  await check('la ruta protegida: vendedor accede, turista y admin no', async () => {
    const { destinoRutaProtegida } = await importRoles()
    const panel = ['BUSINESS', 'ADMIN']

    // Vendedor -> permitido.
    const vendedor = destinoRutaProtegida({
      rol: 'BUSINESS', rolesPermitidos: panel, autenticado: true,
    })
    assert.equal(vendedor.permitido, true, 'el vendedor puede entrar a /panel-vendedor')
    assert.equal(vendedor.destino, null, 'no se redirige')

    // Con variante de rol también.
    const variante = destinoRutaProtegida({
      rol: 'VENDEDOR', rolesPermitidos: panel, autenticado: true,
    })
    assert.equal(variante.permitido, true, 'la variante VENDEDOR también accede')

    // Administrador -> permitido.
    const admin = destinoRutaProtegida({
      rol: 'ADMIN', rolesPermitidos: panel, autenticado: true,
    })
    assert.equal(admin.permitido, true, 'el administrador puede entrar al panel del vendedor')

    // Turista -> no permitido; va a SU panel (la home), no a un error.
    const turista = destinoRutaProtegida({
      rol: 'TOURIST', rolesPermitidos: panel, autenticado: true,
    })
    assert.equal(turista.permitido, false, 'el turista NO entra al panel del vendedor')
    assert.equal(turista.destino, '/', 'el turista vuelve a la home')

    // Vendedor en el panel de ADMIN -> no permitido; va a SU panel.
    const vendedorEnAdmin = destinoRutaProtegida({
      rol: 'BUSINESS', rolesPermitidos: ['ADMIN'], autenticado: true,
    })
    assert.equal(vendedorEnAdmin.permitido, false, 'el vendedor NO entra al panel de administración')
    assert.equal(vendedorEnAdmin.destino, '/panel-vendedor', 'vuelve a su panel')

    // Sin sesión -> /login.
    const anonimo = destinoRutaProtegida({
      rol: null, rolesPermitidos: panel, autenticado: false,
    })
    assert.equal(anonimo.permitido, false)
    assert.equal(anonimo.destino, '/login', 'sin sesión va a /login')
  })

  // --- 9/10. El panel muestra la prueba y permite contratar ------------
  await check('el panel del vendedor recibe el estado con la prueba y los planes', async () => {
    const env = crearEntorno()
    try {
      const llamadas = []
      globalThis.fetch = async (u, opts) => {
        llamadas.push({ url: u, method: opts.method, body: opts.body })
        if (String(u).includes('/vendedor/estado')) {
          return respuesta(200, {
            success: true,
            data: {
              estado: 'TRIALING',
              dias_prueba: 7,
              dias_restantes: 7,
              trial_inicio: '2026-10-21T16:00:00.000Z',
              trial_fin: '2026-10-28T16:00:00.000Z',
              plan_actual: null,
              suscripciones: [],
              pagos: [],
            },
          })
        }
        return respuesta(200, {
          success: true,
          data: [
            { id: 2, nombre: 'Profesional', precio: 49000, moneda: 'COP', meses: 1, features: [] },
          ],
        })
      }
      const { vendedorAPI } = await importarApi()
      const estado = await vendedorAPI.estado()
      assert.equal(estado.data.estado, 'TRIALING', 'el panel muestra la prueba activa')
      assert.equal(estado.data.dias_restantes, 7, 'muestra los días restantes')
      assert.ok(estado.data.trial_fin, 'muestra la fecha real de finalización')

      const planes = await vendedorAPI.planes()
      assert.equal(planes.data[0].nombre, 'Profesional', 'muestra el plan comercial')
      assert.equal(Number(planes.data[0].precio), 49000, 'muestra el precio mensual')
    } finally {
      env.restaurar()
    }
  })

  await check('el catálogo de planes es público y devuelve el precio real del sistema', async () => {
    const env = crearEntorno()
    try {
      let url = null
      let headers = null
      globalThis.fetch = async (u, opts) => {
        url = u
        headers = opts.headers
        return respuesta(200, {
          success: true,
          data: [
            { id: 1, nombre: 'Gratis', precio: 0, moneda: 'COP', meses: 1, features: [] },
            { id: 2, nombre: 'Profesional', precio: 49000, moneda: 'COP', meses: 1, features: ['Soporte'] },
          ],
        })
      }
      const { vendedorAPI } = await importarApi()
      const res = await vendedorAPI.planesPublicos()
      assert.ok(String(url).endsWith('/planes-comerciales'), `url inesperada: ${url}`)
      // Es público: no debe exigir token.
      assert.equal(headers.Authorization, undefined, 'no debe exigir sesión')
      const dePago = res.data.find((p) => Number(p.precio) > 0)
      assert.equal(Number(dePago.precio), 49000, 'precio vigente del sistema')
      assert.equal(dePago.moneda, 'COP', 'moneda COP')
    } finally {
      env.restaurar()
    }
  })

  await check('el panel permite contratar el plan mensual sin enviar el importe', async () => {
    const env = crearEntorno()
    try {
      let cuerpo = null
      globalThis.fetch = async (_u, opts) => {
        cuerpo = JSON.parse(opts.body)
        return respuesta(201, {
          success: true,
          message: 'Pago aprobado (modo simulación). Tu plan quedó activo.',
          data: { suscripcion: { id: 1, estado: 'active', monto: 49000 }, sandbox: true },
        })
      }
      const { vendedorAPI } = await importarApi()
      const res = await vendedorAPI.contratar(2)
      assert.deepEqual(cuerpo, { plan_id: 2 }, 'solo se envía el plan_id')
      assert.equal(res.data.sandbox, true, 'el modo simulación se indica (no es un pago real)')
      assert.equal(res.data.suscripcion.estado, 'active', 'la suscripción queda activa')
    } finally {
      env.restaurar()
    }
  })

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`)
  process.exit(fail ? 1 : 0)
}

main()
