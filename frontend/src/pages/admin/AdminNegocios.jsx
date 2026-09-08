import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Store, CheckCircle2, XCircle, Eye, RefreshCw, MapPin } from 'lucide-react'
import { businessesAPI, lugaresAPI } from '../../services/api'
import { ESTADO_LABEL, ESTADO_BADGE } from '../negocios/businessUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import SearchInput from '../../components/SearchInput'
import { toast } from 'sonner'

const ACCIONES = [
  { estado: 'approved', label: 'Aprobar', icon: CheckCircle2, clase: 'text-emerald-600 hover:bg-emerald-50' },
  { estado: 'pending', label: 'Pendiente', icon: RefreshCw, clase: 'text-amber-600 hover:bg-amber-50' },
  { estado: 'rejected', label: 'Rechazar', icon: XCircle, clase: 'text-red-600 hover:bg-red-50' },
]

export default function AdminNegocios() {
  const [negocios, setNegocios] = useState([])
  const [lugares, setLugares] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function fetchNegocios() {
    try {
      const res = await businessesAPI.list()
      setNegocios(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      toast.error(err.message || 'Error al cargar negocios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegocios()
    lugaresAPI.getAll().then((r) => setLugares(Array.isArray(r.data) ? r.data : [])).catch(() => {})
  }, [])

  async function changeEstado(negocio, estado) {
    try {
      await businessesAPI.setEstado(negocio.id, estado)
      toast.success(`${negocio.nombre} → ${ESTADO_LABEL[estado]}`)
      await fetchNegocios()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado')
    }
  }

  async function changeDestino(negocio, destinationId) {
    try {
      const res = await businessesAPI.destinos.set(negocio.id, destinationId === '' ? null : Number(destinationId))
      toast.success(res.message || 'Destino actualizado')
      await fetchNegocios()
    } catch (err) {
      toast.error(err.message || 'No se pudo asociar el destino')
    }
  }

  if (loading) return <LoadingSpinner />

  const term = search.trim().toLowerCase()
  const filtrados = term
    ? negocios.filter((n) =>
        [n.nombre, n.categoria, n.owner_nombre, n.destino].some((v) =>
          String(v || '').toLowerCase().includes(term)
        )
      )
    : negocios

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Negocios</h1>
        <p className="text-dark-500 mt-1">Aproba, rechaza o gestiona los negocios de la plataforma.</p>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por negocio, categoría, dueño o destino..."
        className="w-full sm:max-w-sm"
      />

      {negocios.length === 0 ? (
        <div className="bg-white rounded-xl border border-dark-200">
          <EmptyState
            icon={Store}
            title="No hay negocios"
            description="Los negocios creados por los usuarios aparecerán aquí para su aprobación."
          />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-dark-200">
          <EmptyState
            icon={Store}
            title="Sin resultados"
            description={`No se encontraron negocios con "${search}".`}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-5 py-3 font-medium text-dark-500">ID</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Negocio</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Categoría</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Dueño</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Destino</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Estado</th>
                    <th className="text-right px-5 py-3 font-medium text-dark-500">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100">
                  {filtrados.map((n) => (
                  <tr key={n.id} className="hover:bg-dark-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-dark-500 font-mono text-xs">{n.id}</td>
                    <td className="px-5 py-3.5">
                      <Link to={`/negocios/${n.id}`} className="font-medium text-dark-800 hover:text-primary-700 transition-colors">
                        {n.nombre}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-dark-600">{n.categoria || '—'}</td>
                    <td className="px-5 py-3.5 text-dark-600">{n.owner_nombre || `#${n.owner_id}`}</td>
                    <td className="px-5 py-3.5">
                      {n.destination_id ? (
                        <Link to={`/lugares/${n.destination_id}`} className="inline-flex items-center gap-1.5 text-primary-700 hover:underline text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          {n.destino}
                        </Link>
                      ) : (
                        <span className="text-xs text-dark-400 italic">Sin destino</span>
                      )}
                      <select
                        aria-label={`Asociar destino a ${n.nombre}`}
                        value={n.destination_id ? String(n.destination_id) : ''}
                        onChange={(e) => changeDestino(n, e.target.value)}
                        className="mt-1.5 block w-full max-w-[170px] px-2 py-1 rounded-lg border border-dark-200 text-xs bg-white text-dark-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                      >
                        <option value="">Sin destino</option>
                        {lugares.map((l) => (
                          <option key={l.id} value={l.id}>{l.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[n.estado] || 'bg-dark-100 text-dark-600'}`}>
                        {ESTADO_LABEL[n.estado] || n.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {ACCIONES.map((accion) => (
                          <button
                            key={accion.estado}
                            onClick={() => changeEstado(n, accion.estado)}
                            disabled={n.estado === accion.estado}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 cursor-pointer ${accion.clase}`}
                            title={accion.label}
                          >
                            <accion.icon className="w-3.5 h-3.5" />
                            {accion.label}
                          </button>
                        ))}
                        <Link
                          to={`/negocios/${n.id}`}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}