import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useFavoritos } from '../hooks/useFavoritos'
import { toast } from 'sonner'

export default function FavoritoButton({
  tipo,
  id,
  className = '',
  withLabel = false,
  labelNoFav = 'Agregar a favoritos',
  labelFav = 'Quitar de favoritos',
}) {
  const navigate = useNavigate()
  const { ids, loading, toggle } = useFavoritos(tipo)
  const activo = ids.has(Number(id))

  async function handleClick() {
    if (loading) return
    try {
      const res = await toggle(id)
      if (res?.needsLogin) {
        toast.info('Inicia sesión para guardar favoritos.')
        navigate('/login', { state: { from: window.location.pathname } })
        return
      }
      if (res?.added) {
        toast.success(tipo === 'destino' ? 'Destino agregado a favoritos' : 'Negocio agregado a favoritos')
      } else {
        toast.success(tipo === 'destino' ? 'Destino eliminado de favoritos' : 'Negocio eliminado de favoritos')
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el favorito')
    }
  }

  const base =
    'inline-flex items-center justify-center gap-2 font-semibold transition-all cursor-pointer select-none ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2'
  const estadoClase = activo
    ? 'bg-red-500 text-white border-2 border-red-500 shadow-md hover:bg-red-600 active:scale-95'
    : 'bg-white text-dark-700 border-2 border-dark-200 shadow-sm hover:border-red-400 hover:text-red-600 hover:bg-red-50 active:scale-95'
  const shape = withLabel ? 'px-4 py-2.5 h-auto rounded-2xl' : 'rounded-full'

  const label = activo ? labelFav : labelNoFav

  return (
    <button
      onClick={handleClick}
      aria-pressed={activo}
      aria-label={label}
      title={label}
      className={`${base} ${estadoClase} ${shape} ${className}`}
    >
      <Heart className={`${withLabel ? 'w-6 h-6' : 'w-5 h-5'} ${activo ? 'fill-current' : ''}`} />
      {withLabel && <span>{label}</span>}
    </button>
  )
}