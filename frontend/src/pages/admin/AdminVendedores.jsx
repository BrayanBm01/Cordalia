import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Store, Hourglass, Crown, AlertTriangle, ShieldAlert, CheckCircle2,
  RefreshCw, Loader2, Users,
} from 'lucide-react'
import { adminVendedoresAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import SearchInput from '../../components/SearchInput'
import { toast } from 'sonner'

const ESTADO_INFO = {
  TRIALING: { label: 'Prueba gratuita', badge: 'bg-emerald-100 text-emerald-700', icon: Hourglass },
  ACTIVE: { label: 'Plan activo', badge: 'bg-moss-100 text-moss-800', icon: Crown },
  EXPIRED: { label: 'Prueba vencida', badge: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  SUSPENDED: { label: 'Suspendido', badge: 'bg-red-100 text-red-700', icon: ShieldAlert },
}

function fecha(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdminVendedores() {
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [procesando, setProcesando] = useState(null)

  async function cargar() {
    try {
      const res = await adminVendedoresAPI.listar()
      setVendedores(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      toast.error(err.message || 'Error al cargar los vendedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function setEstado(vendedor, suspendido) {
    const motivo = suspendido
      ? window.prompt('Motivo de la suspensión (opcional):') ?? ''
      : undefined
    if (suspendido && motivo === null) return
    setProcesando(vendedor.id)
    try {
      const res = await adminVendedoresAPI.setEstado(vendedor.id, suspendido, motivo)
      toast.success(res.message || 'Estado actualizado')
      await cargar()
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el estado')
    } finally {
      setProcesando(null)
    }
  }

  const filtrados = vendedores.filter((v) =>
    [v.nombre, v.email].some((x) => String(x || '').toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
            <Users className="w-6 h-6 text-primary-600" /> Vendedores
          </h1>
          <p className="text-sm text-dark-500 mt-1">
            Estado comercial de cada vendedor: prueba gratuita, plan contratado y vigencia.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-dark-200 text-sm font-semibold text-dark-600 hover:bg-dark-50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder="Buscar vendedor por nombre o email..." />

      {filtrados.length === 0 ? (
        <EmptyState title="Sin vendedores" description="No hay vendedores que coincidan con la búsqueda." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((v) => {
            const info = ESTADO_INFO[v.estado_resuelto] || {
              label: 'Sin política', badge: 'bg-dark-100 text-dark-600', icon: Store,
            }
            const Icono = info.icon
            const suspendido = v.estado_resuelto === 'SUSPENDED'
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-dark-100 p-5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-dark-900 truncate">{v.nombre}</p>
                    <p className="text-xs text-dark-500 truncate">{v.email}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${info.badge}`}>
                    <Icono className="w-3 h-3" /> {info.label}
                  </span>
                </div>

                <dl className="space-y-1.5 text-xs text-dark-600 border-t border-dark-100 pt-3">
                  <div className="flex justify-between gap-2">
                    <dt className="text-dark-500">Prueba (7 días)</dt>
                    <dd className="font-semibold text-right">
                      {v.trial_inicio ? `${fecha(v.trial_inicio)} → ${fecha(v.trial_fin)}` : 'No aplica'}
                    </dd>
                  </div>
                  {v.estado_resuelto === 'TRIALING' && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-dark-500">Días restantes</dt>
                      <dd className="font-semibold text-emerald-700">{v.dias_restantes}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt className="text-dark-500">Plan contratado</dt>
                    <dd className="font-semibold text-right">{v.plan_nombre || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-dark-500">Vigencia</dt>
                    <dd className="font-semibold text-right">{fecha(v.fin_suscripcion)}</dd>
                  </div>
                </dl>

                {v.suspension_motivo && (
                  <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mt-3">
                    Motivo: {v.suspension_motivo}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setEstado(v, !suspendido)}
                  disabled={procesando === v.id}
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors ${
                    suspendido
                      ? 'bg-moss-900 text-white hover:bg-moss-800'
                      : 'border border-red-200 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {procesando === v.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : suspendido ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Reactivar cuenta</>
                  ) : (
                    <><ShieldAlert className="w-3.5 h-3.5" /> Suspender cuenta</>
                  )}
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
