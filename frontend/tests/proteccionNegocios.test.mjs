/**
 * Pruebas del contrato de PROTECCIÓN DE NEGOCIOS y de la exploración
 * pública rediseñada (hechos verificables en el código fuente).
 *
 * Consola: `node tests/proteccionNegocios.test.mjs`
 *
 * Cubre:
 *   1. El vendedor NO puede eliminar negocios desde la UI (MisNegocios).
 *   2. El nombre del negocio es de solo lectura al editar (NegocioForm).
 *   3. Heroes propios y responsivos (WebP 960/1600/2200) en Inicio,
 *      Destinos y Negocios; Login conserva hero-nature.jpg.
 *   4. NegociosPublicos: filtros por categoría/destino, búsqueda,
 *      estados de carga/error/vacío y contratos card-grid/public-shell.
 *   5. Los 9 assets WebP existen en public/img/hero.
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

/* ── 1. El vendedor no elimina negocios desde la UI ─────────────────── */

check('MisNegocios no ofrece acción de eliminar al vendedor', () => {
  const src = leer('pages/negocios/MisNegocios.jsx')
  assert.ok(!src.includes('businessesAPI.remove('), 'no debe llamar al borrado de negocios')
  assert.ok(!src.includes('Trash2'), 'no debe importar el icono de eliminar')
  assert.ok(!src.includes('ConfirmModal'), 'no debe montar el modal de confirmación de borrado')
  assert.ok(!src.includes('deleteTarget'), 'no debe quedar estado de borrado')
  // Las acciones legítimas se conservan:
  assert.ok(src.includes('Gestionar'), 'debe conservar Gestionar')
  assert.ok(src.includes("'editar'"), 'debe conservar Editar')
})

/* ── 2. Nombre protegido al editar ──────────────────────────────────── */

check('NegocioForm bloquea el nombre en modo edición', () => {
  const src = leer('pages/negocios/NegocioForm.jsx')
  assert.ok(src.includes('readOnly={isEdit}'), 'el input nombre debe ser readOnly al editar')
  assert.ok(src.includes('El nombre no se puede cambiar'), 'debe explicarse la restricción')
  assert.ok(src.includes('Lock'), 'debe señalarse visualmente el bloqueo')
  // El nombre sigue registrado en el formulario (se envía intacto):
  assert.ok(src.includes("register('nombre')"), 'el nombre sigue en el formulario')
})

/* ── 3. Heroes propios, responsivos y optimizados ───────────────────── */

function verificarHero(rel, prefijo) {
  const src = leer(rel)
  assert.ok(!src.includes('hero-nature.jpg'), `${rel}: ya no debe usar hero-nature.jpg`)
  for (const ancho of [960, 1600, 2200]) {
    assert.ok(
      src.includes(`/img/hero/${prefijo}-${ancho}.webp`),
      `${rel}: falta la variante ${prefijo}-${ancho}.webp`
    )
  }
  assert.ok(src.includes('srcSet='), `${rel}: la imagen debe ser responsiva (srcSet)`)
  assert.ok(src.includes('sizes="100vw"'), `${rel}: sizes debe cubrir el viewport`)
  assert.ok(src.includes('object-cover'), `${rel}: recorte cover sin deformación`)
}

check('Home usa el hero de inicio (WebP responsivo)', () => verificarHero('pages/Home.jsx', 'hero-inicio'))
check('Lugares usa el hero de destinos (WebP responsivo)', () => verificarHero('pages/Lugares.jsx', 'hero-destinos'))
check('NegociosPublicos usa el hero de negocios (WebP responsivo)', () =>
  verificarHero('pages/negocios/NegociosPublicos.jsx', 'hero-negocios'))

check('Login conserva hero-nature.jpg (sin cambios)', () => {
  const src = leer('pages/Login.jsx')
  assert.ok(src.includes('hero-nature.jpg'), 'Login debe conservar su imagen actual')
})

check('existen los 9 assets WebP de los heroes', () => {
  for (const prefijo of ['hero-inicio', 'hero-destinos', 'hero-negocios']) {
    for (const ancho of [960, 1600, 2200]) {
      const archivo = path.join(FRONT, 'public', 'img', 'hero', `${prefijo}-${ancho}.webp`)
      assert.ok(fs.existsSync(archivo), `falta ${prefijo}-${ancho}.webp`)
      const { size } = fs.statSync(archivo)
      assert.ok(size > 10_000 && size < 600_000, `${prefijo}-${ancho}.webp con tamaño anómalo (${size})`)
    }
  }
})

/* ── 4. Exploración pública de negocios rediseñada ──────────────────── */

check('NegociosPublicos mantiene los contratos de rejilla ancha', () => {
  const src = leer('pages/negocios/NegociosPublicos.jsx')
  assert.ok(src.includes('card-grid'), 'falta card-grid')
  assert.ok(src.includes('public-shell'), 'falta public-shell')
  assert.ok(src.includes('card-media'), 'falta card-media')
  assert.ok(src.includes('card-media-lg'), 'la foto debe usar la variante grande')
})

check('NegociosPublicos ofrece búsqueda y filtros por categoría/destino', () => {
  const src = leer('pages/negocios/NegociosPublicos.jsx')
  assert.ok(src.includes('setCategoria'), 'falta el filtro por categoría')
  assert.ok(src.includes('setDestino'), 'falta el filtro por destino')
  assert.ok(src.includes('setSearch'), 'falta la búsqueda')
  assert.ok(src.includes('limpiarFiltros'), 'debe poder limpiar los filtros')
  assert.ok(src.includes('useMemo'), 'el filtrado debe estar memoizado')
})

check('NegociosPublicos cubre carga, error con reintento y vacío', () => {
  const src = leer('pages/negocios/NegociosPublicos.jsx')
  assert.ok(src.includes('SkeletonCard'), 'falta el esqueleto de carga')
  assert.ok(src.includes('Reintentar'), 'falta el reintento ante error')
  assert.ok(src.includes('No se encontraron negocios'), 'falta el estado vacío')
  assert.ok(src.includes('Aún no hay negocios aprobados'), 'falta el vacío sin datos')
})

check('index.css define la variante de foto grande .card-media-lg', () => {
  const css = leer('index.css')
  assert.ok(css.includes('.card-media-lg'), 'falta .card-media-lg')
  assert.ok(css.includes('aspect-ratio: 4 / 3'), 'la variante debe usar proporción 4/3')
})

check('LugarDetalle alinea sus tarjetas de negocio con card-media', () => {
  const src = leer('pages/LugarDetalle.jsx')
  assert.ok(src.includes('card-media card-media-lg'), 'la tarjeta de negocio debe usar card-media grande')
})

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
