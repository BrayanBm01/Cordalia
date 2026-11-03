/**
 * Pruebas empíricas de navegación con el MOTOR REAL de React Router.
 *
 * Consola: `node tests/navegacion.test.mjs`
 *
 * Motivo: tras la ofuscación, los identificadores no llevaban "/" inicial
 * y React Router los interpretaba como rutas RELATIVAS, concatenándolos
 * con la ruta actual (404 tras completar el registro, p. ej.
 * "/y8o5rdAd/F8HgnHJz/KJRkky3o"). Estas pruebas navegan con
 * createMemoryRouter (sin DOM, mismo motor que la app) y comprueban que
 * cada destino resuelve a la ruta real declarada, sin segmentos extra.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMemoryRouter } from 'react-router-dom'
import { RUTAS_OFUSCADAS, obtenerRuta, rutaCon } from '../src/routes/offuscatedRoutes.js'
import { rutaInicioPorRol, destinoRutaProtegida } from '../src/utils/roles.js'

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

const leer = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8')

/* ── Árbol de rutas equivalente al de App.jsx ────────────────────────── */

const vista = (nombre) => (nombre ? { nombre } : null)

/**
 * Réplica ESTRUCTURAL del árbol declarado en src/App.jsx: layouts sin
 * `path` y rutas hoja con los identificadores ofuscados. Se usa para
 * validar destinos con el motor real de react-router.
 */
const ARBOL = [
  {
    id: 'publico', // <Route element={<PublicLayout />}>
    children: [
      { id: 'home-alias', path: '/', element: vista('Home') },
      { id: 'home', path: obtenerRuta('INICIO'), element: vista('Home') },
      { id: 'lugares', path: obtenerRuta('LUGARES'), element: vista('Lugares') },
      { id: 'lugares-detalle', path: `${obtenerRuta('LUGARES')}/:id`, element: vista('LugarDetalle') },
      {
        id: 'negocios', path: obtenerRuta('NEGOCIOS_PUBLICOS'), element: vista('NegociosPublicos'),
        children: [
          { id: 'negocios-detalle', path: ':id', element: vista('NegocioDetalle') },
        ],
      },
      { id: 'planes', path: obtenerRuta('PLANES_PUBLICOS'), element: vista('PlanesPublicos') },
      { id: 'planes-detalle', path: `${obtenerRuta('PLANES_PUBLICOS')}/:id`, element: vista('PlanDetalle') },
      { id: 'perfil', path: obtenerRuta('PERFIL'), element: vista('Perfil') },
      { id: 'favoritos', path: obtenerRuta('FAVORITOS'), element: vista('Favoritos') },
    ],
  },
  {
    id: 'auth', // <Route element={<AuthLayout />}>
    children: [
      { id: 'login', path: obtenerRuta('LOGIN'), element: vista('Login') },
      { id: 'registro', path: obtenerRuta('REGISTRO'), element: vista('Registro') },
      { id: 'reset', path: obtenerRuta('RESET_PASSWORD'), element: vista('Reset') },
    ],
  },
  {
    id: 'vendedor', // <Route element={<ProtectedRoute…><BusinessLayout/></ProtectedRoute>}>
    children: [
      { id: 'panel', path: obtenerRuta('PANEL_VENDEDOR'), element: vista('Panel') },
      { id: 'resumen', path: obtenerRuta('MIS_NEGOCIOS_RESUMEN'), element: vista('Resumen') },
      { id: 'mis-negocios', path: obtenerRuta('MIS_NEGOCIOS'), element: vista('MisNegocios') },
      { id: 'negocio-nuevo', path: obtenerRuta('NEGOCIO_NUEVO'), element: vista('NegocioForm') },
      { id: 'negocio-detalle', path: `${obtenerRuta('MIS_NEGOCIOS')}/:id`, element: vista('NegocioDetalle') },
      { id: 'negocio-editar', path: `${obtenerRuta('MIS_NEGOCIOS')}/:id/editar`, element: vista('NegocioForm') },
    ],
  },
  {
    id: 'admin', // <Route element={<AdminRoute />}> + AdminLayout
    children: [
      { id: 'admin-home', path: obtenerRuta('ADMIN'), element: vista('AdminDashboard') },
      { id: 'admin-usuarios', path: obtenerRuta('ADMIN_USUARIOS'), element: vista('AdminUsuarios') },
      { id: 'admin-vendedores', path: obtenerRuta('ADMIN_VENDEDORES'), element: vista('AdminVendedores') },
      { id: 'admin-lugares', path: obtenerRuta('ADMIN_LUGARES'), element: vista('AdminDestinos') },
      { id: 'admin-negocios', path: obtenerRuta('ADMIN_NEGOCIOS'), element: vista('AdminNegocios') },
      { id: 'admin-resenas', path: obtenerRuta('ADMIN_RESEÑAS'), element: vista('AdminResenas') },
      { id: 'admin-historial', path: obtenerRuta('ADMIN_HISTORIAL'), element: vista('AdminHistorial') },
    ],
  },
  { id: 'notfound', path: '*', element: vista('NotFound') },
]

/** Crea un router real (react-router) posicionado en `inicial`. */
function routerDesde(inicial) {
  return createMemoryRouter(ARBOL, { initialEntries: [inicial] })
}

/**
 * Comprueba que un destino termina en una ruta REAL del árbol (no 404):
 * su pathname debe ser una de las rutas declaradas o uno de sus
 * patrones con parámetro.
 */
function esDestinoReal(pathname) {
  const patrones = []
  for (const clave of Object.keys(RUTAS_OFUSCADAS)) {
    const id = RUTAS_OFUSCADAS[clave]
    patrones.push(new RegExp(`^/${id}$`))
    patrones.push(new RegExp(`^/${id}/[^/]+$`))
    patrones.push(new RegExp(`^/${id}/[^/]+/editar$`))
  }
  return pathname === '/' || patrones.some((re) => re.test(pathname))
}

/* ── 1. Redirección tras el registro: SIEMPRE al inicio ──────────────── */

check('obtenerRuta(INICIO) es la ruta absoluta y real del árbol', () => {
  const destino = obtenerRuta('INICIO')
  assert.equal(destino, `/${RUTAS_OFUSCADAS.INICIO}`)
  assert.ok(esDestinoReal(destino), `${destino} debe ser una ruta declarada`)
})

for (const pagina of ['login', 'registro']) {
  const inicial = pagina === 'login' ? obtenerRuta('LOGIN') : obtenerRuta('REGISTRO')
  check(
    `desde ${pagina} (${inicial}), navegar a INICIO NO concatena segmentos`,
    () => {
      const router = routerDesde(inicial)
      router.navigate(obtenerRuta('INICIO'))
      const ruta = router.state.location.pathname
      assert.equal(ruta, obtenerRuta('INICIO'), `quedó en "${ruta}"`)
      assert.ok(esDestinoReal(ruta), `la ruta final "${ruta}" debe existir (no 404)`)
      assert.ok(!ruta.includes(inicial.slice(1)), `la URL final no debe contener el segmento previo: ${ruta}`)
    }
  )
}

check('desde el registro (vendedor o admin) el destino es el INICIO real, no un panel', () => {
  const router = routerDesde(obtenerRuta('REGISTRO'))
  router.navigate(obtenerRuta('INICIO'))
  const ruta = router.state.location.pathname
  assert.notEqual(ruta, obtenerRuta('PANEL_VENDEDOR'), 'el registro NO debe abrir el panel del vendedor')
  assert.notEqual(ruta, obtenerRuta('ADMIN'), 'el registro NO debe abrir el panel admin')
  assert.equal(ruta, obtenerRuta('INICIO'))
})

/* ── 2. Login por rol: destinos reales, sin concatenación ────────────── */

for (const rol of ['TOURIST', 'BUSINESS', 'ADMIN']) {
  check(`login ${rol}: rutaInicioPorRol lleva a una ruta REAL sin concatenar`, () => {
    const router = routerDesde(obtenerRuta('LOGIN'))
    router.navigate(rutaInicioPorRol(rol))
    const ruta = router.state.location.pathname
    assert.ok(esDestinoReal(ruta), `la ruta final "${ruta}" debe existir (no 404)`)
    assert.ok(!ruta.slice(1).includes(obtenerRuta('LOGIN').slice(1)), `no debe quedar el segmento de login: ${ruta}`)
  })
}

/* ── 3. Guards de rutas privadas: destinos absolutos reales ──────────── */

check('sin sesión, ProtectedRoute/AdminRoute envían al LOGIN real sin concatenar', () => {
  const router = routerDesde(obtenerRuta('ADMIN_USUARIOS')) // página privada
  const decision = destinoRutaProtegida({ rol: null, rolesPermitidos: ['ADMIN'], autenticado: false })
  router.navigate(decision.destino)
  const ruta = router.state.location.pathname
  assert.equal(ruta, obtenerRuta('LOGIN'), `quedó en "${ruta}"`)
  assert.ok(esDestinoReal(ruta))
})

check('turista expulsado del panel admin va a SU inicio (ruta real, sin concatenar)', () => {
  const router = routerDesde(obtenerRuta('ADMIN'))
  const decision = destinoRutaProtegida({ rol: 'TOURIST', rolesPermitidos: ['ADMIN'], autenticado: true })
  router.navigate(decision.destino)
  const ruta = router.state.location.pathname
  assert.equal(ruta, obtenerRuta('INICIO'), `quedó en "${ruta}"`)
  assert.ok(esDestinoReal(ruta))
})

/* ── 4. Enlaces de detalle (rutaCon) desde páginas con segmento ──────── */

check('rutaCon(LUGARES, id) desde /LUGARES no duplica el segmento', () => {
  const router = routerDesde(obtenerRuta('LUGARES'))
  router.navigate(rutaCon('LUGARES', 12))
  const ruta = router.state.location.pathname
  assert.equal(ruta, `/${RUTAS_OFUSCADAS.LUGARES}/12`, `quedó en "${ruta}"`)
  assert.ok(!ruta.includes(`${RUTAS_OFUSCADAS.LUGARES}/${RUTAS_OFUSCADAS.LUGARES}`), 'no debe duplicar el id')
})

check('rutaCon(MIS_NEGOCIOS, id, editar) es navegable (ruta real)', () => {
  const router = routerDesde(obtenerRuta('MIS_NEGOCIOS'))
  router.navigate(rutaCon('MIS_NEGOCIOS', 7, 'editar'))
  const ruta = router.state.location.pathname
  assert.equal(ruta, `/${RUTAS_OFUSCADAS.MIS_NEGOCIOS}/7/editar`)
  assert.ok(esDestinoReal(ruta), `${ruta} debe coincidir con el patrón declarado`)
})

/* ── 5. Registro (código fuente): destino único, seguro y sin duplicar ── */

check('Registro.jsx: la redirección de éxito usa obtenerRuta(INICIO) absoluta', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(
    src.includes("const destino = obtenerRuta('INICIO')"),
    'el destino del registro debe resolverse con el módulo oficial de rutas'
  )
  assert.ok(
    src.includes("navigate(destino, { replace: true })"),
    'la navegación de éxito debe usar el destino absoluto del módulo oficial'
  )
  assert.ok(
    !/navigate\(\s*rutaInicioPorRol/.test(src),
    'Registro no debe decidir el destino con rutaInicioPorRol (el registro SIEMPRE va al inicio)'
  )
})

check('Registro.jsx: la navegación se ejecuta UNA sola vez (candado anti-duplicados)', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(
    src.includes('registroNavegadoRef'),
    'debe existir el candado registroNavegadoRef'
  )
  assert.ok(
    src.includes('if (registroNavegadoRef.current) return'),
    'el candado debe impedir una segunda navegación'
  )
  // Una sola función de navegación compartida por ambos flujos de éxito.
  const llamadas = (src.match(/(?<!function )navegarAlInicioTrasRegistro\(\)/g) || [])
  assert.equal(llamadas.length, 2, 'debe llamarse exactamente en onSubmit y en handleGoogleSuccess')
  assert.ok(
    src.includes('function navegarAlInicioTrasRegistro()'),
    'debe existir la función compartida de redirección'
  )
})

check('Registro.jsx: un registro FALLIDO no navega al inicio', () => {
  const src = leer('pages/Registro.jsx')
  const catchIndex = src.indexOf('} catch (err) {')
  assert.ok(catchIndex !== -1, 'el submit debe tener manejo de error')
  const finCatch = src.indexOf('} finally {', catchIndex)
  const bloqueCatch = src.slice(catchIndex, finCatch)
  assert.ok(
    !bloqueCatch.includes('navigate(') && !bloqueCatch.includes('navegarAlInicio'),
    'el bloque catch NO debe navegar: el error debe verse en el formulario'
  )
  assert.ok(bloqueCatch.includes('toast.error'), 'el error debe mostrarse al usuario')
})

check('Registro.jsx: el destino se valida antes de navegar (nunca vacío o inexistente)', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(
    src.includes("!destino.startsWith('/') || destino.length < 2"),
    'debe rechazar un destino sin "/" o vacío'
  )
})

check('Registro.jsx: el registro público NO crea cuentas ADMIN', () => {
  const src = leer('pages/Registro.jsx')
  // Solo existen las opciones TOURIST y BUSINESS; el ADMIN no es un rol
  // ofrecido al público (el backend tampoco lo acepta).
  assert.ok(src.includes("id: 'TOURIST'"), 'debe existir la opción turista')
  assert.ok(src.includes("id: 'BUSINESS'"), 'debe existir la opción vendedor')
  assert.ok(
    !/id:\s*['"]ADMIN['"]/.test(src),
    'el registro público NO debe ofrecer la creación de cuentas ADMIN'
  )
})

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
