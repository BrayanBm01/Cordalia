import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { businessesAPI, lugaresAPI } from '../../services/api'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

const negocioSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(200, 'Máximo 200 caracteres'),
    category_id: z.string().transform((v) => (v === '' ? '' : Number(v))),
    destination_id: z.string().transform((v) => (v === '' ? '' : Number(v))),
    descripcion: z.string().max(5000).optional().or(z.literal('')),
    direccion: z.string().max(300).optional().or(z.literal('')),
    telefono: z.string().max(30).optional().or(z.literal('')),
    whatsapp: z.string().max(30).optional().or(z.literal('')),
    email_contacto: z.string().email('Email de contacto inválido').optional().or(z.literal('')),
    website: z
      .string()
      .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'URL inválida (http/https)')
      .optional()
      .or(z.literal('')),
    portada_url: z
      .string()
      .refine((v) => v === '' || /^https?:\/\/.+/i.test(v), 'URL inválida (http/https)')
      .optional()
      .or(z.literal('')),
    moneda: z.string().max(3, '3 letras').optional().or(z.literal('')),
    precio_min: z.coerce.number().min(0).optional(),
    precio_max: z.coerce.number().min(0).optional(),
  })
  .refine((d) => d.precio_max === undefined || d.precio_min === undefined || d.precio_max >= d.precio_min, {
    message: 'El precio máximo no puede ser menor que el mínimo',
    path: ['precio_max'],
  })

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

export default function NegocioForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [categorias, setCategorias] = useState([])
  const [lugares, setLugares] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(negocioSchema) })

  useEffect(() => {
    lugaresAPI.getAll().then((r) => setLugares(Array.isArray(r.data) ? r.data : [])).catch(() => {})
    businessesAPI
      .categories()
      .then((res) => {
        const cats = Array.isArray(res.data) ? res.data : []
        setCategorias(cats.filter((c) => c.activo !== false))
        if (isEdit) {
          return businessesAPI
            .getById(id)
            .then((r) => {
              const b = r.data
              reset({
                nombre: b.nombre || '',
                category_id: b.category_id ? String(b.category_id) : '',
                destination_id: b.destination_id ? String(b.destination_id) : '',
                descripcion: b.descripcion || '',
                direccion: b.direccion || '',
                telefono: b.telefono || '',
                whatsapp: b.whatsapp || '',
                email_contacto: b.email_contacto || '',
                website: b.website || '',
                portada_url: b.portada_url || '',
                moneda: b.moneda || 'COP',
                precio_min: b.precio_min != null ? Number(b.precio_min) : undefined,
                precio_max: b.precio_max != null ? Number(b.precio_max) : undefined,
              })
            })
        }
      })
      .catch((err) => toast.error(err.message || 'Error al cargar el formulario'))
      .finally(() => setLoading(false))
  }, [isEdit, id, reset])

  async function onSubmit(data) {
    setSubmitting(true)
    const body = {
      ...data,
      category_id: data.category_id || null,
      destination_id: data.destination_id === '' ? null : data.destination_id,
    }
    try {
      if (isEdit) {
        const res = await businessesAPI.update(id, body)
        toast.success(res.message || 'Negocio actualizado')
        navigate(`/mis-negocios/${id}`)
      } else {
        const res = await businessesAPI.create(body)
        toast.success(res.message || 'Negocio creado')
        navigate('/mis-negocios')
      }
    } catch (err) {
      toast.error(err.message || 'Error al guardar el negocio')
    } finally {
      setSubmitting(false)
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <button
          onClick={() => navigate(isEdit ? `/mis-negocios/${id}` : '/mis-negocios')}
          className="inline-flex items-center gap-2 text-sm text-dark-600 hover:text-primary-700 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          {isEdit ? 'Volver al negocio' : 'Volver a mis negocios'}
        </button>

        <h1 className="text-3xl font-bold text-dark-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {isEdit ? 'Editar negocio' : 'Crear negocio'}
        </h1>
        <p className="text-dark-500 mb-8">
          {isEdit
            ? 'Actualiza la información de tu negocio.'
            : 'Completa la información. Tu negocio quedará pendiente de aprobación.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-dark-100 p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">
              Nombre del negocio <span className="text-red-500">*</span>
            </label>
            <input {...register('nombre')} placeholder="Ej: Hotel Los Andes" className={inputClass} />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Categoría</label>
            <select {...register('category_id')} className={`${inputClass} bg-white`}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Destino turístico</label>
            <select {...register('destination_id')} className={`${inputClass} bg-white`}>
              <option value="">Sin destino</option>
              {lugares.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-dark-400 mt-1">
              El negocio aparecerá en la página pública de este destino.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Descripción</label>
            <textarea {...register('descripcion')} rows={4} placeholder="Describe tu negocio..." className={inputClass} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Dirección</label>
              <input {...register('direccion')} placeholder="Calle 1 #2-3" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Teléfono</label>
              <input {...register('telefono')} placeholder="3001234567" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">WhatsApp</label>
              <input {...register('whatsapp')} placeholder="3001234567" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Email de contacto</label>
              <input {...register('email_contacto')} type="email" placeholder="contacto@negocio.com" className={inputClass} />
              {errors.email_contacto && <p className="text-red-500 text-xs mt-1">{errors.email_contacto.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Sitio web</label>
              <input {...register('website')} placeholder="https://..." className={inputClass} />
              {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">URL de portada</label>
              <input {...register('portada_url')} placeholder="https://..." className={inputClass} />
              {errors.portada_url && <p className="text-red-500 text-xs mt-1">{errors.portada_url.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Moneda</label>
              <input {...register('moneda')} placeholder="COP" className={inputClass} maxLength={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Precio mínimo</label>
              <input {...register('precio_min')} type="number" min="0" placeholder="100000" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">Precio máximo</label>
              <input {...register('precio_max')} type="number" min="0" placeholder="500000" className={inputClass} />
              {errors.precio_max && <p className="text-red-500 text-xs mt-1">{errors.precio_max.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-100">
            <button
              type="button"
              onClick={() => navigate(isEdit ? `/mis-negocios/${id}` : '/mis-negocios')}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {submitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear negocio'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}