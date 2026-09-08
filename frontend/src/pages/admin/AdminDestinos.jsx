import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, X, Search, MapPin } from 'lucide-react'
import { lugaresAPI } from '../../services/api'
import ConfirmModal from '../../components/ConfirmModal'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

const destinoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  ubicacion: z.string().min(2, 'La ubicación es requerida'),
  imagen: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
})

export default function AdminDestinos() {
  const [destinos, setDestinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDestino, setEditingDestino] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(destinoSchema),
  })

  async function fetchDestinos(query) {
    try {
      const res = await lugaresAPI.getAll(query)
      setDestinos(res.data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDestinos()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchDestinos(search)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  function openCreate() {
    setEditingDestino(null)
    reset({ nombre: '', descripcion: '', ubicacion: '', imagen: '' })
    setModalOpen(true)
  }

  function openEdit(destino) {
    setEditingDestino(destino)
    reset({
      nombre: destino.nombre,
      descripcion: destino.descripcion,
      ubicacion: destino.ubicacion,
      imagen: destino.imagen || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingDestino(null)
    reset()
  }

  async function onSubmit(data) {
    setSubmitting(true)
    try {
      const payload = { ...data }
      if (!payload.imagen) delete payload.imagen

      if (editingDestino) {
        const res = await lugaresAPI.update(editingDestino.id, payload)
        toast.success(res.message || 'Destino actualizado')
      } else {
        const res = await lugaresAPI.create(payload)
        toast.success(res.message || 'Destino creado')
      }
      closeModal()
      await fetchDestinos(search)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      const res = await lugaresAPI.delete(deleteTarget.id)
      toast.success(res.message || 'Destino eliminado')
      setDeleteTarget(null)
      await fetchDestinos(search)
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Destinos</h1>
          <p className="text-dark-500 mt-1">Gestión de destinos turísticos</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Crear destino
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar destinos..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
        />
      </div>

      {destinos.length === 0 ? (
        <EmptyState
          title="No hay destinos"
          description={search ? 'No se encontraron destinos con ese término de búsqueda.' : 'Aún no se han registrado destinos turísticos.'}
          icon={MapPin}
        />
      ) : (
        <div className="bg-white rounded-xl border border-dark-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-dark-100 bg-dark-50">
                    <th className="text-left px-5 py-3 font-medium text-dark-500">ID</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Nombre</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Ubicación</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Descripción</th>
                    <th className="text-right px-5 py-3 font-medium text-dark-500">Acciones</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-dark-100">
                {destinos.map((destino) => (
                  <tr key={destino.id} className="hover:bg-dark-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-dark-500 font-mono text-xs">{destino.id}</td>
                    <td className="px-5 py-3.5 font-medium text-dark-800">{destino.nombre}</td>
                    <td className="px-5 py-3.5 text-dark-600">{destino.ubicacion}</td>
                    <td className="px-5 py-3.5 text-dark-600 max-w-xs">
                      <span className="line-clamp-2">{destino.descripcion}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(destino)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-ocean-600 hover:bg-ocean-50 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(destino)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-900/40 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md border border-dark-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-100">
                <h2 className="text-lg font-semibold text-dark-900">
                  {editingDestino ? 'Editar destino' : 'Crear destino'}
                </h2>
                <button onClick={closeModal} className="p-1 rounded-lg text-dark-400 hover:text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Nombre</label>
                  <input
                    {...register('nombre')}
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="Nombre del destino"
                  />
                  {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Descripción</label>
                  <textarea
                    {...register('descripcion')}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors resize-none"
                    placeholder="Describe el destino turístico..."
                  />
                  {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">Ubicación</label>
                  <input
                    {...register('ubicacion')}
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="Ciudad, Región"
                  />
                  {errors.ubicacion && <p className="text-red-500 text-xs mt-1">{errors.ubicacion.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-700 mb-1">URL de imagen</label>
                  <input
                    {...register('imagen')}
                    type="url"
                    className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  {errors.imagen && <p className="text-red-500 text-xs mt-1">{errors.imagen.message}</p>}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Guardando...' : editingDestino ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar destino"
        message={`¿Estás seguro de que deseas eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </motion.div>
  )
}
