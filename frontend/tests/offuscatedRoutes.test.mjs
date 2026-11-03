/**
 * Pruebas del sistema de rutas ofuscadas.
 *
 * Consola: `node tests/offuscatedRoutes.test.mjs`
 *
 * Motivo de esta suite: al integrar la ofuscación, varios archivos
 * quedaron usando `obtenerRuta(...)` sin importarlo y el error solo
 * aparecía en el navegador (`obtenerRuta is not defined`). Estas
 * comprobaciones estáticas y unitarias detectan esa clase de fallo
 * antes de desplegar.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  RUTAS_OFUSCADAS,
  RUTAS_INVERSA,
  obtenerRuta,
  rutaCon,
  nombreRuta,
  esRutaOfuscada,
} from '../src/routes/offuscatedRoutes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(__dirname, '../src')
const MODULO_RUTAS = path.resolve(SRC, 'routes/offuscatedRoutes.js')
const APP_JSX = path.resolve(SRC, 'App.jsx')

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

function listarFuentes(dir) {
  const resultado = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules') continue
    const completo = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      resultado.push(...listarFuentes(completo))
    } else if (/\.(jsx?|mjs)$/.test(entrada.name)) {
      resultado.push(completo)
    }
  }
  return resultado
}

const fuentes = listarFuentes(SRC).filter((f) => f !== MODULO_RUTAS)

function leerArchivo(archivo) {
  return fs.readFileSync(archivo, 'utf8')
}

/* ── 1. Integridad del mapa de rutas ─────────────────────────────────── */

check('los identificadores son únicos', () => {
  const valores = Object.values(RUTAS_OFUSCADAS)
  assert.equal(new Set(valores).size, valores.length, 'hay identificadores repetidos')
})

check('los identificadores tienen formato aleatorio de 8 caracteres', () => {
  for (const [clave, id] of Object.entries(RUTAS_OFUSCADAS)) {
    assert.match(id, /^[A-Za-z0-9]{8}$/, `${clave} no tiene formato de 8 caracteres alfanuméricos`)
  }
})

check('los identificadores no contienen nombres descriptivos', () => {
  const palabras = [
    'admin',
    'login',
    'registro',
    'perfil',
    'usuario',
    'negocio',
    'panel',
    'vendedor',
    'home',
    'inicio',
    'favorito',
    'plan',
    'lugar',
    'reset',
    'password',
  ]
  for (const [clave, id] of Object.entries(RUTAS_OFUSCADAS)) {
    const minuscula = id.toLowerCase()
    for (const palabra of palabras) {
      assert.ok(
        !minuscula.includes(palabra),
        `${clave} (${id}) revela la palabra "${palabra}"`
      )
    }
  }
})

check('el mapa inverso coincide con el directo', () => {
  const esperado = Object.fromEntries(
    Object.entries(RUTAS_OFUSCADAS).map(([nombre, id]) => [id, nombre])
  )
  assert.deepEqual(RUTAS_INVERSA, esperado)
})

/* ── 2. Contrato de los helpers ──────────────────────────────────────── */

check('obtenerRuta devuelve la ruta absoluta correcta', () => {
  // Contrato: el mapa guarda el identificador crudo, pero obtenerRuta
  // SIEMPRE devuelve la ruta absoluta ("/identificador"), blindada
  // contra la resolución relativa de React Router.
  assert.equal(obtenerRuta('INICIO'), `/${RUTAS_OFUSCADAS.INICIO}`)
  assert.equal(obtenerRuta('ADMIN_USUARIOS'), `/${RUTAS_OFUSCADAS.ADMIN_USUARIOS}`)
})

check('todas las rutas devueltas por obtenerRuta son absolutas', () => {
  for (const clave of Object.keys(RUTAS_OFUSCADAS)) {
    const ruta = obtenerRuta(clave)
    assert.ok(
      ruta.startsWith('/') && ruta.length === RUTAS_OFUSCADAS[clave].length + 1,
      `${clave} -> "${ruta}" no es la ruta absoluta del identificador`
    )
    assert.ok(!ruta.includes('//'), `${clave} -> "${ruta}" contiene barras dobles`)
  }
})

check('rutaCon devuelve rutas absolutas con segmentos', () => {
  assert.equal(rutaCon('LUGARES', 12), `/${RUTAS_OFUSCADAS.LUGARES}/12`)
  assert.equal(rutaCon('MIS_NEGOCIOS', 7, 'editar'), `/${RUTAS_OFUSCADAS.MIS_NEGOCIOS}/7/editar`)
  assert.equal(rutaCon('INICIO'), `/${RUTAS_OFUSCADAS.INICIO}`, 'sin segmentos = solo la base')
})

check('obtenerRuta rechaza claves inexistentes o inválidas', () => {
  assert.throws(() => obtenerRuta('NO_EXISTE'), /no definida/)
  assert.throws(() => obtenerRuta(''), /texto no vacío/)
  assert.throws(() => obtenerRuta(null), /texto no vacío/)
  assert.throws(() => obtenerRuta(123), /texto no vacío/)
})

check('nombreRuta y esRutaOfuscada funcionan', () => {
  assert.equal(nombreRuta(RUTAS_OFUSCADAS.ADMIN), 'ADMIN')
  assert.equal(nombreRuta(`/${RUTAS_OFUSCADAS.ADMIN}`), 'ADMIN', 'acepta ruta absoluta')
  assert.equal(nombreRuta('no-existe'), null)
  assert.equal(nombreRuta(null), null)
  assert.equal(esRutaOfuscada(RUTAS_OFUSCADAS.PERFIL), true)
  assert.equal(esRutaOfuscada(obtenerRuta('PERFIL')), true, 'acepta la ruta absoluta')
  assert.equal(esRutaOfuscada('no-existe'), false)
  assert.equal(esRutaOfuscada(''), false)
})

/* ── 3. Estática: imports correctos de obtenerRuta ───────────────────── */

function importaObtenerRuta(archivo) {
  const contenido = leerArchivo(archivo)
  if (!contenido.includes('obtenerRuta')) return { usa: false, importa: false, specifier: null }

  const usa = /obtenerRuta\s*\(/.test(contenido)
  if (!usa) return { usa: false, importa: false, specifier: null }

  const regex = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g
  let match
  let specifier = null
  while ((match = regex.exec(contenido)) !== null) {
    const nombres = match[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0].trim())
    if (nombres.includes('obtenerRuta')) {
      specifier = match[2]
      break
    }
  }
  return { usa, importa: specifier !== null, specifier }
}

check('todo archivo que usa obtenerRuta lo importa desde el módulo correcto', () => {
  const errores = []
  for (const archivo of fuentes) {
    const { usa, importa, specifier } = importaObtenerRuta(archivo)
    if (!usa) continue
    if (!importa) {
      errores.push(`${path.relative(SRC, archivo)}: usa obtenerRuta sin importarlo`)
      continue
    }
    const resuelto = path.resolve(path.dirname(archivo), specifier.replace(/\.js$/, '') + '.js')
    if (resuelto !== MODULO_RUTAS) {
      errores.push(
        `${path.relative(SRC, archivo)}: importa desde "${specifier}" (debería apuntar a routes/offuscatedRoutes)`
      )
    }
  }
  assert.deepEqual(errores, [], errores.join('\n      '))
})

/* ── 4. Estática: claves usadas existen y App.jsx declara todas ──────── */

const KEYS_USADAS = new Set()
for (const archivo of fuentes) {
  const contenido = leerArchivo(archivo)
  const regex = /obtenerRuta\(\s*['"]([^'"]+)['"]\s*\)/g
  let match
  while ((match = regex.exec(contenido)) !== null) {
    KEYS_USADAS.add(match[1])
  }
}

check('todas las claves usadas en el código existen en el mapa', () => {
  const inexistentes = [...KEYS_USADAS].filter((clave) => !(clave in RUTAS_OFUSCADAS))
  assert.deepEqual(inexistentes, [], `claves sin definición: ${inexistentes.join(', ')}`)
})

check('App.jsx declara una ruta para cada clave del mapa', () => {
  const contenidoApp = leerArchivo(APP_JSX)
  const clavesApp = new Set()
  const regex = /obtenerRuta\(\s*['"]([^'"]+)['"]\s*\)/g
  let match
  while ((match = regex.exec(contenidoApp)) !== null) {
    clavesApp.add(match[1])
  }
  const faltantes = Object.keys(RUTAS_OFUSCADAS).filter((clave) => !clavesApp.has(clave))
  assert.deepEqual(faltantes, [], `App.jsx no declara: ${faltantes.join(', ')}`)
})

check('no quedan enlaces estáticos con rutas legibles', () => {
  const errores = []
  for (const archivo of fuentes) {
    const contenido = leerArchivo(archivo)
    const matches = contenido.match(/to="\/[^"]*"/g) || []
    if (matches.length > 0) {
      errores.push(`${path.relative(SRC, archivo)}: ${matches.join(', ')}`)
    }
  }
  assert.deepEqual(errores, [], errores.join('\n      '))
})

check('no hay declaraciones de ruta duplicadas en App.jsx', () => {
  const contenidoApp = leerArchivo(APP_JSX)
  // Se extrae la expresión completa de cada `path={...}` de una sola línea.
  // Así, `obtenerRuta('LUGARES')` y `obtenerRuta('LUGARES') + '/:id'` cuentan
  // como rutas distintas (correcto), pero repetir la misma expresión no.
  const rutas = []
  const regex = /path=\{([^}\n]+(?:\}[^}\n]*)*)\}/g
  let match
  while ((match = regex.exec(contenidoApp)) !== null) {
    rutas.push(match[1].trim())
  }
  const repetidas = rutas.filter((r, i) => rutas.indexOf(r) !== i)
  assert.deepEqual(repetidas, [], `rutas duplicadas: ${[...new Set(repetidas)].join(', ')}`)
})

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)