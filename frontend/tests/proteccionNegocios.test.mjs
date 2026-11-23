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
 *   6. REDISEÑO Visual: hero asimétrico + buscador flotante, destacados,
 *      rail sticky con colores por categoría, tarjetas nuevas con CTA y
 *      estrellas reales, esqueleto con brillo y vacío ilustrado.
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

/* ── 6. REDISEÑO visual de Negocios ──────────────────────────────────── */

const negociosJsx = leer('pages/negocios/NegociosPublicos.jsx')
const negociosCss = fs.readFileSync(
  path.join(SRC, 'pages', 'negocios', 'negociosPublicos.css'), 'utf8')

check('el hero es una composición asimétrica nueva (no el bloque centrado anterior)', () => {
  assert.ok(negociosJsx.includes('nb-hero'), 'falta el hero propio')
  assert.ok(negociosJsx.includes('nb-hero-veil'), 'falta el degradado por capas')
  assert.ok(negociosJsx.includes('nb-hero-glow'), 'falta el resplandor cálido')
  assert.ok(negociosJsx.includes('nb-hero-grid'), 'falta la capa de retícula')
  assert.ok(negociosJsx.includes('nb-stamp'), 'falta el sello giratorio')
  assert.ok(negociosJsx.includes('nb-title-accent'), 'falta la palabra de acento ámbar')
  // El texto ya no usa el wrapper centrado del diseño anterior: ahora va
  // en un bloque izquierdo estrecho (max-w-3xl), sin mx-auto/text-center.
  assert.ok(negociosJsx.includes('className="max-w-3xl"'), 'falta el bloque izquierdo del hero')
  assert.ok(
    !negociosJsx.includes('max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center'),
    'el contenido del hero debe ser asimétrico'
  )
})

check('la búsqueda es protagonista: barra flotante grande con botón', () => {
  assert.ok(negociosJsx.includes('nb-search'), 'falta la barra flotante')
  assert.ok(negociosJsx.includes('-mt-20'), 'la barra debe cruzar el borde del hero')
  assert.ok(negociosJsx.includes('bg-coral-700'), 'el botón debe usar el acento cálido')
  assert.ok(/Explorar\s*<ArrowRight/.test(negociosJsx), 'falta el CTA de búsqueda')
  assert.ok(negociosJsx.includes('aria-label="Buscar negocios"'), 'la búsqueda debe estar etiquetada')
})

check('tipografía propia Fraunces cargada y tokenizada', () => {
  const html = fs.readFileSync(path.join(FRONT, 'index.html'), 'utf8')
  assert.ok(html.includes('family=Fraunces'), 'Fraunces no está cargada desde Google Fonts')
  const css = leer('index.css')
  assert.ok(css.includes("--font-bazaar: 'Fraunces'"), 'falta el token --font-bazaar')
  assert.ok(negociosJsx.includes('var(--font-bazaar)'), 'los títulos no usan la fuente nueva')
})

check('existe una sección de destacados antes de la rejilla general', () => {
  assert.ok(negociosJsx.includes('Imprescindibles'), 'falta el título de destacados')
  assert.ok(negociosJsx.includes('nb-featured-grid'), 'falta la composición asimétrica')
  assert.ok(negociosJsx.includes('FeatureCard'), 'faltan las tarjetas destacadas')
  assert.ok(negociosJsx.includes('negocios.slice(0, 3)'), 'deben ser hasta 3 negocios')
  const idxFeatured = negociosJsx.indexOf('aria-labelledby="nb-destacados"')
  const idxGrid = negociosJsx.indexOf('className="card-grid nb-grid"')
  assert.ok(idxFeatured > 0 && idxGrid > idxFeatured, 'los destacados deben ir antes de la rejilla')
})

check('el riel de categorías es sticky, accesible y con color por familia', () => {
  assert.ok(negociosCss.includes('position: sticky'), 'el riel no es sticky')
  assert.ok(negociosJsx.includes('className="nb-rail'), 'falta el riel')
  assert.ok(negociosJsx.includes('aria-pressed='), 'los pills deben exponer su estado')
  for (const familia of ['gastronomia', 'hospedaje', 'tours', 'artesanias', 'transporte']) {
    assert.ok(negociosJsx.includes(familia), `falta la familia ${familia}`)
  }
  assert.ok(negociosJsx.includes('VISUALES.gastronomia'), 'no se aplica el color por categoría')
  assert.ok(/'--pill-bg':\s*visual\.relleno/.test(negociosJsx), 'el activo no usa relleno vivo')
})

check('las tarjetas son nuevas: badge flotante, CTA y estrellas reales', () => {
  assert.ok(negociosJsx.includes('className="nb-card group"'), 'falta la tarjeta nueva')
  assert.ok(negociosJsx.includes('nb-badge absolute'), 'falta el badge flotante sobre la imagen')
  assert.ok(negociosJsx.includes('nb-cta'), 'falta el botón CTA')
  assert.ok(negociosJsx.includes('>Ver negocio<'), 'el CTA debe decir Ver negocio')
  assert.ok(negociosJsx.includes('reviewsAPI.getByBusiness'), 'las estrellas deben venir de reseñas reales')
  assert.ok(negociosJsx.includes('<Estrellas'), 'falta el componente de estrellas')
  assert.ok(negociosJsx.includes('Sin reseñas aún'), 'debe existir el estado sin reseñas')
  assert.ok(negociosCss.includes('--cat-color'), 'falta la franja de color por categoría')
  assert.ok(negociosCss.includes('.nb-card:hover'), 'falta el hover de elevación')
})

check('la rejilla del rediseño da 1/2/3/4 columnas', () => {
  for (const ancho of ['640px', '1100px', '1800px']) {
    assert.ok(negociosCss.includes(`@media (min-width: ${ancho})`), `falta el breakpoint ${ancho}`)
  }
  assert.ok(negociosCss.includes('repeat(4, minmax(0, 1fr))'), 'faltan 4 columnas en escritorio grande')
  assert.ok(negociosJsx.includes('card-grid nb-grid'), 'la rejilla nueva no está aplicada')
})

check('carga y vacío tienen lenguaje visual propio', () => {
  assert.ok(negociosCss.includes('nb-skeleton-shine'), 'falta el brillo de los skeletons')
  assert.ok(negociosJsx.includes('nb-empty'), 'falta el estado vacío ilustrado')
  assert.ok(negociosJsx.includes('<SearchX'), 'falta el ícono grande del vacío')
  assert.ok(negociosJsx.includes('nb-empty-ring'), 'faltan las capas decorativas del vacío')
})

check('las animaciones respetan prefers-reduced-motion', () => {
  assert.ok(negociosJsx.includes('useReducedMotion'), 'no se consulta la preferencia del usuario')
  assert.ok(negociosCss.includes('@media (prefers-reduced-motion: reduce)'), 'falta la regla CSS')
  assert.ok(negociosCss.includes('.nb-stamp, .nb-skeleton-shine { animation: none'), 'no se detienen las animaciones')
})

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
