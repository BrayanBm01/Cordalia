import assert from 'node:assert/strict'
import { formatMoney, formatCOP, parseCOP, ocupacionPct } from '../src/pages/negocios/businessUtils.js'

const checks = [
  // formatMoney: símbolo + millares es-CO (puntos).
  () => assert.equal(formatMoney(100320), '$100.320'),
  () => assert.equal(formatMoney(132000), '$132.000'),
  () => assert.equal(formatMoney(100000), '$100.000'),
  () => assert.equal(formatMoney(264000), '$264.000'),
  () => assert.equal(formatMoney(200640), '$200.640'),
  () => assert.equal(formatMoney(0), '$0'),
  () => assert.equal(formatMoney(null), ''),
  // formatCOP (sin símbolo, para inputs): 132000 -> "132.000".
  () => assert.equal(formatCOP(100000), '100.000'),
  () => assert.equal(formatCOP(132000), '132.000'),
  () => assert.equal(formatCOP(100320), '100.320'),
  () => assert.equal(formatCOP(1000), '1.000'),
  () => assert.equal(formatCOP(1500000), '1.500.000'),
  () => assert.equal(formatCOP(25000000), '25.000.000'),
  () => assert.equal(formatCOP(''), ''),
  () => assert.equal(formatCOP(null), ''),
  () => assert.equal(formatCOP(undefined), ''),
  // parseCOP: vuelve a entero puro para enviar al backend.
  () => assert.equal(parseCOP('1.500.000'), 1500000),
  () => assert.equal(parseCOP('100.320'), 100320),
  () => assert.equal(parseCOP('132.000'), 132000),
  () => assert.equal(parseCOP(''), null),
  () => assert.equal(parseCOP(null), null),
  // ocupación siempre entera: 1/16 -> 6%, 15/20 -> 75%.
  () => assert.equal(ocupacionPct(1, 16), 6),
  () => assert.equal(ocupacionPct(10, 20), 50),
  () => assert.equal(ocupacionPct(15, 20), 75),
  () => assert.equal(ocupacionPct(20, 20), 100),
]

let pass = 0
for (const check of checks) {
  check()
  pass++
}
console.log(`  ✓ ${pass} verificaciones de formato monetario`)
console.log(`  Resultado: ${pass} PASS, 0 FAIL`)