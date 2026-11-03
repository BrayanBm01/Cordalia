/**
 * Verificación post-build del frontend.
 *
 * Consola: se ejecuta automáticamente tras `npm run build`.
 *
 * Por qué existe: durante la integración de las rutas ofuscadas, el build
 * se ejecutó con una versión intermedia de las fuentes en la que varios
 * archivos usaban `obtenerRuta(...)` SIN importarlo. Rollup/ESBuild deja
 * los identificadores no resueltos como globals SIN fallar, así que el
 * bundle roto llegó a producción y recién aparecía en el navegador como
 * `ReferenceError: obtenerRuta is not defined` (capturado por el
 * AppErrorBoundary con el mensaje "Algo salió mal").
 *
 * Este chequeo falla el build si en el bundle final queda alguna llamada
 * a `obtenerRuta(` no resuelta, evitando que esa clase de error vuelva a
 * pasar de forma silenciosa.
 */

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.resolve(__dirname, '../dist/assets')

// `obtenerRuta(` como llamada libre: no debe sobrevivir la minificación
// (los imports correctos quedan con un alias interno o se inlinean).
// El mensaje de error del propio módulo contiene `obtenerRuta:` (con dos
// puntos, sin paréntesis), por lo que no produce falsos positivos.
const PATRON_LLAMADA = /(?<![\w.$])obtenerRuta\s*\(/

let proximos = []
try {
  proximos = readdirSync(assetsDir).filter((f) => f.endsWith('.js'))
} catch {
  console.error('checkBundle: no se encontró dist/assets. ¿Se ejecutó `vite build` antes?')
  process.exit(1)
}

if (proximos.length === 0) {
  console.error('checkBundle: dist/assets no contiene bundles JS.')
  process.exit(1)
}

const problemas = []
for (const archivo of proximos) {
  const contenido = readFileSync(path.join(assetsDir, archivo), 'utf8')
  const coincidencia = contenido.match(PATRON_LLAMADA)
  if (coincidencia) {
    const idx = coincidencia.index ?? 0
    problemas.push(
      `${archivo}: llamada a obtenerRuta() no resuelta cerca de "…${contenido.slice(Math.max(0, idx - 60), idx + 60)}…"`
    )
  }
}

if (problemas.length > 0) {
  console.error('\n✗ checkBundle falló: el bundle contiene llamadas no resueltas a obtenerRuta().')
  console.error('  Causa típica: un archivo usa obtenerRuta(...) sin importarlo desde')
  console.error('  src/routes/offuscatedRoutes.js, o el mapa de rutas cambió sin regenerar.\n')
  for (const p of problemas) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(`checkBundle OK: ${proximos.length} bundle(s) de dist/assets sin llamadas no resueltas a obtenerRuta().`)
