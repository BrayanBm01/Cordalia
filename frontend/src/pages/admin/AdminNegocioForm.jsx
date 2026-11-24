import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Loader2, Save, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminNegociosAPI, businessesAPI } from '../../services/api'
import ImageUploader from '../../components/ImageUploader'
import MoneyInput from '../../components/MoneyInput'
import {
  buildBusinessSchema,
  CATEGORIAS_CON_PRECIO,
  MONEDAS,
} from '../negocios/businessFormSchema.js'
import { ESTADO_LABEL, PUBLICACION_LABEL } from '../negocios/businessUtils'

const ESTADOS = ['draft', 'pending', 'approved', 'rejected', 'suspended', 'inactive']
const PUBLICACIONES = ['visible', 'oculto_admin', 'oculto_suscripcion']

const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function valoresIniciales(negocio) {
  return {
    nombre: negocio?.nombre || '',
    category_id: negocio?.category_id ? String(negocio.category_id) : '',
    destination_id: negocio?.destination_id ? String(negocio.destination_id) : '',
    descripcion: negocio?.descripcion || '',
    direccion: negocio?.direccion || '',
    telefono: negocio?.telefono || '',
    whatsapp: negocio?.whatsapp || '',
    email_contacto: negocio?.email_contacto || '',
    website: negocio?.website || '',
    portada_url: negocio?.portada_url || '',
    moneda: negocio?.moneda || 'COP',
    precio_min: negocio?.precio_min != null ? Number(negocio.precio_min) : undefined,
    precio_max: negocio?.precio_max != null ? Number(negocio.precio_max) : undefined,
    estado: negocio?.estado || 'approved',
    publicacion_estado: negocio?.publicacion_estado || 'visible',
  }
}

/**
 * Formulario administrativo de negocios. Usa el MISMO schema Zod que el
 * formulario del vendedor; añade únicamente los campos que solo el ADMIN
 * puede fijar (moderación y publicación) y la galería de fotografías.
 */
export default function AdminNegocioForm({ negocio, categorias, lugares, onGuardado, onCancelar }) {
  const esEdicion = Boolean(negocio?.id)
  const resolver = useMemo(() => zodResolver(buildBusinessSchema(categorias)), [categorias])
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver, defaultValues: valoresIniciales(negocio) })

  const [imagenes, setImagenes] = useState([])
  const [nuevaImagen, setNuevaImagen] = useState('')
  const [nuevoAlt, setNuevoAlt] = useState('')
  const [guardandoFoto, setGuardandoFoto] = useState(false)

  useEffect(() => {
    reset(valoresIniciales(negocio))
  }, [negocio, reset])

  useEffect(() => {
    if (!esEdicion) {
      setImagenes([])
      return
    }
    businessesAPI.imagenes
      .list(negocio.id)
      .then((r) => setImagenes(Array.isArray(r.data) ? r.data : []))
      .catch((err) => toast.error(err.message || 'No se pudo cargar la galería'))
  }, [esEdicion, negocio?.id])

  const categoriaId = String(watch('category_id') || '')
  const categoriaActual = categorias.find((c) => String(c.id) === categoriaId)
  const requierePrecio = !!categoriaActual && CATEGORIAS_CON_PRECIO.includes(categoriaActual.nombre)
  const sinPrecio = !!categoriaActual && !CATEGORIAS_CON_PRECIO.includes(categoriaActual.nombre)

  async function onSubmit(data) {
    // El schema Zod compartido valida los datos del negocio, pero no declara
    // moderation/publicacion: Zod descarta claves desconocidas. Se leen del
    // formulario y el backend ADMIN vuelve a validarlas.
    const body = {
      ...data,
      category_id: data.category_id || null,
      destination_id: data.destination_id === '' ? null : data.destination_id,
      estado: getValues('estado'),
      publicacion_estado: getValues('publicacion_estado'),
    }
    // El backend rechaza precios en categorías que no los publican.
    if (sinPrecio) {
      delete body.precio_min
      delete body.precio_max
    }
    try {
      // Rutas ADMIN dedicadas: la ruta de vendedor asignaria al ADMIN como
      // propietario y rechazaria la moderacion/publicacion como protegidas.
      const res = esEdicion
        ? await adminNegociosAPI.update(negocio.id, body)
        : await adminNegociosAPI.create(body)
      toast.success(res.message || (esEdicion ? 'Negocio actualizado' : 'Negocio creado'))
      await onGuardado(res.data)
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el negocio')
    }
  }

  async function recargarImagenes() {
    const r = await businessesAPI.imagenes.list(negocio.id)
    setImagenes(Array.isArray(r.data) ? r.data : [])
  }

  async function agregarImagen() {
    const url = nuevaImagen.trim()
    if (!url) {
      toast.error('Indica una URL o selecciona una imagen')
      return
    }
    setGuardandoFoto(true)
    try {
      const res = await businessesAPI.imagenes.add(negocio.id, {
        url,
        alt_text: nuevoAlt.trim() || null,
        is_primary: imagenes.length === 0,
      })
      toast.success(res.message || 'Imagen agregada')
      setNuevaImagen('')
      setNuevoAlt('')
      await recargarImagenes()
    } catch (err) {
      toast.error(err.message || 'No se pudo agregar la imagen')
    } finally {
      setGuardandoFoto(false)
    }
  }

  async function destacarImagen(imageId) {
    try {
      await businessesAPI.imagenes.setPrimary(negocio.id, imageId)
      await recargarImagenes()
    } catch (err) {
      toast.error(err.message || 'No se pudo destacar la imagen')
    }
  }

  async function quitarImagen(imageId) {
    try {
      await businessesAPI.imagenes.remove(negocio.id, imageId)
      toast.success('Imagen eliminada')
      await recargarImagenes()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la imagen')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-dark-700 mb-1.5">
            Nombre del negocio <span className="text-red-500">*</span>
          </label>
          <input
            {...register('nombre')}
            placeholder="Ej: Hotel Los Andes"
            className={inputClass}
            autoFocus
          />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          {esEdicion && (
            <p className="text-xs text-dark-400 mt-1">
              El ADMIN puede renombrar. Se valida la unicidad y se registra en la auditoría.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Categoría</label>
          <select {...register('category_id')} className={`${inputClass} bg-white`}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Destino turístico</label>
          <select {...register('destination_id')} className={`${inputClass} bg-white`}>
            <option value="">Sin destino</option>
            {lugares.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Descripción</label>
          <textarea {...register('descripcion')} rows={3} placeholder="Describe el negocio..." className={inputClass} />
          {errors.descripcion && <p className="text-red-500 text-xs mt-1">{errors.descripcion.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Dirección / ubicación</label>
          <input {...register('direccion')} placeholder="Calle 1 #2-3" className={inputClass} />
          {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Teléfono</label>
          <input {...register('telefono')} placeholder="3001234567" className={inputClass} />
          {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">WhatsApp</label>
          <input {...register('whatsapp')} placeholder="3001234567" className={inputClass} />
          {errors.whatsapp && <p className="text-red-500 text-xs mt-1">{errors.whatsapp.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Correo de contacto</label>
          <input {...register('email_contacto')} type="email" placeholder="contacto@negocio.com" className={inputClass} />
          {errors.email_contacto && <p className="text-red-500 text-xs mt-1">{errors.email_contacto.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Sitio web</label>
          <input {...register('website')} placeholder="https://..." className={inputClass} />
          {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Moneda</label>
          <select {...register('moneda')} className={`${inputClass} bg-white`}>
            {MONEDAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {errors.moneda && <p className="text-red-500 text-xs mt-1">{errors.moneda.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-dark-700 mb-1.5">Fotografía de portada</label>
          <ImageUploader
            value={watch('portada_url') || ''}
            onChange={(v) => setValue('portada_url', v, { shouldValidate: true })}
            placeholder="URL de la portada (https://)"
          />
          {errors.portada_url && <p className="text-red-500 text-xs mt-1">{errors.portada_url.message}</p>}
        </div>

        {requierePrecio && (
          <>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">
                Precio mínimo <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="precio_min"
                render={({ field }) => (
                  <MoneyInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? undefined)}
                    placeholder="100000"
                    className={inputClass}
                  />
                )}
              />
              {errors.precio_min && <p className="text-red-500 text-xs mt-1">{errors.precio_min.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1.5">
                Precio máximo <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="precio_max"
                render={({ field }) => (
                  <MoneyInput
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? undefined)}
                    placeholder="500000"
                    className={inputClass}
                  />
                )}
              />
              {errors.precio_max && <p className="text-red-500 text-xs mt-1">{errors.precio_max.message}</p>}
            </div>
          </>
        )}

        <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-dark-100">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Moderación</label>
            <select {...register('estado')} className={`${inputClass} bg-white`}>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABEL[e]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1.5">Publicación</label>
            <select {...register('publicacion_estado')} className={`${inputClass} bg-white`}>
              {PUBLICACIONES.map((p) => (
                <option key={p} value={p}>{PUBLICACION_LABEL[p]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {esEdicion && (
        <section className="border-t border-dark-100 pt-5">
          <h3 className="text-sm font-semibold text-dark-800 mb-3 flex items-center gap-2">
            <ImagePlus className="w-4 h-4" /> Galería de fotografías
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <ImageUploader
              value={nuevaImagen}
              onChange={setNuevaImagen}
              placeholder="URL de la imagen (https://)"
              preview={false}
            />
            <input
              value={nuevoAlt}
              onChange={(e) => setNuevoAlt(e.target.value)}
              placeholder="Texto alternativo (opcional)"
              className={`${inputClass} sm:max-w-[220px]`}
              maxLength={250}
            />
            <button
              type="button"
              onClick={agregarImagen}
              disabled={guardandoFoto}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {guardandoFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              Agregar
            </button>
          </div>
          {imagenes.length === 0 ? (
            <p className="text-xs text-dark-400 mt-3">Este negocio todavía no tiene fotos en la galería.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {imagenes.map((img) => (
                <div key={img.id} className="relative group border border-dark-200 rounded-lg overflow-hidden bg-dark-50">
                  <img src={img.url} alt={img.alt_text || 'Imagen del negocio'} className="h-20 w-full object-cover" />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => destacarImagen(img.id)}
                      disabled={img.is_primary}
                      title="Marcar como principal"
                      className={`p-1 rounded ${img.is_primary ? 'text-amber-500' : 'text-dark-400 hover:text-amber-600'} disabled:opacity-60`}
                    >
                      <Star className="w-4 h-4" fill={img.is_primary ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => quitarImagen(img.id)}
                      title="Quitar imagen"
                      className="p-1 rounded text-dark-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-dark-100">
        <button
          type="button"
          onClick={onCancelar}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-dark-600 hover:bg-dark-100 transition-colors"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? 'Guardando...' : esEdicion ? 'Actualizar negocio' : 'Crear negocio'}
        </button>
      </div>
    </form>
  )
}
