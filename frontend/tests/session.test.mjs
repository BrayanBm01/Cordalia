/**
 * Pruebas del ciclo de expiración de sesión (frontend, sin navegador).
 *
 * Consola: `node tests/session.test.mjs`
 *
 * Verifican la causa raíz del 404 de Vercel y el contrato del cierre de sesión:
 *   - No existe ninguna redirección por `window.location.href` (recarga dura):
 *     en Vercel esa recarga a una ruta client-side devuelve 404 NOT_FOUND.
 *   - El destino de la expiración es una ruta PÚBLICA REAL del router ('/').
 *   - El aviso de expiración se consume una sola vez (sin duplicados).
 *   - El cierre manual NO marca aviso de inactividad.
 *   - Solo el 401 cierra la sesión: 403/429/5xx/red NO lo hacen.
 *   - El temporizador de inactividad es único (8 minutos) y se limpia.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(__dirname, '../src')

let pass = 0
let fail = 0

function check(nombre, fn) {
  try {
    fn()
    console.log(`  ✓ ${nombre}`)
    pass++
  } catch (e) {
    console.error(`  ✗ ${nombre}\n      ${e.message}`)
    fail++
  }
}

async function checkAsync(nombre, fn) {
  try {
    await fn()
    console.log(`  ✓ ${nombre}`)
    pass++
  } catch (e) {
    console.error(`  ✗ ${nombre}\n      ${e.message}`)
    fail++
  }
}

const leer = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8')

/* ── Stub mínimo de DOM/sessionStorage para importar los módulos ────────── */
function crearStorage() {
  const mapa = new Map()
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
    removeItem: (k) => mapa.delete(k),
    clear: () => mapa.clear(),
  }
}

function instalarGlobals() {
  const previo = {
    window: globalThis.window,
    sessionStorage: globalThis.sessionStorage,
    localStorage: globalThis.localStorage,
    CustomEvent: globalThis.CustomEvent,
  }
  const eventos = []
  const localStorage = crearStorage()
  const sessionStorage = crearStorage()
  globalThis.localStorage = localStorage
  globalThis.sessionStorage = sessionStorage
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type
      this.detail = init.detail
    }
  }
  globalThis.window = {
    location: { pathname: '/perfil', href: '/perfil' },
    addEventListener: (t, cb) => eventos.push([t, cb]),
    removeEventListener: (t, cb) => {
      const i = eventos.findIndex(([et, ecb]) => et === t && ecb === cb)
      if (i >= 0) eventos.splice(i, 1)
    },
    dispatchEvent: (ev) => {
      eventos.filter(([t]) => t === ev.type).forEach(([, cb]) => cb(ev))
      return true
    },
  }
  return {
    localStorage,
    sessionStorage,
    eventos,
    restaurar() {
      globalThis.window = previo.window
      globalThis.sessionStorage = previo.sessionStorage
      globalThis.localStorage = previo.localStorage
      globalThis.CustomEvent = previo.CustomEvent
    },
  }
}

let n = 0
const importarSesion = () => {
  n += 1
  return import(`../src/utils/session.js?prueba=${n}`)
}

async function main() {
  console.log('\n=== Ciclo de expiración de sesión (frontend) ===\n')

  /* ── Causa raíz: nunca recarga dura a una ruta client-side ───────────── */
  check('api.js NO usa window.location.href (causa del 404 de Vercel)', () => {
    const api = leer('services/api.js')
    assert.ok(
      !/window\.location\.href\s*=/.test(api),
      'api.js no debe recargar con window.location.href'
    )
    assert.ok(
      !/window\.location\.replace\(/.test(api),
      'api.js no debe redirigir con window.location.replace'
    )
  })

  check('AuthContext.jsx NO usa window.location.href', () => {
    const ctx = leer('context/AuthContext.jsx')
    assert.ok(
      !/window\.location\.href\s*=/.test(ctx),
      'AuthContext no debe recargar con window.location.href'
    )
  })

  check('api.js emite un evento de bajo nivel en lugar de navegar', () => {
    const api = leer('services/api.js')
    assert.ok(
      api.includes('EVENTO_SESION_INVALIDA'),
      'api.js debe emitir EVENTO_SESION_INVALIDA (sin navegar)'
    )
    assert.ok(
      !api.includes('marcarSesionExpirada'),
      'el aviso visible lo emite un ÚNICO sitio (AuthContext), no el interceptor'
    )
    const sesion = leer('utils/session.js')
    assert.ok(
      sesion.includes('EVENTO_SESION_INVALIDA'),
      'session.js debe definir el evento cordalia:sesion-invalida'
    )
    assert.ok(
      sesion.includes('EVENTO_SESION_EXPIRADA'),
      'session.js debe definir el evento cordalia:sesion-expirada'
    )
    assert.ok(
      sesion.includes('suscribirAvisoSesion'),
      'session.js debe exponer la suscripción del aviso'
    )
    // La cadena completa: interceptor → AuthContext (cierre único) → aviso.
    const ctx = leer('context/AuthContext.jsx')
    assert.ok(
      ctx.includes('EVENTO_SESION_INVALIDA'),
      'AuthContext debe escuchar el evento del interceptor'
    )
    assert.ok(
      ctx.includes('marcarSesionExpirada'),
      'AuthContext debe marcar el aviso al cerrar (una sola vez, tras el candado)'
    )
    assert.ok(
      ctx.includes('if (cierreEnCursoRef.current) return'),
      'el cierre debe estar protegido contra duplicados'
    )
  })

  check('las vistas públicas se suscriben al aviso de expiración', () => {
    for (const vista of ['pages/Home.jsx', 'pages/Login.jsx']) {
      const src = leer(vista)
      assert.ok(src.includes('suscribirAvisoSesion'), `${vista} debe suscribirse al aviso`)
      assert.ok(src.includes('consumirAvisoSesion'), `${vista} debe consumir el aviso pendiente`)
    }
  })

  /* ── Solo el 401 cierra sesión (403/429/5xx/red no) ─────────────────── */
  check('api.js: el cierre automático está acotado al 401', () => {
    const api = leer('services/api.js')
    const bloque = api.slice(api.indexOf('if (res.status === 401)'), api.indexOf('if (!res.ok)'))
    assert.ok(bloque.includes('res.status === 401'), 'el bloque debe ser el del 401')
    assert.ok(bloque.includes('llevabaToken'), 'solo cierra si la petición llevaba token')
    assert.ok(
      !/res\.status === 403/.test(bloque) && !/res\.status >= 500/.test(bloque),
      '403/5xx no deben cerrar sesión'
    )
  })

  check('api.js: statuses != 401 solo producen ApiError', () => {
    const api = leer('services/api.js')
    assert.ok(
      /throw new ApiError\([^)]*res\.status\)/.test(api),
      'los errores no-401 deben lanzarse con su status'
    )
  })

  /* ── Destino y aviso ────────────────────────────────────────────────── */
  await checkAsync('marcarSesionExpirada: marca la bandera y emite el evento', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      let eventos = 0
      globalThis.window.addEventListener(s.EVENTO_SESION_EXPIRADA, () => { eventos++ })
      assert.equal(s.marcarSesionExpirada(), '/')
      assert.equal(eventos, 1, 'debe emitir el evento una vez')
      assert.equal(s.consumirAvisoSesion(), true, 'debe dejar bandera consumible')
    } finally {
      g.restaurar()
    }
  })

  await checkAsync('suscribirAvisoSesion: solo avisa si había bandera pendiente', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      let avisos = 0
      const desuscribir = s.suscribirAvisoSesion(() => { avisos++ })
      // Evento sin bandera previa: no debe avisar.
      globalThis.window.dispatchEvent(new CustomEvent(s.EVENTO_SESION_EXPIRADA))
      assert.equal(avisos, 0, 'sin bandera no avisa')
      // Con bandera: avisa una vez y la consume.
      s.marcarSesionExpirada()
      assert.equal(avisos, 1, 'con bandera avisa')
      globalThis.window.dispatchEvent(new CustomEvent(s.EVENTO_SESION_EXPIRADA))
      assert.equal(avisos, 1, 'no repite el aviso')
      desuscribir()
      s.marcarSesionExpirada()
      assert.equal(avisos, 1, 'tras desuscribir no avisa')
    } finally {
      g.restaurar()
    }
  })

  await checkAsync('expiración: destino es la ruta pública real "/"', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      assert.equal(s.RUTA_INICIO, '/')
      assert.equal(s.marcarSesionExpirada(), '/')
    } finally {
      g.restaurar()
    }
  })

  await checkAsync('expiración: marca el aviso y se consume una sola vez', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      s.marcarSesionExpirada()
      assert.equal(s.consumirAvisoSesion(), true, 'primera lectura → aviso')
      assert.equal(s.consumirAvisoSesion(), false, 'segunda lectura → sin duplicados')
    } finally {
      g.restaurar()
    }
  })

  await checkAsync('cierre manual: no deja aviso de inactividad pendiente', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      // El logout manual no llama a marcarSesionExpirada()
      assert.equal(s.consumirAvisoSesion(), false)
      const ctx = leer('context/AuthContext.jsx')
      const bloqueLogout = ctx.slice(ctx.indexOf('const logout = async'))
      const fin = bloqueLogout.indexOf('const updateUser')
      assert.ok(
        !bloqueLogout.slice(0, fin).includes('marcarSesionExpirada'),
        'logout manual no debe marcar el aviso'
      )
    } finally {
      g.restaurar()
    }
  })

  /* ── Rutas públicas del router ──────────────────────────────────────── */
  await checkAsync('las rutas públicas declaradas existen en el router', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      const app = leer('App.jsx')
      for (const ruta of s.RUTAS_PUBLICAS) {
        const pathDeclarado = ruta === '/' ? 'path="/"' : `path="${ruta}"`
        assert.ok(app.includes(pathDeclarado), `App.jsx debe declarar ${pathDeclarado}`)
      }
    } finally {
      g.restaurar()
    }
  })

  /* ── Inactividad: 8 minutos, temporizador único ─────────────────────── */
  await checkAsync('inactividad: el límite es de 8 minutos', async () => {
    const g = instalarGlobals()
    try {
      const s = await importarSesion()
      assert.equal(s.SESION_INACTIVIDAD_MS, 8 * 60 * 1000)
    } finally {
      g.restaurar()
    }
  })

  check('AuthContext: un solo setTimeout de inactividad y limpieza de listeners', () => {
    const ctx = leer('context/AuthContext.jsx')
    // timerRef DEBE estar declarado: sin ello, el primer render con sesión
    // lanzaba un ReferenceError (crash en runtime).
    const declaracion = ctx.indexOf('const timerRef = useRef(null)')
    assert.ok(declaracion !== -1, 'timerRef debe declararse con useRef(null)')
    const inicio = ctx.indexOf('if (!user) return')
    assert.ok(declaracion < inicio, 'timerRef debe declararse ANTES de usarse')
    const bloque = ctx.slice(inicio)
    assert.ok(
      bloque.includes('timerRef.current = setTimeout(cerrarPorInactividad, SESION_INACTIVIDAD_MS)'),
      'debe haber UN timer con el límite de inactividad configurado'
    )
    assert.ok(
      /if \(timerRef\.current\) \{\s*\n\s*clearTimeout\(timerRef\.current\)/.test(bloque),
      'debe limpiar el timer previo antes de crear otro'
    )
    assert.ok(bloque.includes('removeEventListener'), 'debe limpiar los listeners al desmontar')
    // El candado anti-duplicados debe cubrir toda la sección de efectos.
    assert.ok(
      ctx.slice(0, inicio).includes('cierreEnCursoRef'),
      'debe declarar un candado contra cierres duplicados'
    )
    assert.ok(
      bloque.includes('cerrarSesionExpirada'),
      'el cierre por inactividad debe pasar por el cierre único'
    )
  })

  check('expiración: navega al inicio "/" con replace vía router (nunca location.href)', () => {
    const ctx = leer('context/AuthContext.jsx')
    assert.ok(
      !/window\.location\.(href\s*=|replace\s*\()/.test(ctx),
      'AuthContext no debe navegar con window.location'
    )
    assert.ok(
      /navigate\(\s*RUTA_INICIO\s*,\s*\{\s*replace:\s*true\s*\}\s*\)/.test(ctx),
      'debe navegar a RUTA_INICIO con { replace: true }'
    )
    assert.ok(
      ctx.includes('rutaActual() !== RUTA_INICIO'),
      'no debe navegar si ya está en la página de inicio (evita bucles)'
    )
    assert.ok(
      ctx.includes('redireccionPendienteRef'),
      'la redirección de expiración debe ser única (sin repeticiones)'
    )
  })

  check('las vistas muestran el mensaje de expiración con toast (visible, no bloqueante)', () => {
    for (const vista of ['pages/Home.jsx', 'pages/Login.jsx']) {
      const src = leer(vista)
      assert.ok(src.includes('toast.info'), `${vista} debe usar toast (no alerts bloqueantes)`)
      assert.ok(
        src.includes('Tu sesión se cerró por inactividad'),
        `${vista} debe mostrar el título del aviso`
      )
      assert.ok(
        src.includes('Inicia sesión nuevamente para continuar'),
        `${vista} debe invitar a volver a iniciar sesión`
      )
    }
    // El Toaster está montado de forma global en main.jsx: el aviso sobrevive
    // a los cambios de layout/ruta.
    const main = leer('main.jsx')
    assert.ok(main.includes('<Toaster'), 'el Toaster debe estar montado en la raíz')
  })

  check('cierre manual: cancela el timer, limpia el aviso y las vistas navegan con replace', () => {
    const ctx = leer('context/AuthContext.jsx')
    const bloqueLogout = ctx.slice(ctx.indexOf('const logout = async'))
    const fin = bloqueLogout.indexOf('const updateUser')
    const soloLogout = bloqueLogout.slice(0, fin)
    assert.ok(
      /clearTimeout\(timerRef\.current\)/.test(soloLogout),
      'logout manual debe cancelar el temporizador de inactividad'
    )
    assert.ok(
      soloLogout.includes('SESION_INACTIVIDAD_FLAG'),
      'logout manual debe limpiar el aviso de inactividad pendiente'
    )
    for (const layout of [
      'layouts/PublicLayout.jsx',
      'layouts/AdminLayout.jsx',
      'layouts/BusinessLayout.jsx',
    ]) {
      const src = leer(layout)
      assert.ok(
        src.includes("await logout()"),
        `${layout} debe cerrar la sesión`
      )
      assert.ok(
        src.includes("navigate('/', { replace: true })"),
        `${layout} debe volver al inicio con replace (protector del botón Atrás)`
      )
      assert.ok(!/window\.location/.test(src), `${layout} no debe recargar la página`)
    }
  })

  check('las rutas privadas siguen protegidas al perder la sesión', () => {
    // La decisión se toma en utils/roles.js (compartida por ProtectedRoute
    // y AdminRoute) y las rutas la consumen con <Navigate replace>.
    const roles = leer('utils/roles.js')
    assert.ok(
      roles.includes("destino: '/login'"),
      'utils/roles.js debe enviar a /login cuando no hay sesión'
    )
    assert.ok(
      roles.includes('autenticado'),
      'utils/roles.js debe comprobar que la sesión está autenticada'
    )

    for (const comp of ['components/ProtectedRoute.jsx', 'components/AdminRoute.jsx']) {
      const src = leer(comp)
      assert.ok(src.includes('loading'), `${comp} debe esperar la validación de sesión`)
      assert.ok(
        src.includes('destinoRutaProtegida'),
        `${comp} debe usar la decisión compartida de utils/roles.js`
      )
      assert.ok(
        /<Navigate to=\{destino\} replace/.test(src),
        `${comp} debe redirigir con replace cuando no hay sesión o falta permiso`
      )
    }
  })

  /* ── Vercel ─────────────────────────────────────────────────────────── */
  check('vercel.json enruta /api al backend de Render y añade fallback SPA', () => {
    const raw = fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8')
    const cfg = JSON.parse(raw)
    const api = cfg.rewrites.find((r) => r.source === '/api/:path*')
    assert.ok(api, 'debe existir el rewrite de /api')
    assert.equal(api.destination, 'https://cordalia.onrender.com/api/:path*')
    const spa = cfg.rewrites.find((r) => r.source === '/:path*')
    assert.ok(spa, 'debe existir el fallback SPA')
    assert.equal(spa.destination, '/index.html')
    assert.ok(
      cfg.rewrites.indexOf(api) < cfg.rewrites.indexOf(spa),
      'el rewrite de /api debe ir ANTES del fallback para no romper el backend'
    )
    // El prefijo /api debe aparecer UNA SOLA vez en el destino: el source
    // /api/:path* se reemplaza completo, no se concatena.
    const destino = api.destination
    const ocurrencias = destino.split('/api/').length - 1
    assert.equal(ocurrencias, 1, 'el destino debe contener /api exactamente una vez')
    // Sin bucles: el destino debe ser un origen externo, no el propio dominio.
    assert.ok(
      !destino.includes('cordalia.vercel.app'),
      'el destino no puede apuntar al propio dominio (produciría un bucle)'
    )
  })

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`)
  process.exit(fail ? 1 : 0)
}

main()
