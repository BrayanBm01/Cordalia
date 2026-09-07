import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, CheckCircle2, Clock, MapPin, AlertTriangle, Plus, Eye, ImageOff } from 'lucide-react'
import { businessesAPI } from '../../services/api'
import { ESTADO_LABEL, ESTADO_BADGE } from './businessUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
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