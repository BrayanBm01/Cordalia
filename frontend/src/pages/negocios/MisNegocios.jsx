import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Store, Pencil, Trash2, Eye, ImageOff, MapPin } from 'lucide-react'
import { businessesAPI } from '../../services/api'
import { ESTADO_LABEL, ESTADO_BADGE } from './businessUtils'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import ConfirmModal from '../../components/ConfirmModal'
import { toast } from 'sonner'

export default function MisNegocios() {
  const navigate = useNavigate()
  const [negocios, setNegocios] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)

  async function fetchNegocios() {
    try {
      const res = await businessesAPI.list()
      setNegocios(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      toast.error(err.message || 'Error al cargar tus negocios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNegocios()
  }, [])

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await businessesAPI.remove(deleteTarget.id)
      toast.success(res.message || 'Negocio eliminado')
      setDeleteTarget(null)
      await fetchNegocios()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el negocio')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-dark-50"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
              Mis negocios
            </h1>
            <p className="text-dark-500 mt-1">Administra tus negocios y espera la aprobación del equipo.</p>
          </div>
          <button
            onClick={() => navigate('/mis-negocios/nuevo')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Crear negocio
          </button>
        </div>

        {negocios.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dark-100">
            <EmptyState
              icon={Store}
              title="Aún no tienes negocios"
              description="Crea tu primer negocio para aparecer en Cordalia. Un administrador lo revisará."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {negocios.map((n) => (
              <div
                key={n.id}
                className="bg-white rounded-2xl border border-dark-100 overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="aspect-[16/9] bg-dark-100 relative">
                  {n.portada_url ? (
                    <img src={n.portada_url} alt={n.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-300">
                      <ImageOff className="w-9 h-9" />
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_BADGE[n.estado] || 'bg-dark-100 text-dark-600'}`}
                  >
                    {ESTADO_LABEL[n.estado] || n.estado}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
                    {n.nombre}
                  </h3>
                  {n.categoria && <p className="text-sm text-primary-600 mt-0.5">{n.categoria}</p>}
                  {n.destino && (
                    <Link to={`/lugares/${n.destination_id}`} className="text-sm text-dark-500 hover:text-primary-700 mt-0.5 inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <MapPin className="w-3.5 h-3.5" />{n.destino}
                    </Link>
                  )}
                  {n.direccion && (
                    <p className="flex items-center gap-1.5 text-sm text-dark-500 mt-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{n.direccion}</span>
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-dark-100 flex items-center gap-2">
                    <Link
                      to={`/mis-negocios/${n.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Gestionar
                    </Link>
                    <button
                      onClick={() => navigate(`/mis-negocios/${n.id}/editar`)}
                      className="p-2 rounded-lg text-dark-500 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(n)}
                      className="p-2 rounded-lg text-dark-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar negocio"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Se borrarán también sus imágenes, servicios, horarios y redes.`}
        confirmText="Eliminar"
      />
    </motion.div>
  )
}