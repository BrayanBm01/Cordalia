import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Ban, CheckCircle2, Clock3, Loader2, RefreshCw,
  Store, LayoutDashboard, XCircle,
} from 'lucide-react'
import { vendedorAPI } from '../../services/api'
import { formatMoney } from '../negocios/businessUtils'
import { obtenerRuta } from '../../routes/offuscatedRoutes.js'

// El estado SIEMPRE lo decide el backend. Los parámetros de la URL solo
// identifican la operación (referencia / id del proveedor): nunca se usa
// `?pago=aprobado` para dar por exitosa una compra.
const PRESENTACION = {
  approved: {
    icono: CheckCircle2,
    titulo: '¡Pago aprobado!',
    mensaje: 'Tu suscripción ya está activa. Puedes empezar a usar los beneficios de tu plan.',
    tono: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    chip: 'bg-emerald-100 text-emerald-800',
  },
  pending: {
    icono: Clock3,
    titulo: 'Pago en proceso',
    mensaje: 'Estamos esperando la confirmación de Mercado Pago. Tu plan se activará automáticamente cuando el pago sea aprobado; no hace falta volver a pagar.',
    tono: 'bg-amber-50 border-amber-200 text-amber-900',
    chip: 'bg-amber-100 text-amber-900',
  },
  rejected: {
    icono: XCircle,
    titulo: 'Pago rechazado',
    mensaje: 'La entidad no aprobó el pago. No se activó ninguna suscripción ni se realizó un cobro. Puedes intentarlo de nuevo con otro medio.',
    tono: 'bg-red-50 border-red-200 text-red-800',
    chip: 'bg-red-100 text-red-800',
  },
  cancelled: {
    icono: Ban,
    titulo: 'Pago cancelado',
    mensaje: 'Cancelaste la operación. No se realizó ningún cobro y tu plan sigue sin cambios.',
    tono: 'bg-stone-100 border-stone-200 text-stone-700',
    chip: 'bg-stone-200 text-stone-700',
  },
  error: {
    icono: AlertTriangle,
    titulo: 'No pudimos verificar el pago',
    mensaje: 'No fue posible confirmar el estado con el proveedor. Tu pago no se ha activado automáticamente. Vuelve a intentarlo en unos minutos o revisa tu panel.',
    tono: 'bg-orange-50 border-orange-200 text-orange-900',
    chip: 'bg-orange-100 text-orange-900',
  },
}

function Botones({ estado }) {
  const aTienda = obtenerRuta('PLANES_PUBLICOS')
  const aPanel = obtenerRuta('PANEL_VENDEDOR')
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
      {/* Ruta ofuscada YA existente: no se inventa una URL nueva. */}
      <Link
        to={aTienda}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-moss-900 text-white font-semibold text-sm hover:bg-moss-800 transition-colors"
      >
        <Store className="w-4 h-4" />
        Volver a la tienda
      </Link>
      <Link
        to={aPanel}
        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-moss-300 text-moss-900 font-semibold text-sm hover:bg-moss-50 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        Ir a mi panel
      </Link>
      {estado === 'pending' && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-moss-800 font-semibold text-sm hover:bg-moss-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar estado
        </button>
      )}
    </div>
  )
}

export default function ResultadoPago() {
  const [params] = useSearchParams()
  const referencia = params.get('referencia') || ''
  const paymentId = params.get('payment_id') || ''
  const collectionId = params.get('collection_id') || ''
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!referencia) return undefined
    let vigente = true
    setCargando(true)
    setError(null)
    vendedorAPI
      .estadoPago(referencia, { payment_id: paymentId, collection_id: collectionId })
      .then((res) => {
        if (vigente) setDatos(res.data || null)
      })
      .catch((err) => {
        if (vigente) setError(err)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [referencia, paymentId, collectionId, intento])

  if (!referencia) return null

  const sinSesion = error?.status === 401
  const estado = sinSesion ? 'error' : datos?.estado || 'error'
  const vista = PRESENTACION[cargando ? 'pending' : estado] || PRESENTACION.error
  const Icono = cargando ? Loader2 : vista.icono

  return (
    <main className="min-h-screen bg-cream-50 px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-[28px] border p-7 sm:p-10 text-center shadow-card ${vista.tono}`}>
          <div className="mx-auto w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-5">
            <Icono className={`w-9 h-9 ${cargando ? 'animate-spin' : ''}`} />
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold">
            {cargando ? 'Verificando tu pago…' : vista.titulo}
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed">
            {cargando
              ? 'Consultando el estado real con Mercado Pago. No cierres esta ventana.'
              : sinSesion
                ? 'Inicia sesión con la cuenta del vendedor para consultar el resultado de esta operación.'
                : vista.mensaje}
          </p>
          {!cargando && error && !sinSesion && error.message && (
            <p className="mt-2 text-xs opacity-75">Detalle: {error.message}</p>
          )}

          {!cargando && datos && (
            <dl className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-sm">
              {datos.plan?.nombre && (
                <div className="rounded-xl bg-white/70 p-3">
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">Plan</dt>
                  <dd className="font-semibold">{datos.plan.nombre}</dd>
                </div>
              )}
              {Number.isFinite(Number(datos.monto)) && (
                <div className="rounded-xl bg-white/70 p-3">
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">Importe</dt>
                  <dd className="font-semibold">{formatMoney(datos.monto)} {datos.moneda || 'COP'}</dd>
                </div>
              )}
              <div className="rounded-xl bg-white/70 p-3 sm:col-span-2">
                <dt className="text-[11px] uppercase tracking-wide opacity-70">Referencia</dt>
                <dd className="font-mono text-xs break-all">{datos.referencia || referencia}</dd>
              </div>
              {datos.vencimiento && estado === 'approved' && (
                <div className="rounded-xl bg-white/70 p-3 sm:col-span-2">
                  <dt className="text-[11px] uppercase tracking-wide opacity-70">Vigencia</dt>
                  <dd className="font-semibold">
                    Hasta {new Date(datos.vencimiento).toLocaleDateString('es-CO')}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {!cargando && datos?.pendienteActivacion && (
            <p className="mt-5 text-xs sm:text-sm">
              El pago ya aparece aprobado en el proveedor, pero aún falta el aviso verificado
              (webhook). Tu plan se activará en cuanto llegue.
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${vista.chip}`}>
              {cargando ? 'Consultando' : estado}
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-white/70">
              Contado · sin cuotas
            </span>
          </div>

          {sinSesion ? (
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
              <Link
                to={obtenerRuta('LOGIN')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-moss-900 text-white font-semibold text-sm hover:bg-moss-800"
              >
                Iniciar sesión
              </Link>
              <Link
                to={obtenerRuta('PLANES_PUBLICOS')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-moss-300 text-moss-900 font-semibold text-sm hover:bg-moss-50"
              >
                Volver a la tienda
              </Link>
            </div>
          ) : (
            <Botones estado={estado} />
          )}
        </div>
        <p className="text-center text-xs text-dark-400 mt-5 px-2">
          El estado de tu suscripción se confirma en el servidor. Volver desde el checkout
          nunca activa un plan por sí solo.
        </p>
      </div>
    </main>
  )
}
