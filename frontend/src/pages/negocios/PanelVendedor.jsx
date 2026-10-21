import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BadgeCheck, CalendarClock, CreditCard, Crown, Hourglass, Loader2, Store,
  AlertTriangle, CheckCircle2, XCircle, Sparkles, History, ShieldAlert,
} from 'lucide-react'
import { vendedorAPI } from '../../services/api'
import { formatMoney } from './businessUtils'
import { toast } from 'sonner'
import LoadingSpinner from '../../components/LoadingSpinner'

// ------------------------------------------------------------
// Estado comercial del vendedor
// ------------------------------------------------------------
const ESTADO_INFO = {
  TRIALING: {
    label: 'Prueba gratuita activa',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: Hourglass,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  ACTIVE: {
    label: 'Plan activo',
    badge: 'bg-moss-100 text-moss-800',
    icon: Crown,
    color: 'text-moss-800',
    bg: 'bg-moss-50 border-moss-200',
  },
  EXPIRED: {
    label: 'Prueba finalizada',
    badge: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  SUSPENDED: {
    label: 'Cuenta suspendida',
    badge: 'bg-red-100 text-red-700',
    icon: ShieldAlert,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
}

const SUSCRIPCION_LABEL = {
  active: 'Vigente',
  pending: 'Pago pendiente',
  rejected: 'Pago rechazado',
  cancelled: 'Cancelada',
  expired: 'Vencida',
}

function fecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fechaHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function PanelVendedor() {
  const [estado, setEstado] = useState(null)
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [contratando, setContratando] = useState(null)

  async function cargar() {
    try {
      const [resEstado, resPlanes] = await Promise.all([
        vendedorAPI.estado(),
        vendedorAPI.planes(),
      ])
      setEstado(resEstado.data)
      setPlanes(Array.isArray(resPlanes.data) ? resPlanes.data : [])
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar tu estado comercial')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function contratar(plan) {
    setContratando(plan.id)
    try {
      const res = await vendedorAPI.contratar(plan.id)
      if (res.data?.url) {
        // Mercado Pago real: el pago se confirma con la notificacion del
        // proveedor, NO al volver de la redireccion.
        window.location.assign(res.data.url)
        return
      }
      toast.success(res.message || 'Plan activado')
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo completar la contratación')
    } finally {
      setContratando(null)
    }
  }

  async function cancelar(suscripcion) {
    if (!window.confirm('¿Cancelar tu suscripción? Perderás las funciones comerciales al terminar el periodo.')) return
    try {
      const res = await vendedorAPI.cancelar(suscripcion.id)
      toast.success(res.message || 'Suscripción cancelada')
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo cancelar la suscripción')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const info = ESTADO_INFO[estado?.estado] || null
  const Icono = info?.icon || BadgeCheck
  const bloqueado = estado?.estado === 'EXPIRED' || estado?.estado === 'SUSPENDED'

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8 md:py-12">
        {/* Encabezado */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss-700 mb-2 flex items-center gap-2">
            <Store className="w-3.5 h-3.5" /> Panel del vendedor
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
            Tu espacio comercial
          </h1>
          <p className="text-sm text-dark-500 mt-2 max-w-2xl">
            Aquí ves el estado de tu cuenta, tu prueba gratuita o plan contratado, y puedes
            administrar tus pagos. Tus datos y tu contenido nunca se eliminan.
          </p>
        </div>

        {/* Aviso de prueba vencida / cuenta suspendida */}
        {bloqueado && (
          <div className={`mb-8 rounded-2xl border p-5 md:p-6 ${info.bg}`}>
            <div className="flex items-start gap-3">
              <Icono className={`w-6 h-6 shrink-0 ${info.color}`} />
              <div>
                <h2 className={`font-bold ${info.color}`}>
                  {estado.estado === 'SUSPENDED'
                    ? 'Tu cuenta está suspendida'
                    : 'Tu prueba gratuita de 7 días terminó'}
                </h2>
                <p className="text-sm text-dark-600 mt-1">
                  {estado.estado === 'SUSPENDED'
                    ? (estado.suspension_motivo ||
                        'Contacta al administrador de Cordalia para regularizar tu situación.')
                    : 'Contrata un plan para recuperar las funciones comerciales. Tu perfil, tus datos y tu información de facturación siguen disponibles.'}
                </p>
                {estado.trial_fin && (
                  <p className="text-xs text-dark-500 mt-2">
                    Fin de la prueba: <strong>{fechaHora(estado.trial_fin)}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Resumen de la prueba gratuita (datos reales del backend) */}
        {estado?.estado === 'TRIALING' && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <Hourglass className="w-6 h-6 shrink-0 text-emerald-700 mt-0.5" />
                <div>
                  <h2 className="text-lg font-bold text-emerald-900">
                    Tu prueba gratuita está activa
                  </h2>
                  <p className="text-sm text-emerald-900/80 mt-1">
                    Te quedan <strong>{estado.dias_restantes}</strong>{' '}
                    {Number(estado.dias_restantes) === 1 ? 'día' : 'días'} de prueba gratuita.
                  </p>
                  <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-emerald-900/80 sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="font-semibold">Inicio:</dt>
                      <dd>{fechaHora(estado.trial_inicio)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold">Fecha de finalización:</dt>
                      <dd>{fechaHora(estado.trial_fin)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <a
                href="#planes-comerciales"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition-colors shrink-0"
              >
                <CreditCard className="w-4 h-4" /> Ver planes y contratar
              </a>
            </div>
          </div>
        )}

        {/* Estado de la cuenta */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <div className="bg-white rounded-2xl border border-dark-100 p-5">
            <p className="text-xs font-semibold text-dark-500 mb-2">Estado de la cuenta</p>
            <div className="flex items-center gap-2">
              <Icono className={`w-5 h-5 ${info?.color || 'text-dark-500'}`} />
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${info?.badge || 'bg-dark-100 text-dark-600'}`}>
                {info?.label || 'Sin política aplicada'}
              </span>
            </div>
            {estado?.sin_polica && (
              <p className="text-[11px] text-dark-400 mt-2">
                Cuenta anterior a la prueba gratuita: conserva el acceso.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-dark-100 p-5">
            <p className="text-xs font-semibold text-dark-500 mb-2">
              {estado?.estado === 'ACTIVE' ? 'Vigencia del plan' : 'Prueba gratuita'}
            </p>
            {estado?.estado === 'ACTIVE' ? (
              <>
                <p className="text-lg font-bold text-dark-900 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-moss-600" />
                  {fecha(estado.fin_suscripcion_activa)}
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Plan: <strong>{estado.plan_actual?.nombre || '—'}</strong>
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-dark-900">
                  {Number(estado?.dias_restantes || 0)}{' '}
                  <span className="text-sm font-medium text-dark-500">
                    {Number(estado?.dias_restantes || 0) === 1 ? 'día restante' : 'días restantes'}
                  </span>
                </p>
                <p className="text-xs text-dark-500 mt-1">
                  Inicio: {fechaHora(estado?.trial_inicio)} · Fin: {fechaHora(estado?.trial_fin)}
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-dark-100 p-5">
            <p className="text-xs font-semibold text-dark-500 mb-2">Plan comercial actual</p>
            <p className="text-lg font-bold text-dark-900">
              {estado?.plan_actual?.nombre || 'Sin plan contratado'}
            </p>
            {estado?.plan_actual && (
              <p className="text-xs text-dark-500 mt-1">
                {formatMoney(estado.plan_actual.precio)} / mes
              </p>
            )}
            <Link
              to="/mis-negocios"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-moss-800 hover:underline"
            >
              <Store className="w-3.5 h-3.5" /> Ir a mis negocios
            </Link>
          </div>
        </div>

        {/* Planes disponibles */}
        <section id="planes-comerciales" className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8 mb-8 scroll-mt-6">
          <h2 className="text-xl font-bold text-dark-900 mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Sparkles className="w-5 h-5 text-primary-600" /> Planes comerciales
          </h2>
          <p className="text-sm text-dark-500 mb-6">
            Todos los planes se cobran por un mes. Puedes contratar antes de que termine tu
            prueba gratuita.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            {planes.map((plan) => {
              const esActual = estado?.plan_actual?.id === plan.id
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-5 flex flex-col ${
                    esActual ? 'border-moss-400 bg-moss-50' : 'border-dark-100 bg-cream-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-dark-900">{plan.nombre}</h3>
                    {esActual && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-moss-800 text-white">
                        Actual
                      </span>
                    )}
                  </div>
                  {plan.descripcion && (
                    <p className="text-xs text-dark-500 mb-3">{plan.descripcion}</p>
                  )}
                  <p className="text-2xl font-bold text-dark-900 mb-3">
                    {formatMoney(plan.precio)}
                    <span className="text-xs font-medium text-dark-500"> / mes</span>
                  </p>
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <ul className="space-y-1.5 text-xs text-dark-600 mb-4 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-moss-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => contratar(plan)}
                    disabled={contratando === plan.id || Number(plan.precio) <= 0}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-moss-900 text-white text-sm font-bold hover:bg-moss-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {contratando === plan.id ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                    ) : (
                      <><CreditCard className="w-4 h-4" /> {esActual ? 'Renovar' : 'Contratar'}</>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
          {estado?.proveedor?.sandbox && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-5">
              Modo simulación activo: el pago se aprueba en el servidor sin mover dinero real.
              {estado.proveedor.real
                ? ''
                : ' Configura MERCADOPAGO_ACCESS_TOKEN y PAYMENT_PROVIDER=mercadopago para cobrar de verdad.'}
            </p>
          )}
        </section>

        {/* Historial */}
        <section className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8">
          <h2 className="text-xl font-bold text-dark-900 mb-6 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <History className="w-5 h-5 text-primary-600" /> Historial de suscripciones y pagos
          </h2>

          {(!estado?.suscripciones || estado.suscripciones.length === 0) ? (
            <p className="text-sm text-dark-500 text-center py-8">
              Todavía no tienes suscripciones. Contrata un plan para empezar.
            </p>
          ) : (
            <div className="space-y-3 mb-8">
              {estado.suscripciones.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-dark-100 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    {s.estado === 'active' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : s.estado === 'rejected' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <CreditCard className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-dark-900">{s.plan_nombre || 'Plan'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-dark-100 text-dark-600">
                        {SUSCRIPCION_LABEL[s.estado] || s.estado}
                      </span>
                    </div>
                    <p className="text-xs text-dark-500 mt-0.5">
                      {formatMoney(s.monto)} · {fechaHora(s.starts_at)}
                      {s.ends_at ? ` → ${fecha(s.ends_at)}` : ''}
                    </p>
                    {s.referencia_externa && (
                      <p className="text-[11px] text-dark-400 mt-0.5">
                        Ref: <span className="font-mono">{s.referencia_externa}</span>
                      </p>
                    )}
                  </div>
                  {s.estado === 'active' && (
                    <button
                      type="button"
                      onClick={() => cancelar(s)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dark-50 text-dark-600 border border-dark-100 hover:border-red-300 hover:text-red-600 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {estado?.pagos?.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-dark-700 mb-3">Pagos registrados</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-dark-400 border-b border-dark-100">
                      <th className="py-2 pr-3 font-semibold">Fecha</th>
                      <th className="py-2 pr-3 font-semibold">Evento</th>
                      <th className="py-2 pr-3 font-semibold">Estado</th>
                      <th className="py-2 pr-3 font-semibold">Monto</th>
                      <th className="py-2 font-semibold">Referencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-100">
                    {estado.pagos.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 text-dark-600">{fechaHora(p.created_at)}</td>
                        <td className="py-2.5 pr-3 text-dark-600">{p.evento}</td>
                        <td className="py-2.5 pr-3 text-dark-600 capitalize">{p.estado}</td>
                        <td className="py-2.5 pr-3 text-dark-600">{formatMoney(p.monto)}</td>
                        <td className="py-2.5 font-mono text-xs text-dark-400">{p.referencia_externa || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
