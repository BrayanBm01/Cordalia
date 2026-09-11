import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Search, MapPin, Image as ImageIcon, Info } from 'lucide-react'
import { lugaresAPI } from '../../services/api'
import ConfirmModal from '../../components/ConfirmModal'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import Modal from '../../components/Modal'
import ImageUploader from '../../components/ImageUploader'
import { toast } from 'sonner'

const TIPOS_DESTINO = [
  { value: 'ciudad', label: 'Ciudad' },
  { value: 'playa', label: 'Playa' },
  { value: 'cultura', label: 'Cultura' },
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'montaña', label: 'Montaña' },
  { value: 'humedal', label: 'Humedal' },
  { value: 'ecoturismo', label: 'Ecoturismo' },
  { value: 'pueblo_patrimonio', label: 'Pueblo patrimonial' },
  { value: 'parque', label: 'Parque' },
  { value: 'manglar', label: 'Manglar' },
  { value: 'lago', label: 'Lago / ciénaga' },
  { value: 'rio', label: 'Río' },
  { value: 'lugar', label: 'Otro' },
]

const TIPO_LABELS = Object.fromEntries(TIPOS_DESTINO.map((t) => [t.value, t.label]))

function sectionTitle(icon, text) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-dark-400 mb-2 flex items-center gap-1.5">
      {icon} {text}
    </p>
  )
}

const destinoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  ubicacion: z.string().min(2, 'La ubicación es requerida'),
  municipio: z.string().min(2, 'El municipio es requerido'),
  tipo: z.string().min(1, 'Selecciona un tipo de destino'),
  imagen: z.string().optional().or(z.literal('')).refine(
    (v) => v === '' || /^https?:\/\/.+/i.test(v) || /^data:image\//i.test(v),
    'URL inválida (http/https o imagen base64)'
  ),
})

export default function AdminDestinos() {
  const [destinos, setDestinos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDestino, setEditingDestino] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
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
    reset({ nombre: '', descripcion: '', ubicacion: '', municipio: '', tipo: 'ciudad', imagen: '' })
    setModalOpen(true)
  }

  function openEdit(destino) {
    setEditingDestino(destino)
    reset({
      nombre: destino.nombre,
      descripcion: destino.descripcion,
      ubicacion: destino.ubicacion,
      municipio: destino.municipio || '',
      tipo: destino.tipo || 'ciudad',
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
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Tipo</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Municipio</th>
                    <th className="text-left px-5 py-3 font-medium text-dark-500">Descripción</th>
                    <th className="text-right px-5 py-3 font-medium text-dark-500">Acciones</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-dark-100">
                {destinos.map((destino) => (
                  <tr key={destino.id} className="hover:bg-dark-50/40 transition-colors">
                    <td className="px-5 py-3.5 text-dark-500 font-mono text-xs">{destino.id}</td>
                    <td className="px-5 py-3.5 font-medium text-dark-800">{destino.nombre}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs font-medium capitalize">
                        {destino.tipo ? TIPO_LABELS[destino.tipo] || destino.tipo : 'Lugar'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-dark-600">
                      {destino.municipio || '—'}
                      <span className="text-dark-400 text-xs block">{destino.ubicacion}</span>
                    </td>
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingDestino ? 'Editar destino' : 'Crear destino'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            {sectionTitle(<MapPin className="w-3.5 h-3.5" />, 'Información general')}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Nombre *</label>
                <input
                  {...register('nombre')}
                  className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                  placeholder="Nombre del destino"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Tipo de destino *</label>
                <select
                  {...register('tipo')}
                  className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors capitalize"
                >
                  {TIPOS_DESTINO.map((t) => (
                    <option key={t.value} value={t.value} className="capitalize">{t.label}</option>
                  ))}
                </select>
                {errors.tipo && <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Municipio *</label>
                <input
                  {...register('municipio')}
                  className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                  placeholder="ej. Montería"
                />
                {errors.municipio && <p className="text-red-500 text-xs mt-1">{errors.municipio.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1">Ubicación *</label>
                <input
                  {...register('ubicacion')}
                  className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors"
                  placeholder="Ciudad, Región"
                />
                {errors.ubicacion && <p className="text-red-500 text-xs mt-1">{errors.ubicacion.message}</p>}
              </div>
            </div>
          </div>

          <div>
            {sectionTitle(<Info className="w-3.5 h-3.5" />, 'Descripción')}
            <textarea
              {...register('descripcion')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-dark-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors resize-none"
              placeholder="Describe el destino turístico..."
            />
            {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
          </div>

          <div>
            {sectionTitle(<ImageIcon className="w-3.5 h-3.5" />, 'Imagen del destino')}
            <ImageUploader
              value={watch('imagen') || ''}
              onChange={(v) => setValue('imagen', v, { shouldValidate: true })}
              placeholder="URL de la imagen (https://) o selecciona del dispositivo"
            />
            {errors.imagen && <p className="text-red-500 text-xs mt-1">{errors.imagen.message}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-dark-100">
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
      </Modal>

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
