/**
 * Pruebas del servicio de Google Identity Services (frontend).
 *
 * Consola: `node tests/googleAuth.test.mjs`
 *
 * Cubren los puntos donde estaba el fallo de produccion, sin navegador ni
 * credenciales reales:
 *   - SDK no disponible / bloqueado  -> error acotado, nunca promesa colgada.
 *   - callback sin credencial        -> llega null (cancelacion), no cuelga.
 *   - credencial valida              -> llega intacta al llamador.
 *   - renderButton recibe el client_id y no se usa One Tap (prompt).
 *
 * No dependen de red: Google se simula con un `window.google` minimo.
 */
import assert from 'node:assert/strict'

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

async function checkAsync(nombre, fn) {
  try {
    await fn()
    console.log(`  ✓ ${nombre}`)
    pass++
  } catch (e) {
    console.error(`  ✗ ${nombre}\n      ${e.message}`)
    fail++
  }
}

function crearDom() {
  const scripts = []
  const contenedor = {
    clientWidth: 380,
    children: [],
    replaceChildren() {
      this.children = []
    },
  }
  return {
    contenedor,
    documentStub: {
      head: {
        appendChild(script) {
          scripts.push(script)
        },
      },
      createElement() {
        return { src: '', async: false, defer: false, onerror: null, onload: null }
      },
      querySelector() {
        return null
      },
    },
  }
}

function instalar(documentStub, windowExtra = {}) {
  const previoDoc = globalThis.document
  const previoWin = globalThis.window
  globalThis.document = documentStub
  globalThis.window = { ...windowExtra }
  return () => {
    globalThis.document = previoDoc
    globalThis.window = previoWin
  }
}

// El modulo cachea la promesa del SDK; se reimporta con sufijo unico por prueba.
let n = 0
function importarGoogle() {
  n += 1
  return import(`../src/services/google.js?prueba=${n}`)
}

async function main() {
  console.log('\n=== Pruebas de Google Identity Services (frontend) ===\n')

  await checkAsync('SDK no disponible: rechaza con error acotado sin quedar pendiente', async () => {
    const { documentStub } = crearDom()
    const restaurar = instalar(documentStub)
    try {
      const { loadGoogleIdentity } = await importarGoogle()
      await assert.rejects(() => loadGoogleIdentity(), /Google Identity Services/)
    } finally {
      restaurar()
    }
  })

  await checkAsync('SDK no disponible: un segundo intento tampoco queda colgado', async () => {
    const { documentStub } = crearDom()
    const restaurar = instalar(documentStub)
    try {
      const { loadGoogleIdentity } = await importarGoogle()
      await assert.rejects(() => loadGoogleIdentity(), /Google Identity Services/)
      await assert.rejects(() => loadGoogleIdentity(), /Google Identity Services/)
    } finally {
      restaurar()
    }
  })

  await checkAsync('renderButton: usa el boton oficial con el client_id correcto', async () => {
    const { documentStub, contenedor } = crearDom()
    const llamadas = []
    const googleStub = {
      accounts: {
        id: {
          initialize(opts) {
            llamadas.push({ tipo: 'initialize', opts })
            this._callback = opts.callback
          },
          renderButton(el, opts) {
            llamadas.push({ tipo: 'renderButton', opts })
            el.children.push('boton-oficial')
          },
          prompt() {
            llamadas.push({ tipo: 'prompt' })
          },
        },
      },
    }
    const restaurar = instalar(documentStub, { google: googleStub })
    try {
      const { renderGoogleButton } = await importarGoogle()
      await renderGoogleButton(contenedor, {
        clientId: 'cid-de-prueba.apps.googleusercontent.com',
        onCredential: () => {},
      })
      const init = llamadas.find((l) => l.tipo === 'initialize')
      const render = llamadas.find((l) => l.tipo === 'renderButton')
      assert.ok(init, 'debe llamar initialize')
      assert.equal(init.opts.client_id, 'cid-de-prueba.apps.googleusercontent.com')
      assert.ok(render, 'debe llamar renderButton')
      assert.equal(contenedor.children.length, 1, 'exactamente un boton')
      assert.ok(!llamadas.some((l) => l.tipo === 'prompt'), 'NO debe usar One Tap (prompt)')
    } finally {
      restaurar()
    }
  })

  await checkAsync('credencial valida: llega intacta al llamador', async () => {
    const { documentStub, contenedor, } = crearDom()
    const CRED = 'id-token-de-prueba'
    const googleStub = {
      accounts: {
        id: {
          initialize(opts) {
            this._callback = opts.callback
          },
          renderButton() {},
        },
      },
    }
    const restaurar = instalar(documentStub, { google: googleStub })
    try {
      const { renderGoogleButton } = await importarGoogle()
      let recibida = 'no-invocado'
      await renderGoogleButton(contenedor, {
        clientId: 'cid',
        onCredential: (c) => {
          recibida = c
        },
      })
      googleStub.accounts.id._callback({ credential: CRED })
      assert.equal(recibida, CRED)
    } finally {
      restaurar()
    }
  })

  await checkAsync('callback sin credencial: informa null (cancelacion), no cuelga', async () => {
    const { documentStub, contenedor } = crearDom()
    const googleStub = {
      accounts: {
        id: {
          initialize(opts) {
            this._callback = opts.callback
          },
          renderButton() {},
        },
      },
    }
    const restaurar = instalar(documentStub, { google: googleStub })
    try {
      const { renderGoogleButton } = await importarGoogle()
      let recibida = 'no-invocado'
      await renderGoogleButton(contenedor, {
        clientId: 'cid',
        onCredential: (c) => {
          recibida = c
        },
      })
      googleStub.accounts.id._callback({})
      assert.equal(recibida, null, 'sin credencial debe llegar null')
    } finally {
      restaurar()
    }
  })

  await checkAsync('sin clientId: rechaza con mensaje claro', async () => {
    const { documentStub, contenedor } = crearDom()
    const restaurar = instalar(documentStub, {
      google: { accounts: { id: { initialize() {}, renderButton() {} } } },
    })
    try {
      const { renderGoogleButton } = await importarGoogle()
      await assert.rejects(
        () => renderGoogleButton(contenedor, { clientId: '' }),
        /Client ID no configurado/
      )
    } finally {
      restaurar()
    }
  })

  check('el modulo ya no expone el flujo One Tap getGoogleIdToken', async () => {
    const mod = await importarGoogle()
    assert.equal(mod.getGoogleIdToken, undefined, 'getGoogleIdToken no debe existir')
    assert.equal(typeof mod.renderGoogleButton, 'function')
    assert.equal(typeof mod.loadGoogleIdentity, 'function')
  })

  console.log(`\n  Resultado: ${pass} PASS, ${fail} FAIL\n`)
  process.exit(fail ? 1 : 0)
}

main()
