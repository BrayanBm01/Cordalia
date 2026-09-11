import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, CheckCircle2, Clock, MapPin, AlertTriangle, Plus, Eye, ImageOff, Ticket, CalendarDays, Users, Truck, Wallet } from 'lucide-react'
import { businessesAPI, businessPlanesAPI, businessFlotaAPI } from '../../services/api'
import { ESTADO_LABEL, ESTADO_BADGE, formatMoney } from './businessUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import PieChartCard from '../../components/PieChartCard'
import { toast } from 'sonner'

const estadoStats = [
  { estado: 'approved', label: 'Publicados', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { estado: 'pending', label: 'Pendientes', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  { estado: 'rejected', label: 'Rechazados', className: 'bg-red-50 text-red-700 border-red-100' },
  { estado: 'inactive', label: 'Inactivos', className: 'bg-dark-100 text-dark-600 border-dark-200' },
  { estado: 'suspended', label: 'Suspendidos', className: 'bg-orange-50 text-orange-700 border-orange-100' },
  { estado: 'draft', label: 'Borradores', className: 'bg-dark-50 text-dark-500 border-dark-200' },
]

export default function ResumenNegocios() {
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [actividad, setActividad] = useState({ loading: false })
  const [stats, setStats] = useState({ planes: 0, salidas: 0, ocupados: 0, capacidad: 0, vehiculos: 0 })
  const [proximas, setProximas] = useState([])

  useEffect(() => {
    let active = true
    businessesAPI
      .list()
      .then((res) => {
        if (active) setNegocios(Array.isArray(res.data) ? res.data : [])
      })
      .catch((err) => {
        if (active) toast.error(err.message || 'Error al cargar el resumen')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (negocios.length === 0) return
    let active = true
    setActividad({ loading: true })
    const hoy = new Date().toISOString().slice(0, 10)

    async function loadActividad() {
      let planes = 0, salidas = 0, ocupados = 0, capacidad = 0, vehiculos = 0
      const prox = []
      for (const n of negocios) {
        const [pRes, vRes] = await Promise.all([
          businessPlanesAPI.list(n.id).catch(() => null),
          businessFlotaAPI.vehiculos.list(n.id).catch(() => null),
        ])
        const planList = Array.isArray(pRes?.data) ? pRes.data : []
        planes += planList.length
        vehiculos += Array.isArray(vRes?.data) ? vRes.data.length : 0
        for (const p of planList) {
          const sRes = await businessPlanesAPI.salidas.list(n.id, p.id).catch(() => null)
          const sList = Array.isArray(sRes?.data) ? sRes.data : []
          salidas += sList.length
          for (const s of sList) {
            capacidad += Number(s.cupo_maximo) || 0
            ocupados += Number(s.cupo_ocupado) || 0
            if ((s.fecha || '') >= hoy) {
              let resumen = null
              let transporte = null
              try {
                const rr = await businessPlanesAPI.salidas.inscripciones.resumen(n.id, p.id, s.id)
                resumen = rr?.data
              } catch { /* resumen indisponible */ }
              try {
                const tr = await businessPlanesAPI.salidas.transporte.sugerir(n.id, p.id, s.id)
                transporte = tr?.data && typeof tr.data === 'object' ? tr.data : null
              } catch { /* transporte indisponible */ }
              prox.push({ ...s, negocio: n.nombre, plan: p.nombre, planId: p.id, businessId: n.id, resumen, transporte })
            }
          }
        }
      }
      prox.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      if (active) {
        setStats({ planes, salidas, ocupados, capacidad, vehiculos })
        setProximas(prox.slice(0, 6))
        setActividad({ loading: false })
      }
    }
    loadActividad()
    return () => { active = false }
  }, [negocios])

  if (loading) return <LoadingSpinner />

  const total = negocios.length
  const activos = negocios.filter((n) => n.estado === 'approved').length
  const pendientes = negocios.filter((n) => n.estado === 'pending').length
  const sinDestino = negocios.filter((n) => !n.destination_id).length
  const inactivos = negocios.filter((n) => ['inactive', 'suspended', 'rejected'].includes(n.estado)).length

  const cards = [
    { icon: Store, label: 'Total de negocios', value: total, color: 'bg-primary-50 text-primary-600' },
    { icon: CheckCircle2, label: 'Activos', value: activos, color: 'bg-emerald-50 text-emerald-600' },
    { icon: Clock, label: 'Pendientes', value: pendientes, color: 'bg-amber-50 text-amber-600' },
    { icon: AlertTriangle, label: 'Inactivos', value: inactivos, color: 'bg-orange-50 text-orange-600' },
    { icon: MapPin, label: 'Sin destino', value: sinDestino, color: 'bg-dark-100 text-dark-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-dark-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
              Resumen
            </h1>
            <p className="text-dark-500 mt-1">Estado general de tus negocios en Explora Turismo.</p>
          </div>
          <Link
            to="/mis-negocios/nuevo"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Crear negocio
          </Link>
        </div>

        {total === 0 ? (
          <div className="bg-white rounded-2xl border border-dark-100">
            <EmptyState
              icon={Store}
              title="Aún no tienes negocios"
              description="Crea tu primer negocio para aparecer en Explora Turismo. Un administrador lo revisará."
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {cards.map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-dark-100 p-5 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                    {c.value}
                  </p>
                  <p className="text-sm text-dark-500">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-dark-100 p-6 shadow-sm">
              <h2 className="font-semibold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Actividad como vendedor
              </h2>
              {actividad.loading ? (
                <LoadingSpinner />
              ) : stats.salidas === 0 && stats.planes === 0 ? (
                <p className="text-sm text-dark-400">
                  Aún no hay actividad. Crea planes y prográmalos con salidas grupales para ver tus indicadores aquí.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { icon: Ticket, label: 'Planes publicados', value: stats.planes, color: 'bg-primary-50 text-primary-600' },
                      { icon: CalendarDays, label: 'Salidas programadas', value: stats.salidas, color: 'bg-ocean-50 text-ocean-600' },
                      { icon: Users, label: 'Personas inscritas', value: stats.ocupados, color: 'bg-emerald-50 text-emerald-600' },
                      { icon: Truck, label: 'Vehículos en flota', value: stats.vehiculos, color: 'bg-amber-50 text-amber-600' },
                    ].map((c) => (
                      <div key={c.label} className="rounded-xl border border-dark-100 p-4">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.color}`}>
                          <c.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>{c.value}</p>
                        <p className="text-xs text-dark-500">{c.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-dark-800 mb-3 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-primary-600" /> Próximas salidas
                      </h3>
                      {proximas.length === 0 ? (
                        <p className="text-sm text-dark-400">Sin salidas próximas programadas.</p>
                      ) : (
                        <ul className="space-y-2">
                          {proximas.map((s) => {
                            const llena = s.cupo_disponible <= 0
                            const transporte = s.transporte
                            return (
                              <li key={`${s.businessId}-${s.planId}-${s.id}`} className="rounded-lg border border-dark-100 px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <CalendarDays className="w-4 h-4 text-dark-400 shrink-0" />
                                  <span className="font-medium text-dark-800 truncate">
                                    {new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    {s.hora ? ` · ${s.hora}` : ''}
                                    <span className="text-dark-400 font-normal"> — {s.plan}</span>
                                  </span>
                                </div>
                                <span className="text-xs text-dark-500 block mt-0.5">{s.negocio}</span>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-dark-500">
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="w-3 h-3 text-primary-600" /> {s.cupo_ocupado} / {s.cupo_maximo} personas
                                  </span>
                                  {s.resumen?.valor_total != null && Number(s.resumen.valor_total) > 0 && (
                                    <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                      <Wallet className="w-3 h-3" /> {formatMoney(s.resumen.valor_total)} en inscripciones
                                    </span>
                                  )}
                                  {transporte?.vehiculo && (
                                    <span className="inline-flex items-center gap-1">
                                      <Truck className="w-3 h-3 text-ocean-600" />
                                      Transporte: <span className="capitalize font-medium">{transporte.vehiculo.tipo || 'Vehículo'}</span>
                                      {transporte.conductor ? ` · Conductor: ${transporte.conductor.nombre}` : ''}
                                    </span>
                                  )}
                                </div>
                                <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${llena ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {llena ? 'Llena' : `${s.cupo_disponible} libres`}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-dark-800 mb-3 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary-600" /> Ocupación de cupos
                      </h3>
                      {stats.capacidad === 0 ? (
                        <p className="text-sm text-dark-400">Sin salidas con cupos registrados.</p>
                      ) : (
                        <PieChartCard
                          height={210}
                          data={[
                            { name: 'Cupos ocupados', cantidad: stats.ocupados },
                            { name: 'Cupos libres', cantidad: Math.max(0, stats.capacidad - stats.ocupados) },
                          ]}
                          palette={['#10b981', '#e2e8f0']}
                        />
                      )}
                      <p className="text-xs text-dark-400 mt-2">
                        Personas con cupo reservado: {stats.ocupados}. Coordina el pago por WhatsApp; la inscripción es solo logística.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-dark-100 p-6 shadow-sm">
              <h2 className="font-semibold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                Estado de cada negocio
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                {estadoStats.map((s) => {
                  const count = negocios.filter((n) => n.estado === s.estado).length
                  if (count === 0) return null
                  return (
                    <div key={s.estado} className={`rounded-xl border px-3 py-2.5 text-center ${s.className}`}>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs font-medium">{s.label}</p>
                    </div>
                  )
                })}
              </div>

              <ul className="space-y-3">
                {negocios.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-dark-100">
                    <div className="w-12 h-10 rounded-lg bg-dark-100 overflow-hidden flex-shrink-0">
                      {n.portada_url ? (
                        <img src={n.portada_url} alt={n.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-dark-300">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-dark-900 truncate">{n.nombre}</p>
                      <p className="text-xs text-dark-500 truncate">
                        {n.categoria || 'Sin categoría'}
                        {n.destino ? ` · ${n.destino}` : ' · Sin destino'}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[n.estado] || 'bg-dark-100 text-dark-600'}`}>
                      {ESTADO_LABEL[n.estado] || n.estado}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/mis-negocios/${n.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                      >
                        Gestionar
                      </Link>
                      <Link
                        to={`/negocios/${n.id}`}
                        className="p-1.5 rounded-lg text-dark-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Ver público"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}