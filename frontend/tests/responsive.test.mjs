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

/* ── 6. Ninguna raíz de página bloquea el scroll ─────────────────────── */

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
