import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, Users, CheckCircle2, Phone, Mail, Globe,
  MessageCircle, ImageOff, CalendarDays, BadgePercent, Printer, Truck, Loader2, Ticket,
} from 'lucide-react'
import { planesAPI } from '../../services/api'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney } from '../negocios/businessUtils'
import {
  TIPO_PLAN_LABEL, TIPO_PLAN_BADGE, TIPO_PRECIO_LABEL, formatDuracion,
  planPrecios, buildWhatsAppText, whatsappLink, whatsappNumber, telLink, diaActividades,
} from '../negocios/planUtils'

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

  useEffect(() => {
    cargarSalidas()
  }, [cargarSalidas])

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

  // Transporte automático de la salida seleccionada (según inscritos reales).
  const planIdNum = plan?.id
  useEffect(() => {
    if (!planIdNum || !salidaSel) {
      setSugTransporte(null)
      return
    }
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

  if (loading) return <div className="min-h-screen bg-dark-50"><LoadingSpinner /></div>
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-dark-50 flex flex-col items-center justify-center py-24">
        <p className="text-dark-500 mb-4">{error || 'Plan no encontrado'}</p>
        <button onClick={() => navigate('/planes')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver a planes
        </button>
      </div>
    )
  }

  const promo = Array.isArray(plan.promociones) && plan.promociones.length > 0 ? plan.promociones[0] : null
  const { efectivo, anterior, descuento } = planPrecios(plan)
  const imagenes = Array.isArray(plan.plan_imagenes) ? plan.plan_imagenes : []
  const portada = imagenes.find((i) => i.is_primary) || imagenes[0]
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-dark-50 py-8 md:py-12"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-dark-600 hover:text-primary-700 mb-6 transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {imagenes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="md:col-span-2 rounded-2xl overflow-hidden bg-dark-100 aspect-[16/9]">
              <img src={portada?.url} alt={plan.nombre} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
              {imagenes.filter((i) => i.id !== portada?.id).slice(0, 2).map((img) => (
                <div key={img.id} className="rounded-2xl overflow-hidden bg-dark-100 aspect-[16/9]">
                  <img src={img.url} alt={img.alt_text || plan.nombre} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-2xl bg-dark-100 aspect-[16/6] flex flex-col items-center justify-center text-dark-400 gap-3">
            <ImageOff className="w-12 h-12" />
            <span className="text-sm">{plan.nombre}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_PLAN_BADGE[plan.tipo_plan] || 'bg-dark-100 text-dark-600'}`}>
                  {TIPO_PLAN_LABEL[plan.tipo_plan] || plan.tipo_plan}
                </span>
                {promo && (
                  <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-semibold inline-flex items-center gap-1">
                    <BadgePercent className="w-3 h-3" /> Promoción {planPrecios(plan).descuento > 0 ? `-${planPrecios(plan).descuento}%` : 'activa'}
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                {plan.nombre}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-dark-600">
                {(plan.destino_lugar || plan.destino) && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary-600" /> {plan.destino_lugar || plan.destino}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary-600" /> {formatDuracion(plan.duracion_dias, plan.duracion_noches)}</span>
              </div>
            </div>

            {plan.descripcion && (
              <div className="bg-white rounded-2xl border border-dark-100 p-6">
                <h2 className="font-semibold text-dark-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Descripción</h2>
                <p className="text-dark-600 leading-relaxed whitespace-pre-line">{plan.descripcion}</p>
              </div>
            )}

            {Array.isArray(plan.incluye) && plan.incluye.length > 0 && (
              <div className="bg-white rounded-2xl border border-dark-100 p-6">
                <h2 className="font-semibold text-dark-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>¿Qué incluye?</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plan.incluye.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-dark-700">
                      <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(plan.itinerario) && plan.itinerario.length > 0 && (
              <div className="bg-white rounded-2xl border border-dark-100 p-6">
                <h2 className="font-semibold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>Itinerario</h2>
                <div className="space-y-4">
                  {plan.itinerario.map((d) => {
                    const actividades = diaActividades(d)
                    if (actividades.length === 0) return null
                    return (
                      <div key={d.dia}>
                        <h3 className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
                          <CalendarDays className="w-4 h-4" /> Día {d.dia}
                        </h3>
                        <ol className="relative border-l border-dark-200 ml-2 space-y-3">
                          {actividades.map((a, i) => (
                            <li key={i} className="ml-5 relative">
                              <span className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-primary-500" />
                              <div className="flex items-start gap-2">
                                {a.hora && <span className="text-xs font-medium text-dark-500 whitespace-nowrap">{a.hora}</span>}
                                <span className="text-sm text-dark-700">{a.descripcion}</span>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {negocioLink && (
              <div className="bg-white rounded-2xl border border-dark-100 p-6">
                <h2 className="font-semibold text-dark-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>Organizado por</h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-dark-100">
                    {plan.negocio_portada ? (
                      <img src={plan.negocio_portada} alt={plan.negocio_nombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dark-300">
                        <Users className="w-7 h-7" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link to={negocioLink} className="text-lg font-semibold text-dark-900 hover:text-primary-700 transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
                      {plan.negocio_nombre}
                    </Link>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-dark-500">
                      {waNumber && <span className="inline-flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-primary-600" /> WhatsApp: {waNumber}</span>}
                      {plan.negocio_email && <span className="inline-flex items-center gap-1.5"><Mail className="w-4 h-4" /> {plan.negocio_email}</span>}
                    </div>
                    {isAdmin && plan.negocio_estado && (
                      <span className="text-xs text-dark-400 mt-1 block">Estado del negocio: {plan.negocio_estado}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <aside className="lg:w-80 shrink-0">
            <div className="sticky top-24 bg-white rounded-2xl border border-dark-100 p-6 shadow-sm">
              {anterior && (
                <p className="text-sm text-dark-400 line-through">{formatMoney(anterior)}</p>
              )}
              <p className="text-xs uppercase tracking-wide text-dark-400 font-medium">Precio final</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-dark-900">
                  {precioInfo.precioPersona != null ? formatMoney(precioInfo.precioPersona) : (efectivo ? formatMoney(efectivo) : 'Consultar')}
                </span>
                {(precioInfo.totalDesc > 0 || descuento > 0) && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                    -{precioInfo.totalDesc > 0 ? precioInfo.totalDesc : descuento}%
                  </span>
                )}
              </div>
              <p className="text-sm text-dark-500 mt-0.5">{TIPO_PRECIO_LABEL[plan.tipo_precio] || plan.tipo_precio}</p>

              <div className="mt-5">
                <label className="block text-xs text-dark-500 mb-1.5">¿Cuántas personas serán?</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                    className="w-9 h-9 rounded-lg border border-dark-200 text-lg text-dark-600 hover:border-primary-300 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={personas}
                    onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 h-9 text-center rounded-lg border border-dark-200 text-sm text-dark-900"
                  />
                  <button
                    onClick={() => setPersonas((p) => Math.min(200, p + 1))}
                    className="w-9 h-9 rounded-lg border border-dark-200 text-lg text-dark-600 hover:border-primary-300 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-primary-50 border border-primary-100 p-4">
                {precioInfo.loading ? (
                  <div className="flex items-center gap-2 text-sm text-dark-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Calculando...
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-dark-500">{personas} {personas === 1 ? 'persona' : 'personas'}</span>
                      {precioInfo.tipoDescuento === 'promocion' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                          Promoción aplicada
                        </span>
                      )}
                      {precioInfo.tipoDescuento === 'rango' && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                          Descuento por grupo
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-dark-500">Subtotal original</span>
                      <span className="text-dark-900 font-medium">
                        {precioInfo.subtotalOriginal != null ? formatMoney(precioInfo.subtotalOriginal) : formatMoney((precioInfo.original ?? efectivo) * personas)}
                      </span>
                    </div>
                    {precioInfo.totalDesc > 0 && (
                      <div className="flex items-center justify-between text-sm text-red-600 font-medium mt-1">
                        <span>Descuento {precioInfo.totalDesc}%</span>
                        <span>−{formatMoney(precioInfo.descuentoMonto)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-primary-100 text-base font-bold text-dark-900">
                      <span>TOTAL ({personas} {personas === 1 ? 'persona' : 'personas'})</span>
                      <span>{precioInfo.total != null ? formatMoney(precioInfo.total) : formatMoney((precioInfo.original ?? efectivo) * personas)}</span>
                    </div>
                    {precioInfo.tipoDescuento === 'ninguno' && precioInfo.totalDesc === 0 && (
                      <p className="text-xs text-dark-400 mt-2">Sin descuento aplicable a este grupo.</p>
                    )}
                    {precioInfo.ahorro > 0 && (
                      <p className="text-xs text-emerald-700 mt-2 font-medium">
                        Estás ahorrando {formatMoney(precioInfo.ahorro)} sobre el precio original.
                      </p>
                    )}
                    {(plan.capacidad_referencial != null && personas > plan.capacidad_referencial) && (
                      <p className="text-xs text-amber-700 mt-2">
                        Supera la capacidad referencial del paquete ({plan.capacidad_referencial} personas). Coordina directamente con el negocio.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4">
                {sugLoading ? (
                  <p className="text-xs text-dark-500 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluando transporte...</p>
                ) : salidaElegida && sugTransporte ? (
                  <div className="rounded-lg bg-ocean-50 border border-ocean-100 p-3 text-xs text-dark-700 space-y-1">
                    <p className="font-semibold text-ocean-800 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Transporte para la salida</p>
                    {sugTransporte.vehiculo ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{sugTransporte.vehiculo.tipo || 'Vehículo'}</span>
                          <span className="font-medium">{sugTransporte.vehiculo.nombre} · {sugTransporte.vehiculo.placa || 's/p'} · {sugTransporte.vehiculo.capacidad} pax</span>
                        </div>
                        {salidaElegida.lugar_encuentro && (
                          <div className="flex items-center justify-between">
                            <span>Lugar de encuentro</span>
                            <span className="font-medium">{salidaElegida.lugar_encuentro}</span>
                          </div>
                        )}
                        {sugTransporte.conductor ? (
                          <div className="flex items-center justify-between">
                            <span>Conductor</span>
                            <span className="font-medium">{sugTransporte.conductor.nombre}{sugTransporte.conductor.telefono ? ` · ${sugTransporte.conductor.telefono}` : ''}</span>
                          </div>
                        ) : (
                          <p className="text-amber-700 font-medium">{sugTransporte.mensaje || 'Sin conductor disponible.'}</p>
                        )}
                        <p className="text-dark-500">Recomendado para {sugTransporte.personas || 0} inscrito(s).</p>
                      </>
                    ) : (
                      <p className="text-amber-700 font-medium">{sugTransporte.mensaje || 'No hay vehículo disponible con la capacidad necesaria.'}</p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 border-t border-dark-100 pt-4">
                <h3 className="text-sm font-semibold text-dark-800 flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-primary-600" /> Inscripción grupal
                </h3>
                {salidasLoading ? (
                  <p className="text-sm text-dark-400 mt-2 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando fechas...</p>
                ) : salidas.length === 0 ? (
                  <p className="text-xs text-dark-400 mt-2">El negocio aún no programa salidas grupales. Puedes consultar por WhatsApp.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {salidas.map((s) => {
                      const agotada = Number(s.cupo_disponible) <= 0
                      const cerradaFecha = salidaCerrada(s)
                      const bloqueada = agotada || cerradaFecha
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            bloqueada
                              ? 'border-dark-100 bg-dark-50 opacity-70'
                              : salidaSel === String(s.id)
                                ? 'border-primary-400 bg-primary-50'
                                : 'border-dark-200 hover:border-primary-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="salida"
                            value={s.id}
                            checked={salidaSel === String(s.id)}
                            disabled={bloqueada}
                            onChange={() => setSalidaSel(String(s.id))}
                            className="accent-primary-600"
                          />
                          <CalendarDays className="w-4 h-4 text-dark-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-dark-800 block">
                              {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                              {s.hora ? ` · ${s.hora}` : ''}
                            </span>
                            <span className="text-xs text-dark-500 block">
                              {s.cupo_maximo} cupos · {s.cupo_ocupado} {Number(s.cupo_ocupado) === 1 ? 'inscrito' : 'inscritos'} · <strong>{s.cupo_disponible} disponibles</strong>
                            </span>
                            {s.lugar_encuentro && (
                              <span className="text-xs text-dark-500 block"><MapPin className="w-3 h-3 inline text-primary-600" /> {s.lugar_encuentro}</span>
                            )}
                            {s.fecha_limite && !bloqueada && (
                              <span className="text-xs text-amber-600 block">
                                Cierre: {new Date(s.fecha_limite + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                                {s.hora_limite ? ` — ${s.hora_limite}` : ''}
                              </span>
                            )}
                            {(agotada || cerradaFecha) && (
                              <span className={`text-xs font-semibold ${cerradaFecha ? 'text-dark-400' : 'text-red-600'}`}>
                                {cerradaFecha ? 'Inscripciones cerradas' : 'Cupos agotados'}
                              </span>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}

                {inscrito ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> ¡Inscripción registrada!
                    </div>
                    <p className="text-xs mt-1">
                      {inscrito.personas || personas} persona(s) apartada(s) en la salida seleccionada. Este es tu comprobante:
                    </p>
                    <button
                      onClick={() => window.print()}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Imprimir comprobante
                    </button>
                  </div>
                ) : !confirmando ? (
                  salidas.length > 0 && !salidaBloqueada && (
                    <div className="mt-3 space-y-2">
                      {!user && (
                        <p className="text-xs text-dark-500 bg-dark-50 border border-dark-100 rounded-lg p-2">
                          Necesitas una cuenta para inscribirte. <Link to="/login" className="text-primary-700 font-medium underline">Inicia sesión</Link> o <Link to="/registro" className="text-primary-700 font-medium underline">regístrate</Link>.
                        </p>
                      )}
                      <button
                        onClick={() => (user ? setConfirmando(true) : navigate('/login'))}
                        disabled={!user}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Ticket className="w-4 h-4" />
                        Inscribirme
                      </button>
                    </div>
                  )
                ) : (
                  <form onSubmit={inscribirse} className="mt-3 space-y-2">
                    <p className="text-xs text-dark-500">
                      Registrándote como <strong>{user?.nombre || user?.email}</strong>. Esta inscripción es solo logística (cupo); el pago se coordina por WhatsApp.
                    </p>
                    <div className="rounded-lg bg-dark-50 border border-dark-100 p-3 text-sm">
                      <div className="flex items-center justify-between text-dark-600">
                        <span>Subtotal original</span>
                        <span>{precioInfo.subtotalOriginal != null ? formatMoney(precioInfo.subtotalOriginal) : formatMoney((precioInfo.original ?? efectivo) * personas)}</span>
                      </div>
                      {precioInfo.totalDesc > 0 && (
                        <div className="flex items-center justify-between text-red-600 font-medium mt-1">
                          <span>Descuento {precioInfo.totalDesc}%</span>
                          <span>−{formatMoney(precioInfo.descuentoMonto)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-bold text-dark-900 mt-1 pt-1 border-t border-dark-100">
                        <span>TOTAL ({personas} {personas === 1 ? 'persona' : 'personas'})</span>
                        <span>{precioInfo.total != null ? formatMoney(precioInfo.total) : formatMoney((precioInfo.original ?? efectivo) * personas)}</span>
                      </div>
                      {precioInfo.tipoDescuento === 'promocion' && (
                        <p className="text-xs text-red-600 mt-1">Incluye promoción activa del negocio.</p>
                      )}
                      {precioInfo.tipoDescuento === 'rango' && (
                        <p className="text-xs text-indigo-600 mt-1">Incluye descuento grupal por rango de personas.</p>
                      )}
                    </div>
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      rows={2}
                      placeholder="Mensaje o requerimientos del grupo (opcional)"
                      className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmando(false)}
                        className="px-4 py-2.5 rounded-xl border border-dark-200 text-sm font-medium text-dark-600 hover:bg-dark-50 transition-colors cursor-pointer"
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={inscLoading}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {inscLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                        Confirmar inscripción ({personas})
                      </button>
                    </div>
                  </form>
                )}
                {salidaBloqueada && salidas.length > 0 && !inscrito && (
                  <p className="text-xs text-dark-500 bg-dark-50 border border-dark-100 rounded-lg p-2 mt-3">
                    {salidaAgotada ? 'Cupos agotados para la salida seleccionada.' : 'La selección de inscripción está cerrada para esta salida.'}
                  </p>
                )}
              </div>

              <p className="text-xs text-dark-400 mt-4 leading-relaxed">
                El precio es informativo. Para reservar, cotizar o coordinar el transporte, contacta directamente al negocio por WhatsApp.
              </p>

              <div className="mt-4 space-y-2">
                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contactar por WhatsApp
                  </a>
                ) : (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    Este negocio todavía no registró un número de contacto.
                  </div>
                )}
                {telHref && (
                  <a href={telHref} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dark-200 text-sm font-medium text-dark-700 hover:border-primary-300 transition-colors">
                    <Phone className="w-4 h-4" /> Llamar
                  </a>
                )}
                {plan.negocio_email && (
                  <a href={`mailto:${plan.negocio_email}`} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dark-200 text-sm font-medium text-dark-700 hover:border-primary-300 transition-colors">
                    <Mail className="w-4 h-4" /> Escribir email
                  </a>
                )}
              </div>

              {plan.negocio_website && (
                <a href={plan.negocio_website} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:underline">
                  <Globe className="w-4 h-4" /> Sitio web del negocio
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  )
}