/**
 * Pruebas del contrato RESPONSIVE de Cordalia (hechos verificables en el
 * código y en el CSS compilado de dist/ si existe).
 *
 * Consola: `node tests/responsive.test.mjs`
 *
 * Motivo: en pantallas grandes la interfaz no crecía de forma proporcional
 * y el login/registro obligaban a hacer scroll. Estas pruebas fijan los
 * mecanismos que lo corrigen:
 *   1. Escalado proporcional por raíz rem (media queries en index.css).
 *   2. Login/registro compactos con dvh y campos en 2 columnas desde md.
 *   3. Tablas dentro de contenedores con desplazamiento horizontal propio.
 *   4. Paneles con ancho máximo razonable (sin estiramiento ultrapanorámico).
 *   5. Ninguna página raíz usa overflow-hidden (no se bloquea el scroll).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT = path.resolve(__dirname, '..')
const SRC = path.join(FRONT, 'src')

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

/* ── 1. Escalado proporcional por raíz rem ───────────────────────────── */

check('index.css define el escalado proporcional por raíz rem', () => {
  const css = leer('index.css')
  assert.ok(css.includes('@media (min-width: 1600px)'), 'falta breakpoint 1600px')
  assert.ok(css.includes('112.5%'), 'falta escala 18px (112.5%)')
  assert.ok(css.includes('@media (min-width: 1920px)'), 'falta breakpoint 1920px')
  assert.ok(css.includes('118.75%'), 'falta escala 19px (118.75%)')
  assert.ok(css.includes('@media (min-width: 2560px)'), 'falta breakpoint 2560px')
  assert.ok(css.includes('131.25%'), 'falta escala 21px (131.25%)')
})

check('el CSS compilado en dist contiene las reglas de escalado (si dist existe)', () => {
  const distAssets = path.join(FRONT, 'dist', 'assets')
  if (!fs.existsSync(distAssets)) return // sin build: se valida al construir
  const cssFile = fs.readdirSync(distAssets).find((f) => f.endsWith('.css'))
  assert.ok(cssFile, 'dist/assets no contiene CSS')
  const css = fs.readFileSync(path.join(distAssets, cssFile), 'utf8')
  // El minificador puede usar sintaxis clásica (min-width:1600px) o de rango
  // moderno (width>=1600px): aceptamos ambas.
  const media1600 = css.includes('min-width:1600px') || css.includes('min-width: 1600px') || css.includes('(width>=1600px)')
  assert.ok(media1600, 'el build no incluye el breakpoint 1600px')
  assert.ok(css.includes('112.5%'), 'el build no incluye la escala 112.5%')
})

/* ── 2. Login compacto, centrado y con dvh ───────────────────────────── */

check('Login.jsx: altura real del viewport (dvh) y centrado', () => {
  const src = leer('pages/Login.jsx')
  assert.ok(src.includes('min-h-screen min-h-dvh'), 'el contenedor raíz debe usar min-h-screen + min-h-dvh')
  assert.ok(src.includes('flex flex-col justify-center'), 'el formulario debe centrarse verticalmente')
})

check('Login.jsx: compacto en escritorio sin perder elementos móviles', () => {
  const src = leer('pages/Login.jsx')
  assert.ok(src.includes('md:py-6 xl:py-5'), 'padding vertical compacto desde md')
  assert.ok(src.includes('space-y-4 md:space-y-3 xl:space-y-2.5'), 'espaciado del formulario compacto')
  assert.ok(src.includes('md:py-2.5'), 'inputs compactos en escritorio')
  assert.ok(src.includes('md:text-3xl'), 'título moderado en escritorio')
  // Los elementos funcionales siguen existiendo (nada eliminado):
  for (const obligatorio of ['showPassword', 'obtenerRuta(', 'RESET_PASSWORD', 'REGISTRO', 'Continuar con Google']) {
    assert.ok(src.includes(obligatorio), `no debe eliminarse: ${obligatorio}`)
  }
})

/* ── 3. Registro compacto, 2 columnas desde md, 1 en móvil ───────────── */

check('Registro.jsx: campos en 2 columnas desde md y 1 columna en móvil', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(src.includes('grid grid-cols-1 md:grid-cols-2'), 'la cuadrícula de campos debe ser 1 col móvil / 2 col md+')
})

check('Registro.jsx: compacto con dvh y sin perder campos ni flujo', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(src.includes('min-h-screen min-h-dvh'), 'contenedor raíz con dvh')
  assert.ok(src.includes('md:max-w-xl'), 'ancho máximo razonable del formulario en escritorio')
  assert.ok(src.includes('md:py-2.5'), 'inputs compactos en escritorio')
  for (const obligatorio of ['nombre', 'email', 'password', 'confirmPassword', 'navegarAlInicioTrasRegistro', 'GoogleButton']) {
    assert.ok(src.includes(obligatorio), `no debe eliminarse: ${obligatorio}`)
  }
})

check('Registro.jsx: el aviso de membresía aprovecha el ancho en md+ (2 columnas)', () => {
  const src = leer('pages/Registro.jsx')
  assert.ok(src.includes('md:grid-cols-[1.25fr_1fr]'), 'el aviso debe distribuirse en 2 columnas desde md')
  // En móvil el aviso es una sola columna (el grid md: no aplica) ✓ implícito
})

/* ── 4. Tablas: desplazamiento horizontal propio, nunca de la página ─── */

check('todas las tablas de admin/vendedor tienen contenedor overflow-x-auto', () => {
  const errores = []
  const dirs = ['pages/admin', 'pages/negocios']
  for (const dir of dirs) {
    const abs = path.join(SRC, dir)
    for (const archivo of fs.readdirSync(abs)) {
      if (!archivo.endsWith('.jsx')) continue
      const contenido = fs.readFileSync(path.join(abs, archivo), 'utf8')
      const nTablas = (contenido.match(/<table/g) || []).length
      if (nTablas > 0 && !contenido.includes('overflow-x-auto')) {
        errores.push(`${dir}/${archivo}: ${nTablas} tabla(s) sin contenedor overflow-x-auto`)
      }
    }
  }
  assert.deepEqual(errores, [], errores.join('\n      '))
})

/* ── 5. Paneles con ancho máximo razonable ───────────────────────────── */

check('AdminLayout y BusinessLayout limitan el ancho en pantallas muy grandes', () => {
  assert.ok(leer('layouts/AdminLayout.jsx').includes('max-w-[1700px]'), 'AdminLayout sin límite de ancho')
  assert.ok(leer('layouts/BusinessLayout.jsx').includes('max-w-[1700px]'), 'BusinessLayout sin límite de ancho')
})

/* ── 6. Tarjetas públicas: rejilla fluida y tipografía escalada ──────── */

check('index.css define la rejilla fluida de tarjetas (auto-fit + minmax)', () => {
  const css = leer('index.css')
  assert.ok(css.includes('.card-grid'), 'falta la utilidad .card-grid')
  assert.ok(
    css.includes('repeat(auto-fit, minmax(min(100%, var(--card-min)), 1fr))'),
    'la rejilla debe usar auto-fit + minmax(min(100%, --card-min), 1fr)'
  )
  assert.ok(css.includes('--card-min'), 'falta el tamaño mínimo de columna --card-min')
  assert.ok(
    css.includes('min-width: 1366px') && css.includes('min-width: 1920px') && css.includes('min-width: 2560px'),
    'la tarjeta debe crecer en portátiles (1366), 1920 y 2560'
  )
  // Imagen uniforme y sin deformación; tipografía fluida.
  assert.ok(css.includes('aspect-ratio: 16 / 10'), 'falta proporción uniforme 16/10')
  assert.ok(css.includes('.card-media img'), 'falta regla de imagen de tarjeta')
  assert.ok(css.includes('object-fit: cover'), 'falta object-fit uniforme')
  assert.ok(css.includes('.card-title') && css.includes('clamp('), 'falta título fluido con clamp')
  assert.ok(css.includes('.card-price'), 'falta precio fluido')
  // Contenedor ancho en pantallas grandes.
  assert.ok(css.includes('.public-shell'), 'falta el contenedor .public-shell')
  assert.ok(css.includes('max-width: 96rem'), 'el contenedor público debe llegar a 96rem')
  assert.ok(css.includes('max-width: 100rem'), 'el contenedor público debe llegar a 100rem en 1920+')
})

check('las páginas públicas usan card-grid/public-shell/card-media', () => {
  for (const rel of [
    'pages/negocios/NegociosPublicos.jsx',
    'pages/Lugares.jsx',
    'pages/planes/PlanesPublicos.jsx',
  ]) {
    const src = leer(rel)
    assert.ok(src.includes('card-grid'), `${rel}: falta la rejilla card-grid`)
    assert.ok(src.includes('public-shell'), `${rel}: falta el contenedor ancho public-shell`)
    assert.ok(src.includes('card-media'), `${rel}: falta la imagen uniforme card-media`)
  }
  const home = leer('pages/Home.jsx')
  assert.ok(home.includes('card-media'), 'Home.jsx: falta card-media')
  assert.ok(home.includes('card-title'), 'Home.jsx: falta card-title')
  assert.ok(home.includes('public-shell'), 'Home.jsx: falta public-shell')
})

check('el panel del vendedor y MisNegocios informan los negocios ocultos', () => {
  const panel = leer('pages/negocios/PanelVendedor.jsx')
  assert.ok(panel.includes('publicacion_oculta'), 'PanelVendedor: falta el aviso de publicación oculta')
  assert.ok(panel.includes('negocios_ocultos'), 'PanelVendedor: falta el conteo de negocios ocultos')
  const mis = leer('pages/negocios/MisNegocios.jsx')
  assert.ok(mis.includes('estaOcultoAlPublico'), 'MisNegocios: falta detectar negocios ocultos')
  assert.ok(mis.includes('PANEL_VENDEDOR'), 'MisNegocios: falta el enlace para renovar')
  const utils = leer('pages/negocios/businessUtils.js')
  assert.ok(utils.includes('oculto_suscripcion'), 'businessUtils: falta el estado oculto_suscripcion')
})

check('el CSS compilado en dist incluye card-grid y public-shell (si dist existe)', () => {
  const distAssets = path.join(FRONT, 'dist', 'assets')
  if (!fs.existsSync(distAssets)) return
  const cssFile = fs.readdirSync(distAssets).find((f) => f.endsWith('.css'))
  assert.ok(cssFile, 'dist/assets no contiene CSS')
  const css = fs.readFileSync(path.join(distAssets, cssFile), 'utf8')
  assert.ok(css.includes('card-grid'), 'el build no incluye .card-grid')
  assert.ok(css.includes('public-shell'), 'el build no incluye .public-shell')
  assert.ok(css.includes('auto-fit'), 'el build no incluye la rejilla auto-fit')
})

/* ── 7. Ninguna raíz de página bloquea el scroll ─────────────────────── */

check('ninguna página o layout raíz usa overflow-hidden como solución al scroll', () => {
  const errores = []
  const recorrer = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) { recorrer(completo); continue }
      if (!entrada.name.endsWith('.jsx')) continue
      const contenido = fs.readFileSync(completo, 'utf8')
      if (/className="[^"]*min-h-(screen|dvh)[^"]*overflow-hidden/.test(contenido)) {
        errores.push(path.relative(SRC, completo))
      }
    }
  }
  recorrer(SRC)
  assert.deepEqual(errores, [], `raíces con overflow-hidden: ${errores.join(', ')}`)
})

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
