import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Star, Trash2, Pencil, Send, Loader2, MessageSquare, CornerDownRight, X } from 'lucide-react'
import { reviewsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-dark-200 text-sm bg-white text-dark-900 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-colors'

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`p-0.5 transition-colors cursor-pointer ${n <= value ? 'text-amber-400' : 'text-dark-200 hover:text-amber-300'}`}
          aria-label={`${n} estrellas`}
        >
          <Star className={`w-6 h-6 ${n <= value ? 'fill-current' : ''}`} />
        </button>
      ))}
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

export default function ResenasSection({ businessId, businessOwnerId }) {
  const { user } = useAuth()
  const [data, setData] = useState({ promedio: 0, cantidad: 0, resenas: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const [replyTarget, setReplyTarget] = useState(null)
  const [replyText, setReplyText] = useState('')

  const isOwner = !!user && (user.rol === 'ADMIN' || Number(user?.id) === Number(businessOwnerId))

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
    setRating(5)
    setComment('')
    setFormOpen(true)
  }

  function openEdit(review) {
    setEditing(review)
    setRating(review.rating)
    setComment(review.comment || '')
    setFormOpen(true)
  }

  async function submitReview(e) {
    e.preventDefault()
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
          <Link to="/login" className="font-medium text-primary-600 hover:underline">Inicia sesión</Link> para dejar
          tu reseña y guardar favoritos.
        </div>
      )}

      {user && !formOpen && (miResena ? (
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

      {formOpen && (
        <form onSubmit={submitReview} className="mb-6 p-4 rounded-xl bg-dark-50 border border-dark-100">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-dark-700">{editing ? 'Editar tu reseña' : 'Tu reseña'}</label>
            <button type="button" onClick={() => { setFormOpen(false); setEditing(null); }} className="p-1 rounded-lg text-dark-400 hover:text-dark-600 cursor-pointer" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos tu experiencia (opcional)"
            rows={3}
            className={`${inputClass} mt-3`}
          />
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