import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2, Pencil, Send, Loader2, MessageSquare, CornerDownRight, X } from 'lucide-react'
import { reviewsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { obtenerRuta } from '../../routes/offuscatedRoutes.js'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function StarPicker({ value, onChange }) {
  const refs = useRef([])

  function mover(delta) {
    const actual = value >= 1 && value <= 5 ? value : 1
    const siguiente = Math.min(5, Math.max(1, actual + delta))
    onChange(siguiente)
    refs.current[siguiente - 1]?.focus()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      mover(1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      mover(-1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      onChange(1)
      refs.current[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      onChange(5)
      refs.current[4]?.focus()
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Calificación de 1 a 5 estrellas"
      onKeyDown={handleKeyDown}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const seleccionada = n === value
        return (
          <button
            key={n}
            ref={(el) => { refs.current[n - 1] = el }}
            type="button"
            role="radio"
            aria-checked={seleccionada}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
            tabIndex={seleccionada || (value === 0 && n === 1) ? 0 : -1}
            onClick={() => onChange(n)}
            className={`p-0.5 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded ${n <= value ? 'text-amber-400' : 'text-dark-200 hover:text-amber-300'}`}
          >
            <Star className={`w-6 h-6 ${n <= value ? 'fill-current' : ''}`} />
          </button>
        )
      })}
    </div>
  )
}

function Stars({ value }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= value ? 'text-amber-400 fill-current' : 'text-dark-200'}`} />
      ))}
    </span>
  )
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ResenasSection({ businessId, businessOwnerId, businessEstado }) {
  const { user } = useAuth()
  const [data, setData] = useState({ promedio: 0, cantidad: 0, resenas: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  // La calificacion SIEMPRE empieza en 0: el usuario debe elegir 1-5.
  const [rating, setRating] = useState(0)
  const [ratingError, setRatingError] = useState('')
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const [replyTarget, setReplyTarget] = useState(null)
  const [replyText, setReplyText] = useState('')

  const isBusinessOwner = !!user && Number(user?.id) === Number(businessOwnerId)
  // ADMIN puede moderar/respuestas, pero NO se considera dueno para resenar.
  const isOwner = !!user && (user.rol === 'ADMIN' || isBusinessOwner)
  const isApproved = businessEstado === 'approved'
  const canReview = !!user && isApproved && !isBusinessOwner

  async function fetchReviews() {
    setLoading(true)
    setError(false)
    try {
      const res = await reviewsAPI.getByBusiness(businessId)
      setData(res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [businessId])

  function openCreate() {
    setEditing(null)
    setRating(0)
    setRatingError('')
    setComment('')
    setFormOpen(true)
  }

  function openEdit(review) {
    setEditing(review)
    setRating(review.rating)
    setRatingError('')
    setComment(review.comment || '')
    setFormOpen(true)
  }

  async function submitReview(e) {
    e.preventDefault()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setRatingError('Selecciona una calificación de 1 a 5 estrellas')
      return
    }
    if (comment.length > 2000) {
      toast.error('El comentario no puede superar 2000 caracteres')
      return
    }
    setRatingError('')
    setSaving(true)
    try {
      if (editing) {
        const res = await reviewsAPI.update(editing.id, { rating, comment })
        toast.success(res.message || 'Reseña actualizada')
      } else {
        const res = await reviewsAPI.create(businessId, { rating, comment })
        toast.success(res.message || 'Reseña publicada')
      }
      setFormOpen(false)
      setEditing(null)
      await fetchReviews()
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar la reseña')
    } finally {
      setSaving(false)
    }
  }

  async function removeReview(review) {
    try {
      const res = await reviewsAPI.remove(review.id)
      toast.success(res.message || 'Reseña eliminada')
      await fetchReviews()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la reseña')
    }
  }

  async function submitReply(reviewId) {
    if (!replyText.trim()) return
    if (replyText.length > 2000) {
      toast.error('La respuesta no puede superar 2000 caracteres')
      return
    }
    setSaving(true)
    try {
      const res = await reviewsAPI.reply(reviewId, replyText)
      toast.success(res.message || 'Respuesta publicada')
      setReplyTarget(null)
      setReplyText('')
      await fetchReviews()
    } catch (err) {
      toast.error(err.message || 'No se pudo responder la reseña')
    } finally {
      setSaving(false)
    }
  }

  async function removeReply(reviewId) {
    try {
      const res = await reviewsAPI.removeReply(reviewId)
      toast.success(res.message || 'Respuesta eliminada')
      await fetchReviews()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la respuesta')
    }
  }

  const miResena = data.resenas.find((r) => r.puedo_editar)

  return (
    <div className="bg-white rounded-2xl border border-dark-100 p-6">
      <h3 className="font-semibold text-dark-900 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
        Reseñas
      </h3>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-dark-900" style={{ fontFamily: 'var(--font-display)' }}>
            {Number(data.promedio).toFixed(data.promedio > 0 ? 1 : 0)}
          </span>
          <span className="text-dark-400 text-sm">/ 5</span>
        </div>
        <div>
          <Stars value={Math.round(Number(data.promedio))} />
          <p className="text-sm text-dark-500 mt-0.5">{data.cantidad} {data.cantidad === 1 ? 'reseña' : 'reseñas'}</p>
        </div>
      </div>

      {!user && (
        <div className="mb-6 p-4 rounded-xl bg-dark-50 border border-dark-100 text-sm text-dark-600">
          <Link to={obtenerRuta('LOGIN')} className="font-medium text-primary-600 hover:underline">Inicia sesión</Link> para dejar
          tu reseña y guardar favoritos.
        </div>
      )}

      {user && !isApproved && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Este negocio aún no está aprobado. Las reseñas se habilitan cuando un
          administrador lo apruebe; no se crea un negocio nuevo para lograrlo.
        </div>
      )}

      {user && isApproved && isBusinessOwner && (
        <div className="mb-6 p-4 rounded-xl bg-dark-50 border border-dark-100 text-sm text-dark-600">
          No puedes reseñar tu propio negocio. Puedes responder las reseñas de tus clientes.
        </div>
      )}

      {canReview && !formOpen && (miResena ? (
        <div className="mb-6 p-4 rounded-xl bg-primary-50 border border-primary-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-800">Ya reseñaste este negocio</p>
            <p className="text-sm text-primary-700">Puedes editar o eliminar tu reseña.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(miResena)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors cursor-pointer">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={() => removeReview(miResena)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer">
              <Trash2 className="w-4 h-4" /> Eliminar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openCreate}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors cursor-pointer"
        >
          <Star className="w-4 h-4" /> Dejar una reseña
        </button>
      ))}

      {canReview && formOpen && (
        <form onSubmit={submitReview} className="mb-6 p-4 rounded-xl bg-dark-50 border border-dark-100">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-dark-700">{editing ? 'Editar tu reseña' : 'Tu reseña'}</label>
            <button type="button" onClick={() => { setFormOpen(false); setEditing(null); }} className="p-1 rounded-lg text-dark-400 hover:text-dark-600 cursor-pointer" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <StarPicker
            value={rating}
            onChange={(valor) => {
              setRating(valor)
              setRatingError('')
            }}
          />
          {ratingError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {ratingError}
            </p>
          )}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)"
            rows={3}
            maxLength={2000}
            className={`${inputClass} mt-3`}
          />
          <p className="mt-1 text-right text-xs text-dark-400">{comment.length}/2000</p>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {editing ? 'Guardar cambios' : 'Publicar reseña'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-dark-500 py-6 text-center">No se pudieron cargar las reseñas.</p>
      ) : data.resenas.length === 0 ? (
        <p className="text-sm text-dark-500 py-6 text-center">Aún no hay reseñas. Sé el primero en calificar este negocio.</p>
      ) : (
        <ul className="space-y-4">
          {data.resenas.map((r) => (
            <li key={r.id} className="p-4 rounded-xl border border-dark-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-dark-900">{r.autor_nombre}</span>
                    <Stars value={r.rating} />
                  </div>
                  <p className="text-xs text-dark-400 mt-0.5">{formatDate(r.created_at)}</p>
                  {(r.puedo_editar || isOwner) && (
                    <div className="mt-2 flex items-center gap-2">
                      {r.puedo_editar && (
                        <button onClick={() => openEdit(r)} className="text-xs font-medium text-ocean-600 hover:underline cursor-pointer">
                          Editar
                        </button>
                      )}
                      {(r.puedo_editar || user?.rol === 'ADMIN') && (
                        <button onClick={() => removeReview(r)} className="text-xs font-medium text-red-600 hover:underline cursor-pointer">
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {user && !r.puedo_editar && isOwner && r.respuestas.length === 0 && (
                  <button
                    onClick={() => setReplyTarget(r.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Responder
                  </button>
                )}
              </div>

              {r.comment && <p className="text-sm text-dark-700 mt-2 leading-relaxed">{r.comment}</p>}

              {r.respuestas.map((rep) => (
                <div key={rep.id} className="mt-3 ml-5 pl-4 border-l-2 border-dark-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CornerDownRight className="w-3.5 h-3.5 text-dark-300" />
                    <span className="text-xs font-semibold text-primary-700">Respuesta de {rep.autor_nombre}</span>
                    {isOwner && (
                      <button onClick={() => removeReply(r.id)} className="text-xs text-red-500 hover:underline cursor-pointer" title="Eliminar respuesta">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-dark-600 mt-1">{rep.reply}</p>
                  <p className="text-xs text-dark-400 mt-0.5">{formatDate(rep.created_at)}</p>
                </div>
              ))}

              {replyTarget === r.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta como negocio..."
                    maxLength={2000}
                    className={inputClass}
                    autoFocus
                  />
                  <button
                    onClick={() => submitReply(r.id)}
                    disabled={!replyText.trim() || saving}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}