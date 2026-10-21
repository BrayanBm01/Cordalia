import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, Users, CheckCircle2, Phone, Mail, Globe,
  MessageCircle, CalendarDays, BadgePercent, Printer, Truck, Loader2,
  Ticket, Sprout, ArrowRight, Star,
} from 'lucide-react'
import { planesAPI } from '../../services/api'
import { getPlanImagen } from '../../utils/media'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney } from '../negocios/businessUtils'
import {
  TIPO_PLAN_LABEL, TIPO_PLAN_BADGE, TIPO_PRECIO_LABEL, formatDuracion,
  planPrecios, buildWhatsAppText, whatsappLink, whatsappNumber, telLink, diaActividades,
} from '../negocios/planUtils'

function formatFechaInscripcion(fecha) {
  if (!fecha) return null
  const d = new Date(fecha)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('es-CO', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Shared label component ───────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-moss-700 mb-2">
      <Sprout className="w-3.5 h-3.5" />
      {children}
    </span>
  )
}

export default function PlanDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [personas, setPersonas] = useState(2)
  const [precioInfo, setPrecioInfo] = useState({
    loading: false, original: null, promoDesc: 0, rangoDesc: 0, totalDesc: 0,
    precioPersona: null, subtotalOriginal: null, descuentoMonto: 0,
    total: null, totalOriginal: null, ahorro: 0, tipoDescuento: null,
  })
  const [salidas, setSalidas] = useState([])
  const [salidasLoading, setSalidasLoading] = useState(false)
  const [salidaSel, setSalidaSel] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [inscLoading, setInscLoading] = useState(false)
  const [inscrito, setInscrito] = useState(null)
  const [sugTransporte, setSugTransporte] = useState(null)
  const [sugLoading, setSugLoading] = useState(false)
  const precioTimer = useRef(null)

  useEffect(() => {
    setLoading(true)
    setInscrito(null)
    setSalidaSel('')
    setSalidas([])
    setConfirmando(false)
    planesAPI
      .getById(id)
      .then((res) => setPlan(res.data))
      .catch((err) => setError(err.message || 'No se pudo cargar el plan'))
      .finally(() => setLoading(false))
  }, [id])

  function salidaCerrada(s) {
    if (!s?.fecha_limite) return false
    const hora = s.hora_limite || '23:59'
    const limite = new Date(`${s.fecha_limite}T${hora}:00`)
    return !Number.isNaN(limite.getTime()) && limite < new Date()
  }

  const cargarSalidas = useCallback(async () => {
    setSalidasLoading(true)
    try {
      const res = await planesAPI.salidas(id)
      const lista = Array.isArray(res.data) ? res.data : []
      setSalidas(lista)
      const abierta = lista.find((s) => Number(s.cupo_disponible) > 0 && !salidaCerrada(s))
      setSalidaSel((sel) => (abierta && (!sel || !lista.some((s) => String(s.id) === sel)) ? String(abierta.id) : sel))
    } catch {
      setSalidas([])
    } finally {
      setSalidasLoading(false)
    }
  }, [id])

  useEffect(() => { cargarSalidas() }, [cargarSalidas])

  useEffect(() => {
    if (!id) return
    setPrecioInfo((s) => ({ ...s, loading: true }))
    clearTimeout(precioTimer.current)
    precioTimer.current = setTimeout(() => {
      planesAPI
        .precio(id, Math.max(1, personas))
        .then((res) => {
          const d = res.data
          setPrecioInfo({
            loading: false,
            original: d?.precio_original_persona ?? null,
            promoDesc: Number(d?.descuento_promocion) || 0,
            rangoDesc: Number(d?.descuento_porcentaje) || 0,
            totalDesc: Number(d?.descuento_total) || 0,
            precioPersona: d?.precio_persona ?? null,
            subtotalOriginal: d?.subtotal_original ?? null,
            descuentoMonto: Number(d?.descuento_monto) || 0,
            total: d?.total ?? null,
            totalOriginal: d?.total_original ?? null,
            ahorro: Number(d?.ahorro_total) || 0,
            tipoDescuento: d?.tipo_descuento ?? null,
          })
        })
        .catch(() => setPrecioInfo((s) => ({ ...s, loading: false })))
    }, 250)
    return () => clearTimeout(precioTimer.current)
  }, [id, personas])

  const planIdNum = plan?.id
  useEffect(() => {
    if (!planIdNum || !salidaSel) { setSugTransporte(null); return }
    setSugLoading(true)
    planesAPI
      .transporteSalida(planIdNum, Number(salidaSel))
      .then((res) => setSugTransporte(res.data && typeof res.data === 'object' ? res.data : null))
      .catch(() => setSugTransporte(null))
      .finally(() => setSugLoading(false))
  }, [planIdNum, salidaSel])

  async function inscribirse(e) {
    e.preventDefault()
    if (!plan?.business_id || !salidaSel) return
    setInscLoading(true)
    try {
      const res = await planesAPI.inscribir(plan.business_id, plan.id, Number(salidaSel), {
        personas: Math.max(1, personas),
        mensaje: mensaje.trim() || null,
      })
      toast.success(res.message || 'Inscripción registrada')
      setInscrito(res.data)
      setMensaje('')
      setConfirmando(false)
      cargarSalidas()
    } catch (err) {
      toast.error(err.message || 'No se pudo inscribir')
    } finally {
      setInscLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-cream-50"><LoadingSpinner /></div>
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center py-24">
        <p className="text-dark-500 mb-4">{error || 'Plan no encontrado'}</p>
        <button
          onClick={() => navigate('/planes')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-moss-900 text-white rounded-full text-sm font-semibold hover:bg-moss-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a planes
        </button>
      </div>
    )
  }

  const promo = Array.isArray(plan.promociones) && plan.promociones.length > 0 ? plan.promociones[0] : null
  const { efectivo, anterior, descuento } = planPrecios(plan)
  const whatsapp = buildWhatsAppText(plan, plan, personas > 0 ? personas : null)
  const waHref = whatsappLink(plan, whatsapp)
  const waNumber = whatsappNumber(plan)
  const telHref = telLink(plan)
  const negocioLink = plan.business_id ? `/negocios/${plan.business_id}` : null
  const isAdmin = user?.rol === 'ADMIN'
  const salidaElegida = salidas.find((s) => String(s.id) === salidaSel) || null
  const salidaAgotada = salidaElegida ? Number(salidaElegida.cupo_disponible) <= 0 : false
  const salidaCerradaSel = salidaElegida ? salidaCerrada(salidaElegida) : false
  const salidaBloqueada = !salidaElegida || salidaAgotada || salidaCerradaSel

  return (
    <div className="min-h-screen bg-cream-50">

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="relative w-full h-[58vh] min-h-[460px] max-h-[680px] overflow-hidden bg-moss-950">
        <img
          src={getPlanImagen(plan)}
          alt={plan.nombre}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

        {/* Content overlaid at bottom */}
        <div className="absolute inset-0 flex flex-col justify-end max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-white/75 hover:text-white text-sm font-medium mb-6 transition-colors w-fit group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${TIPO_PLAN_BADGE[plan.tipo_plan] || 'bg-white/20 text-white'}`}>
                {TIPO_PLAN_LABEL[plan.tipo_plan] || plan.tipo_plan}
              </span>
              {promo && (
                <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1">
                  <BadgePercent className="w-3 h-3" />
                  {planPrecios(plan).descuento > 0 ? `-${planPrecios(plan).descuento}%` : 'Promoción activa'}
                </span>
              )}
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {plan.nombre}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-white/70">
              {(plan.destino_lugar || plan.destino) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-moss-300" />
                  {plan.destino_lugar || plan.destino}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-moss-300" />
                {formatDuracion(plan.duracion_dias, plan.duracion_noches)}
              </span>
              {plan.negocio_nombre && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-moss-300" />
                  {plan.negocio_nombre}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT: Plan Info ──────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Description */}
            {plan.descripcion && (
              <section className="bg-white rounded-[24px] border border-cream-200 shadow-card p-7">
                <SectionLabel>Descripción del plan</SectionLabel>
                <h2 className="text-xl font-bold text-dark-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
                  ¿De qué trata este plan?
                </h2>
                <p className="text-dark-600 leading-relaxed whitespace-pre-line">{plan.descripcion}</p>
              </section>
            )}

            {/* Includes */}
            {Array.isArray(plan.incluye) && plan.incluye.length > 0 && (
              <section className="bg-white rounded-[24px] border border-cream-200 shadow-card p-7">
                <SectionLabel>Incluido</SectionLabel>
                <h2 className="text-xl font-bold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                  ¿Qué incluye?
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plan.incluye.map((inc, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-dark-700">
                      <span className="w-6 h-6 rounded-full bg-moss-900 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-moss-100" />
                      </span>
                      <span className="leading-relaxed">{inc}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Itinerary */}
            {Array.isArray(plan.itinerario) && plan.itinerario.length > 0 && (
              <section className="bg-white rounded-[24px] border border-cream-200 shadow-card p-7">
                <SectionLabel>Día a día</SectionLabel>
                <h2 className="text-xl font-bold text-dark-900 mb-6" style={{ fontFamily: 'var(--font-display)' }}>
                  Itinerario
                </h2>
                <div className="space-y-6">
                  {plan.itinerario.map((d) => {
                    const actividades = diaActividades(d)
                    if (actividades.length === 0) return null
                    return (
                      <div key={d.dia}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-8 h-8 rounded-full bg-moss-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {d.dia}
                          </span>
                          <h3 className="text-sm font-bold text-moss-900 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4" /> Día {d.dia}
                          </h3>
                        </div>
                        <ol className="relative border-l-2 border-cream-200 ml-4 space-y-4 pl-5">
                          {actividades.map((a, i) => (
                            <li key={i} className="relative">
                              <span className="absolute -left-[25px] top-1.5 w-2.5 h-2.5 rounded-full bg-moss-500 border-2 border-white" />
                              <div className="flex items-start gap-2">
                                {a.hora && (
                                  <span className="text-xs font-bold text-moss-700 whitespace-nowrap bg-moss-50 px-2 py-0.5 rounded-full">
                                    {a.hora}
                                  </span>
                                )}
                                <span className="text-sm text-dark-700 leading-relaxed">{a.descripcion}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Organizer */}
            {negocioLink && (
              <section className="bg-white rounded-[24px] border border-cream-200 shadow-card p-7">
                <SectionLabel>Operador</SectionLabel>
                <h2 className="text-xl font-bold text-dark-900 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
                  Organizado por
                </h2>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-[18px] overflow-hidden bg-cream-100 border border-cream-200 shrink-0">
                    {plan.negocio_portada ? (
                      <img src={plan.negocio_portada} alt={plan.negocio_nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-moss-800 to-moss-950">
                        <Users className="w-8 h-8 text-moss-200" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      to={negocioLink}
                      className="text-xl font-bold text-dark-900 hover:text-moss-900 transition-colors inline-flex items-center gap-2"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {plan.negocio_nombre}
                      <ArrowRight className="w-4 h-4 text-moss-600" />
                    </Link>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-dark-500">
                      {waNumber && (
                        <span className="inline-flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-moss-600" /> WhatsApp: {waNumber}
                        </span>
                      )}
                      {plan.negocio_email && (
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-moss-600" /> {plan.negocio_email}
                        </span>
                      )}
                    </div>
                    {isAdmin && plan.negocio_estado && (
                      <span className="text-xs text-dark-400 mt-1 block">Estado del negocio: {plan.negocio_estado}</span>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT: Booking Sidebar ───────────────────────────────── */}
          <aside className="lg:w-[340px] shrink-0">
            <div className="sticky top-24 space-y-4">

              {/* Price card */}
              <div className="bg-white rounded-[24px] border border-cream-200 shadow-card p-6">
                {/* Price header */}
                <div className="mb-5">
                  {anterior && (
                    <p className="text-sm text-dark-400 line-through mb-0.5">{formatMoney(anterior)}</p>
                  )}
                  <p className="text-xs uppercase tracking-wider text-dark-400 font-semibold">Precio final</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-4xl font-bold text-moss-950" style={{ fontFamily: 'var(--font-display)' }}>
                      {precioInfo.precioPersona != null
                        ? formatMoney(precioInfo.precioPersona)
                        : (efectivo ? formatMoney(efectivo) : 'Consultar')}
                    </span>
                    {(precioInfo.totalDesc > 0 || descuento > 0) && (
                      <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        -{precioInfo.totalDesc > 0 ? precioInfo.totalDesc : descuento}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-500 mt-0.5">{TIPO_PRECIO_LABEL[plan.tipo_precio] || plan.tipo_precio}</p>
                </div>

                {/* Persons counter */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-dark-600 mb-2">¿Cuántas personas?</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                      className="w-10 h-10 rounded-full border-2 border-cream-200 text-lg text-dark-600 hover:border-moss-300 hover:bg-moss-50 transition-colors cursor-pointer font-bold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1} max={200}
                      value={personas}
                      onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 h-10 text-center rounded-xl border-2 border-cream-200 text-sm font-bold text-dark-900 focus:outline-none focus:border-moss-400"
                    />
                    <button
                      onClick={() => setPersonas((p) => Math.min(200, p + 1))}
                      className="w-10 h-10 rounded-full border-2 border-cream-200 text-lg text-dark-600 hover:border-moss-300 hover:bg-moss-50 transition-colors cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="rounded-[16px] bg-cream-50 border border-cream-200 p-4 mb-4">
                  {precioInfo.loading ? (
                    <div className="flex items-center gap-2 text-sm text-dark-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Calculando...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-dark-500">{personas} {personas === 1 ? 'persona' : 'personas'}</span>
                        {precioInfo.tipoDescuento === 'promocion' && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">Promo</span>
                        )}
                        {precioInfo.tipoDescuento === 'rango' && (
                          <span className="px-2 py-0.5 rounded-full bg-moss-100 text-moss-800 text-xs font-bold">Desc. grupo</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-dark-500">Subtotal original</span>
                        <span className="text-dark-900 font-semibold">
                          {precioInfo.subtotalOriginal != null
                            ? formatMoney(precioInfo.subtotalOriginal)
                            : formatMoney((precioInfo.original ?? efectivo) * personas)}
                        </span>
                      </div>
                      {precioInfo.totalDesc > 0 && (
                        <div className="flex items-center justify-between text-sm text-red-600 font-semibold mb-1">
                          <span>Descuento {precioInfo.totalDesc}%</span>
                          <span>−{formatMoney(precioInfo.descuentoMonto)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-cream-200 text-base font-bold text-dark-900">
                        <span>TOTAL</span>
                        <span className="text-moss-950" style={{ fontFamily: 'var(--font-display)' }}>
                          {precioInfo.total != null
                            ? formatMoney(precioInfo.total)
                            : formatMoney((precioInfo.original ?? efectivo) * personas)}
                        </span>
                      </div>
                      {precioInfo.ahorro > 0 && (
                        <p className="text-xs text-moss-700 mt-2 font-semibold">
                          🎉 Estás ahorrando {formatMoney(precioInfo.ahorro)}
                        </p>
                      )}
                      {plan.capacidad_referencial != null && personas > plan.capacidad_referencial && (
                        <p className="text-xs text-amber-700 mt-2">
                          Supera la capacidad referencial ({plan.capacidad_referencial} personas). Coordina con el negocio.
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Transport suggestion */}
                {sugLoading ? (
                  <p className="text-xs text-dark-500 flex items-center gap-1.5 mb-3">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluando transporte...
                  </p>
                ) : salidaElegida && sugTransporte ? (
                  <div className="rounded-[14px] bg-moss-50 border border-moss-200 p-3 text-xs text-dark-700 space-y-1 mb-3">
                    <p className="font-bold text-moss-900 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Transporte para la salida
                    </p>
                    {sugTransporte.vehiculo ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{sugTransporte.vehiculo.tipo || 'Vehículo'}</span>
                          <span className="font-semibold">{sugTransporte.vehiculo.nombre} · {sugTransporte.vehiculo.capacidad} pax</span>
                        </div>
                        {salidaElegida.lugar_encuentro && (
                          <div className="flex items-center justify-between">
                            <span>Encuentro</span>
                            <span className="font-semibold">{salidaElegida.lugar_encuentro}</span>
                          </div>
                        )}
                        {sugTransporte.conductor ? (
                          <div className="flex items-center justify-between">
                            <span>Conductor</span>
                            <span className="font-semibold">
                              {sugTransporte.conductor.nombre}
                              {sugTransporte.conductor.telefono ? ` · ${sugTransporte.conductor.telefono}` : ''}
                            </span>
                          </div>
                        ) : (
                          <p className="text-amber-700 font-semibold">{sugTransporte.mensaje || 'Sin conductor disponible.'}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-amber-700 font-semibold">{sugTransporte.mensaje || 'Sin vehículo disponible.'}</p>
                    )}
                  </div>
                ) : null}

                {/* Salidas (departure dates) */}
                <div className="border-t border-cream-200 pt-4">
                  <h3 className="text-sm font-bold text-dark-800 flex items-center gap-1.5 mb-3">
                    <Ticket className="w-4 h-4 text-moss-700" /> Inscripción grupal
                  </h3>
                  {salidasLoading ? (
                    <p className="text-sm text-dark-400 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando fechas...
                    </p>
                  ) : salidas.length === 0 ? (
                    <p className="text-xs text-dark-400">El negocio aún no programa salidas grupales. Consulta por WhatsApp.</p>
                  ) : (
                    <div className="space-y-2">
                      {salidas.map((s) => {
                        const agotada = Number(s.cupo_disponible) <= 0
                        const cerradaFecha = salidaCerrada(s)
                        const bloqueada = agotada || cerradaFecha
                        return (
                          <label
                            key={s.id}
                            className={`flex items-start gap-2 rounded-[14px] border px-3 py-2.5 text-sm cursor-pointer transition-all ${bloqueada
                              ? 'border-cream-200 bg-cream-50 opacity-60'
                              : salidaSel === String(s.id)
                                ? 'border-moss-400 bg-moss-50 shadow-sm'
                                : 'border-cream-200 hover:border-moss-300 hover:bg-cream-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name="salida"
                              value={s.id}
                              checked={salidaSel === String(s.id)}
                              disabled={bloqueada}
                              onChange={() => setSalidaSel(String(s.id))}
                              className="accent-moss-700 mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-dark-800 block">
                                {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                                  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
                                })}
                                {s.hora ? ` · ${s.hora}` : ''}
                              </span>
                              <span className="text-xs text-dark-500 block">
                                {s.cupo_maximo} cupos · <strong>{s.cupo_disponible} disponibles</strong>
                              </span>
                              {s.lugar_encuentro && (
                                <span className="text-xs text-dark-500 block">
                                  <MapPin className="w-3 h-3 inline text-moss-600" /> {s.lugar_encuentro}
                                </span>
                              )}
                              {s.fecha_limite && !bloqueada && (
                                <span className="text-xs text-amber-600 block">
                                  Cierre: {new Date(s.fecha_limite + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                                  {s.hora_limite ? ` — ${s.hora_limite}` : ''}
                                </span>
                              )}
                              {(agotada || cerradaFecha) && (
                                <span className={`text-xs font-bold ${cerradaFecha ? 'text-dark-400' : 'text-red-600'}`}>
                                  {cerradaFecha ? 'Inscripciones cerradas' : 'Cupos agotados'}
                                </span>
                              )}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* Inscription result / form */}
                  {inscrito ? (
                    <div className="mt-3 rounded-[16px] border border-moss-300 bg-moss-50 p-4 text-sm text-moss-900">
                      <div className="flex items-center gap-2 font-bold mb-2">
                        <CheckCircle2 className="w-4 h-4" /> ¡Inscripción confirmada!
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{inscrito.personas || personas} {Number(inscrito.personas) === 1 ? 'persona' : 'personas'}</span>
                          <span className="font-bold">Cupo reservado</span>
                        </div>
                        {inscrito.created_at && (
                          <div className="flex justify-between">
                            <span>Fecha de inscripción</span>
                            <span className="font-semibold">{formatFechaInscripcion(inscrito.created_at)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Costo</span>
                          <span className="font-bold">Gratis</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-moss-800/80 mt-3">
                        Tu cupo está garantizado. Te contactaremos por WhatsApp con los detalles del viaje.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link to="/perfil" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-moss-900 text-white text-xs font-semibold hover:bg-moss-800 cursor-pointer">
                          Ver en mi perfil
                        </Link>
                        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-moss-400 text-moss-800 text-xs font-semibold hover:bg-moss-100 cursor-pointer">
                          <Printer className="w-3.5 h-3.5" /> Imprimir
                        </button>
                      </div>
                    </div>
                  ) : !confirmando ? (
                    salidas.length > 0 && !salidaBloqueada && (
                      <div className="mt-3 space-y-2">
                        {!user && (
                          <p className="text-xs text-dark-500 bg-cream-100 border border-cream-200 rounded-xl p-2.5">
                            Necesitas una cuenta.{' '}
                            <Link to="/login" className="text-moss-800 font-bold underline">Inicia sesión</Link> o{' '}
                            <Link to="/registro" className="text-moss-800 font-bold underline">regístrate</Link>.
                          </p>
                        )}
                        <button
                          onClick={() => (user ? setConfirmando(true) : navigate('/login'))}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-moss-900 text-white text-sm font-bold hover:bg-moss-800 transition-colors cursor-pointer shadow-sm"
                        >
                          <Ticket className="w-4 h-4" /> Inscribirme
                        </button>
                      </div>
                    )
                  ) : (
                    <form onSubmit={inscribirse} className="mt-3 space-y-3">
                      <p className="text-xs text-dark-500">
                        Registrándote como <strong>{user?.nombre || user?.email}</strong>. La inscripción es
                        gratuita y tu cupo queda reservado al instante.
                      </p>
                      <div className="rounded-[14px] bg-cream-50 border border-cream-200 p-3 text-sm">
                        <div className="flex justify-between text-dark-600 mb-1">
                          <span>Precio informativo por persona</span>
                          <span>{precioInfo.subtotalOriginal != null ? formatMoney(precioInfo.subtotalOriginal) : formatMoney((precioInfo.original ?? efectivo) * personas)}</span>
                        </div>
                        {precioInfo.totalDesc > 0 && (
                          <div className="flex justify-between text-red-600 font-semibold mb-1">
                            <span>Descuento {precioInfo.totalDesc}%</span>
                            <span>−{formatMoney(precioInfo.descuentoMonto)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-dark-900 border-t border-cream-200 pt-2 mt-1">
                          <span>Total referencial ({personas} {personas === 1 ? 'persona' : 'personas'})</span>
                          <span>{precioInfo.total != null ? formatMoney(precioInfo.total) : formatMoney((precioInfo.original ?? efectivo) * personas)}</span>
                        </div>
                        <p className="text-[11px] text-dark-500 mt-2">
                          Este valor es informativo. En Cordalia te inscribes sin pagar.
                        </p>
                      </div>
                      <textarea
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        rows={2}
                        placeholder="Mensaje o requerimientos del grupo (opcional)"
                        className="w-full px-3 py-2 rounded-xl border border-cream-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-moss-400/30"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmando(false)}
                          className="px-4 py-2.5 rounded-full border border-cream-200 text-sm font-semibold text-dark-600 hover:bg-cream-100 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={inscLoading}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-moss-900 text-white text-sm font-bold hover:bg-moss-800 disabled:opacity-50 cursor-pointer"
                        >
                          {inscLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                          Confirmar ({personas})
                        </button>
                      </div>
                    </form>
                  )}

                  {salidaBloqueada && salidas.length > 0 && !inscrito && (
                    <p className="text-xs text-dark-500 bg-cream-100 border border-cream-200 rounded-xl p-2.5 mt-3">
                      {salidaAgotada ? 'Cupos agotados para la salida seleccionada.' : 'Inscripciones cerradas para esta salida.'}
                    </p>
                  )}
                </div>

                {/* Contact buttons */}
                <div className="mt-5 pt-4 border-t border-cream-200 space-y-2">
                  {waHref ? (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#25D366] text-white text-sm font-bold hover:bg-[#1da851] transition-colors shadow-sm"
                    >
                      <MessageCircle className="w-5 h-5" /> Contactar por WhatsApp
                    </a>
                  ) : (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      Este negocio no tiene número de contacto registrado.
                    </div>
                  )}
                  {telHref && (
                    <a
                      href={telHref}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-cream-200 text-sm font-semibold text-dark-700 hover:border-moss-300 hover:bg-cream-100 transition-colors"
                    >
                      <Phone className="w-4 h-4" /> Llamar
                    </a>
                  )}
                  {plan.negocio_email && (
                    <a
                      href={`mailto:${plan.negocio_email}`}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-cream-200 text-sm font-semibold text-dark-700 hover:border-moss-300 hover:bg-cream-100 transition-colors"
                    >
                      <Mail className="w-4 h-4" /> Escribir email
                    </a>
                  )}
                  {plan.negocio_website && (
                    <a
                      href={plan.negocio_website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-moss-800 hover:underline mt-1"
                    >
                      <Globe className="w-4 h-4" /> Sitio web del negocio
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-dark-400 mt-3 leading-relaxed">
                  Las inscripciones a los planes de Cordalia son gratuitas: el precio mostrado es
                  informativo. Para dudas de logística, contacta al negocio.
                </p>
              </div>

              {/* Trust badges */}
              <div className="bg-moss-50 rounded-[20px] border border-moss-100 p-5">
                <p className="text-xs font-bold text-moss-900 mb-3 uppercase tracking-wider">¿Por qué Cordalia?</p>
                <ul className="space-y-2">
                  {[
                    { icon: Star, text: 'Negocios verificados y aprobados' },
                    { icon: Users, text: 'Apoyamos economía local' },
                    { icon: CheckCircle2, text: 'Precios transparentes sin sorpresas' },
                    { icon: Sprout, text: 'Turismo sostenible y consciente' },
                  ].map(({ icon: I, text }) => (
                    <li key={text} className="flex items-center gap-2 text-xs text-moss-800">
                      <I className="w-3.5 h-3.5 text-moss-700 shrink-0" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}