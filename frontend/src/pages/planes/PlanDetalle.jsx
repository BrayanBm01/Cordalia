import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, Users, CheckCircle2, Phone, Mail, Globe,
  MessageCircle, ImageOff, CalendarDays, BadgePercent,
} from 'lucide-react'
import { planesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatMoney } from '../negocios/businessUtils'
import {
  TIPO_PLAN_LABEL, TIPO_PLAN_BADGE, TIPO_PRECIO_LABEL, formatDuracion,
  planPrecios, buildWhatsAppText, whatsappLink, whatsappNumber, telLink,
} from '../negocios/planUtils'

export default function PlanDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [personas, setPersonas] = useState(2)

  useEffect(() => {
    setLoading(true)
    planesAPI
      .getById(id)
      .then((res) => setPlan(res.data))
      .catch((err) => setError(err.message || 'No se pudo cargar el plan'))
      .finally(() => setLoading(false))
  }, [id])

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
                  {plan.itinerario.map((d) => (
                    <div key={d.dia}>
                      <h3 className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Día {d.dia}
                      </h3>
                      <ol className="relative border-l border-dark-200 ml-2 space-y-3">
                        {d.actividades.map((a, i) => (
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
                  ))}
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
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-dark-900">
                  {efectivo ? formatMoney(efectivo) : 'Consultar'}
                </span>
                {descuento > 0 && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold mb-1">-{descuento}%</span>
                )}
              </div>
              <p className="text-sm text-dark-500 mt-1">{TIPO_PRECIO_LABEL[plan.tipo_precio] || plan.tipo_precio}</p>

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
                    max={50}
                    value={personas}
                    onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 h-9 text-center rounded-lg border border-dark-200 text-sm text-dark-900"
                  />
                  <button
                    onClick={() => setPersonas((p) => Math.min(50, p + 1))}
                    className="w-9 h-9 rounded-lg border border-dark-200 text-lg text-dark-600 hover:border-primary-300 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="text-xs text-dark-400 mt-4 leading-relaxed">
                El precio es informativo. Para reservar o cotizar, contacta directamente al negocio por WhatsApp.
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