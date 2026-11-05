/**
 * visual_cards.mjs — Verificación VISUAL REAL de las tarjetas públicas de
 * Cordalia (destinos, planes y negocios) en seis resoluciones y variantes.
 *
 * Requiere:
 *   * Backend en http://localhost:3000  (node src/server.js)
 *   * Frontend  en http://localhost:5173 (npm run dev)
 *   * /usr/bin/brave + puppeteer-core instalados.
 *
 * Uso:
 *   node tests/visual_cards.mjs
 *
 * Qué mide en el navegador real (no "a ojo"):
 *   1. Número de COLUMNAS de cada rejilla de tarjetas.
 *   2. Ancho/alto real de la primera tarjeta.
 *   3. Proporción de la imagen (debe ser 16/10 ≈ 1.6 en todas).
 *   4. Tamaño de fuente real del título (debe crecer en pantallas grandes).
 *   5. Desbordamiento horizontal de la página (debe ser 0).
 * Captura screenshots de las rejillas en /tmp/opencode/visual/.
 */
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { RUTAS_OFUSCADAS } from '../src/routes/offuscatedRoutes.js'

const EXE = process.env.BRAVE_PATH || '/usr/bin/brave'
const BASE = process.env.FRONT_BASE || 'http://localhost:5173'
const OUT = process.env.VISUAL_OUT || '/tmp/opencode/visual'

const PAGINAS = [
  { id: 'home', ruta: `/${RUTAS_OFUSCADAS.INICIO}`, nombre: 'Inicio' },
  { id: 'lugares', ruta: `/${RUTAS_OFUSCADAS.LUGARES}`, nombre: 'Destinos' },
  { id: 'planes', ruta: `/${RUTAS_OFUSCADAS.PLANES_PUBLICOS}`, nombre: 'Planes' },
  { id: 'negocios', ruta: `/${RUTAS_OFUSCADAS.NEGOCIOS_PUBLICOS}`, nombre: 'Negocios' },
]

// Seis resoluciones obligatorias + variantes de escritorio.
const VIEWPORTS = [
  { w: 360, h: 800, etiqueta: '360x800', tipo: 'movil' },
  { w: 768, h: 1024, etiqueta: '768x1024', tipo: 'tableta' },
  { w: 1366, h: 768, etiqueta: '1366x768', tipo: 'portatil' },
  { w: 1366, h: 1024, etiqueta: '1366x1024', tipo: 'portatil' },
  { w: 1920, h: 1080, etiqueta: '1920x1080', tipo: 'escritorio' },
  { w: 1920, h: 1440, etiqueta: '1920x1440', tipo: 'escritorio' },
  { w: 2560, h: 1440, etiqueta: '2560x1440', tipo: 'ultra' },
  { w: 2560, h: 1600, etiqueta: '2560x1600', tipo: 'ultra' },
]

const MEDICION = () => {
  const grids = Array.from(document.querySelectorAll('.card-grid, div.grid')).filter((g) =>
    g.querySelector('.card-media')
  )
  const datos = grids.map((g) => {
    const cs = getComputedStyle(g)
    const columnas = cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length
    const tarjetas = Array.from(g.children)
    const primera = tarjetas[0]?.getBoundingClientRect()
    const media = tarjetas[0]?.querySelector('.card-media')?.getBoundingClientRect()
    const titulo = tarjetas[0]?.querySelector('.card-title')
    const precio = tarjetas[0]?.querySelector('.card-price')
    return {
      columnas,
      tarjetas: tarjetas.length,
      anchoTarjeta: Math.round(primera?.width || 0),
      altoTarjeta: Math.round(primera?.height || 0),
      aspectoImagen: media ? Number((media.width / media.height).toFixed(3)) : 0,
      tituloPx: titulo ? Math.round(parseFloat(getComputedStyle(titulo).fontSize)) : 0,
      precioPx: precio ? Math.round(parseFloat(getComputedStyle(precio).fontSize)) : 0,
      visible: Boolean(primera && primera.width > 0 && primera.height > 0),
    }
  })
  return {
    grids: datos,
    desborde: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
  }
}

const resultados = []
const fallos = []
const registrar = (msg) => resultados.push(msg)
const exigir = (cond, msg) => {
  if (!cond) fallos.push(msg)
}

async function esperarTarjetas(page) {
  await page.waitForFunction(
    () => document.querySelectorAll('.card-media').length > 0,
    { timeout: 20000 }
  )
  // Pequeña espera para que terminen las animaciones de entrada.
  await new Promise((r) => setTimeout(r, 700))
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: EXE,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--force-device-scale-factor=1'],
  })

  try {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage()
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 })
      for (const pagina of PAGINAS) {
        const url = BASE + pagina.ruta
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
        try {
          await esperarTarjetas(page)
        } catch {
          fallos.push(`${vp.etiqueta} ${pagina.id}: no renderizaron tarjetas`)
          continue
        }
        const m = await page.evaluate(MEDICION)
        for (const g of m.grids) {
          registrar(
            `${vp.etiqueta} ${pagina.id}: ${g.tarjetas} tarjetas, ${g.columnas} col, ` +
              `tarjeta ${g.anchoTarjeta}x${g.altoTarjeta}, img ratio ${g.aspectoImagen}, ` +
              `titulo ${g.tituloPx}px, precio ${g.precioPx}px`
          )
        }
        exigir(m.desborde <= 1, `${vp.etiqueta} ${pagina.id}: desborde horizontal de ${m.desborde}px`)
        exigir(m.grids.length > 0, `${vp.etiqueta} ${pagina.id}: sin rejillas medidas`)
        for (const g of m.grids) {
          exigir(g.visible, `${vp.etiqueta} ${pagina.id}: tarjeta sin tamaño visible`)
          exigir(
            g.aspectoImagen >= 1.55 && g.aspectoImagen <= 1.65,
            `${vp.etiqueta} ${pagina.id}: proporción de imagen ${g.aspectoImagen} (esperada ≈1.6)`
          )
        }

        // Capturas de evidencia por resolución/página (rejilla principal).
        const grid = await page.$('.card-grid')
        if (grid) {
          const archivo = path.join(OUT, `${pagina.id}_${vp.etiqueta}.png`)
          await grid.screenshot({ path: archivo }).catch(() => {})
        }
      }
      await page.close()
    }

    // ── Comprobaciones de distribución por resolución (página de planes) ──
    const dePlanes = (etiqueta) =>
      resultados
        .filter((r) => r.startsWith(`${etiqueta} planes:`))
        .map((r) => {
          const col = /(\d+) col/.exec(r)
          const ancho = /tarjeta (\d+)x/.exec(r)
          const titulo = /titulo (\d+)px/.exec(r)
          return {
            columnas: col ? Number(col[1]) : 0,
            ancho: ancho ? Number(ancho[1]) : 0,
            titulo: titulo ? Number(titulo[1]) : 0,
          }
        })[0]

    const movil = dePlanes('360x800')
    exigir(movil && movil.columnas === 1, `planes móvil 360: ${movil?.columnas} columnas (esperada 1)`)
    const tableta = dePlanes('768x1024')
    exigir(tableta && tableta.columnas >= 2, `planes tableta 768: ${tableta?.columnas} columnas (esperadas >=2)`)
    const portatil = dePlanes('1366x768')
    exigir(portatil && portatil.columnas >= 2, `planes portátil 1366: ${portatil?.columnas} columnas (esperadas >=2)`)
    exigir(portatil && portatil.ancho >= 300, `planes portátil 1366: tarjeta de ${portatil?.ancho}px (esperada >=300)`)
    const escritorio = dePlanes('1920x1080')
    exigir(escritorio && escritorio.columnas >= 3, `planes 1920: ${escritorio?.columnas} columnas (esperadas >=3)`)
    const ultra = dePlanes('2560x1440')
    exigir(ultra && ultra.columnas >= 3, `planes 2560: ${ultra?.columnas} columnas (esperadas >=3)`)
    exigir(
      portatil && escritorio && escritorio.ancho > portatil.ancho,
      `la tarjeta debe crecer de 1366 (${portatil?.ancho}px) a 1920 (${escritorio?.ancho}px)`
    )
    exigir(
      escritorio && ultra && ultra.ancho >= escritorio.ancho,
      `la tarjeta no debe encogerse de 1920 (${escritorio?.ancho}px) a 2560 (${ultra?.ancho}px)`
    )
    exigir(
      portatil && escritorio && escritorio.titulo >= portatil.titulo,
      `el título debe crecer de 1366 (${portatil?.titulo}px) a 1920 (${escritorio?.titulo}px)`
    )
  } finally {
    await browser.close()
  }

  console.log('\n== MEDICIONES VISUALES (navegador real) ==')
  console.log(resultados.join('\n'))
  if (fallos.length) {
    console.error('\n== FALLOS ==')
    console.error(fallos.join('\n'))
    console.error(`\nRESULTADO: FAIL (${fallos.length})`)
    process.exit(1)
  }
  console.log('\nRESULTADO: OK — sin desbordes, imágenes 16/10 y distribución creciente')
}

main().catch((e) => {
  console.error('Error en la verificación visual:', e)
  process.exit(1)
})
