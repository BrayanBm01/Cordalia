/**
 * Pruebas de las reglas de validación compartidas del frontend.
 *
 * Consola: `node tests/validation.test.mjs`
 *
 * El backend sigue siendo la autoridad final, pero estas reglas deben
 * coincidir para no enviar datos que el servidor rechazará y para dar
 * feedback inmediato al usuario.
 */
import assert from 'node:assert/strict'
import {
  isValidPersonName,
  isValidBusinessName,
  isEmail,
  validatePassword,
  isValidPhone,
  isValidHttpUrl,
  parseInteger,
  parseDecimal,
  isValidDateOnly,
  normalizeText,
} from '../src/utils/validation.js'

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

// Nombres de persona
for (const nombre of ['María José', 'Núñez', "O'Connor", 'Jean-Luc', "D'Angelo", 'Ana']) {
  check(`nombre válido: ${nombre}`, () => assert.equal(isValidPersonName(nombre), true))
}
for (const nombre of ['Ana123', '12345', '   ', 'A', 'a'.repeat(101), 'José\nPérez', 'José--Pérez']) {
  check(`nombre inválido: ${JSON.stringify(nombre)}`, () =>
    assert.equal(isValidPersonName(nombre), false)
  )
}
check('normaliza espacios internos del nombre', () =>
  assert.equal(isValidPersonName('  María   José  '), true)
)
check('rechaza nombres no textuales', () => {
  assert.equal(isValidPersonName(null), false)
  assert.equal(isValidPersonName(123), false)
})

// Nombres comerciales: los dígitos sí son válidos.
check('negocio con dígitos', () => assert.equal(isValidBusinessName('Hotel 5 Estrellas'), true))
check('negocio vacío inválido', () => assert.equal(isValidBusinessName('   '), false))
check('negocio solo signos inválido', () => assert.equal(isValidBusinessName('!!!'), false))
check('negocio demasiado largo inválido', () =>
  assert.equal(isValidBusinessName('a'.repeat(201)), false)
)

// Email
for (const email of ['persona@example.com', 'A@B.CO', 'nombre.apellido@sub.dominio.co']) {
  check(`email válido: ${email}`, () => assert.equal(isEmail(email), true))
}
for (const email of [
  'sin-arroba',
  'a@b',
  'a@b.c',
  'a..b@test.com',
  '.a@test.com',
  'a b@test.com',
  'a'.repeat(250) + '@test.com',
]) {
  check(`email inválido: ${JSON.stringify(email)}`, () => assert.equal(isEmail(email), false))
}
check('email no textual inválido', () => assert.equal(isEmail(123), false))

// Contraseña: mínimo 6, máximo 72 bytes de bcrypt, sin controles.
check('contraseña corta rechazada', () => assert.notEqual(validatePassword('12345'), null))
check('72 bytes ASCII válidos', () => assert.equal(validatePassword('a'.repeat(72)), null))
check('73 bytes ASCII rechazados', () => assert.notEqual(validatePassword('a'.repeat(73)), null))
check('más de 72 bytes UTF-8 rechazados', () =>
  assert.notEqual(validatePassword('ñ'.repeat(37)), null)
)
check('caracter de control rechazado', () =>
  assert.notEqual(validatePassword('Clave\u0001Segura'), null)
)
check('contraseña no textual rechazada', () => assert.notEqual(validatePassword(123456), null))

// Teléfono
check('teléfono válido', () => assert.equal(isValidPhone('+57 (300) 123-4567'), true))
check('teléfono con pocos dígitos inválido', () => assert.equal(isValidPhone('123'), false))
check('teléfono con letras inválido', () => assert.equal(isValidPhone('abc1234567'), false))
check('teléfono no textual inválido', () => assert.equal(isValidPhone(null), false))

// URL
check('URL https válida', () => assert.equal(isValidHttpUrl('https://example.com/ruta'), true))
for (const url of [
  'javascript:alert(1)',
  'data:text/html,hola',
  'ftp://example.com',
  'https://user:pass@example.com',
  'no-es-url',
]) {
  check(`URL inválida: ${url}`, () => assert.equal(isValidHttpUrl(url), false))
}

// Enteros estrictos
check('entero válido', () => assert.equal(parseInteger(4, { min: 1, max: 5 }), 4))
check('entero en texto válido', () => assert.equal(parseInteger('4', { min: 1, max: 5 }), 4))
for (const valor of [4.5, true, false, null, '4.5', '4.0', 'abc', NaN, Infinity]) {
  check(`entero inválido: ${String(valor)}`, () =>
    assert.equal(parseInteger(valor, { min: 1, max: 5 }), null)
  )
}
check('entero fuera de rango', () =>
  assert.equal(parseInteger(0, { min: 1, max: 5 }), null)
)

// Decimales finitos, acotados y con 2 decimales
check('decimal válido', () =>
  assert.equal(parseDecimal('10.50', { min: 0, max: 100 }), 10.5)
)
check('cero válido', () => assert.equal(parseDecimal(0, { min: 0, max: 100 }), 0))
for (const valor of ['10.555', -1, 'abc', '1e2', true, [], {}, NaN, Infinity]) {
  check(`decimal inválido: ${String(valor)}`, () =>
    assert.ok(Number.isNaN(parseDecimal(valor, { min: 0, max: 100 })))
  )
}
check('decimal fuera de rango', () =>
  assert.ok(Number.isNaN(parseDecimal(100000000, { min: 0, max: 99999999.99 })))
)

// Fechas reales
check('2026 no es bisiesto', () => assert.equal(isValidDateOnly('2026-02-29'), false))
check('2028 sí es bisiesto', () => assert.equal(isValidDateOnly('2028-02-29'), true))
check('mes inválido', () => assert.equal(isValidDateOnly('2026-13-01'), false))
check('formato de fecha inválido', () => assert.equal(isValidDateOnly('01/01/2026'), false))

// Texto
check('normaliza texto de una línea', () =>
  assert.equal(normalizeText('  Hola   mundo  '), 'Hola mundo')
)
check('normaliza texto multilínea', () =>
  assert.equal(normalizeText('  Hola  \r\n\r\n\r\n  mundo  ', { multiline: true }), 'Hola\n\nmundo')
)

console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
