import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, Star, EyeOff, Eye, Trash2 } from 'lucide-react'
import { reviewsAPI } from '../../services/api'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import SearchInput from '../../components/SearchInput'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ESTADO_LABEL = {
  active: 'Visible',
  hidden: 'Oculta',
  deleted: 'Eliminada',
}

const ESTADO_BADGE = {
  active: 'bg-emerald-100 text-emerald-700',
  hidden: 'bg-amber-100 text-amber-700',
  deleted: 'bg-red-100 text-red-700',
}

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'active', label: 'Visibles' },
  { id: 'hidden', label: 'Ocultas' },
  { id: 'deleted', label: 'Eliminadas' },
]

function Stars({ value }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? 'text-amber-400 fill-current' : 'text-dark-200'}`} />
      ))}
    </span>
  )
}

export default function AdminResenas() {
  const [resenas, setResenas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(null)

  async function fetchResenas() {
    try {
      const res = await reviewsAPI.all()
      setResenas(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      toast.error(err.message || 'Error al cargar las reseñas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResenas()
  }, [])

  async function moderar(rev, estado) {
    setBusy(rev.id)
    try {
      const res = await reviewsAPI.moderar(rev.id, estado)
      toast.success(res.message || 'Reseña actualizada')
      await fetchResenas()
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar la reseña')
    } finally {
      setBusy(null)
    }
  }

  async function eliminar(rev) {
    setBusy(rev.id)
    try {
      const res = await reviewsAPI.remove(rev.id)
      toast.success(res.message || 'Reseña eliminada')
      await fetchResenas()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la reseña')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <LoadingSpinner />

  const porEstado = filtro === 'todas' ? resenas : resenas.filter((r) => r.estado === filtro)
  const term = search.trim().toLowerCase()
  const filtradas = term
    ? porEstado.filter((r) =>
        [r.autor_nombre, r.negocio_nombre, r.comment, r.estado].some((v) =>
          String(v || '').toLowerCase().includes(term)
        )
      )
    : porEstado

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Reseñas</h1>
        <p className="text-dark-500 mt-1">Modera las reseñas de los negocios de la plataforma.</p>
      </div>

      <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-dark-100 p-1 w-fit">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              filtro === f.id ? 'bg-primary-600 text-white' : 'text-dark-600 hover:bg-dark-100'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.id === 'todas' ? resenas.length : resenas.filter((r) => r.estado === f.id).length}
            </span>
          </button>
        ))}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por autor, negocio, comentario o estado..."
        className="w-full sm:max-w-sm"
      />

      {filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dark-200">
          <EmptyState
            icon={MessageSquare}
            title={search ? 'Sin resultados' : 'Sin reseñas'}
            description={
              search
                ? `No se encontraron reseñas con "${search}".`
                : filtro === 'todas'
                  ? 'Aún no hay reseñas en la plataforma.'
                  : 'No hay reseñas en este estado.'
            }
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Autor</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Negocio</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Puntuación</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Comentario</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Estado</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Fecha</th>
                    <th className="text-right px-5 py-3 font-medium text-dark-500">Acciones</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-dark-100">
                {filtradas.map((r) => (
                  <tr key={r.id} className="hover:bg-dark-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-dark-800 font-medium">{r.autor_nombre}</td>
                    <td className="px-5 py-3.5">
                      <Link
                        to={`/negocios/${r.business_id}`}
                        className="text-primary-700 hover:underline"
                      >
                        {r.negocio_nombre}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Stars value={r.rating} />
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-dark-600 max-w-xs truncate">{r.comment || '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[r.estado] || 'bg-dark-100 text-dark-600'}`}>
                        {ESTADO_LABEL[r.estado] || r.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-dark-500 whitespace-nowrap">
                      {format(new Date(r.created_at), 'dd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {r.estado !== 'active' && (
                          <button
                            onClick={() => moderar(r, 'active')}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Mostrar"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Mostrar
                          </button>
                        )}
                        {r.estado === 'active' && (
                          <button
                            onClick={() => moderar(r, 'hidden')}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40 cursor-pointer"
                            title="Ocultar"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            Ocultar
                          </button>
                        )}
                        <button
                          onClick={() => eliminar(r)}
                          disabled={busy === r.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                          title="Eliminar definitivamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
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