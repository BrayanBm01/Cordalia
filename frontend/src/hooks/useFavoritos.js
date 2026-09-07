import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { favoritosAPI } from '../services/api'

// Caché por tipo compartida entre todos los botones de la sesión.
// Evita llamadas repetidas al backend en listados con muchos elementos.
const cache = { destino: null, negocio: null }

export function useFavoritos(tipo) {
  const { user } = useAuth()
  const [ids, setIds] = useState(() => (cache[tipo] ? new Set(cache[tipo]) : new Set()))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIds(cache[tipo] ? new Set(cache[tipo]) : new Set())
    if (!user) {
      cache[tipo] = null
      return
    }
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const res = tipo === 'destino' ? await favoritosAPI.destinos.list() : await favoritosAPI.negocios.list()
        const arr = (res.data || []).map((x) => Number(x.id))
        cache[tipo] = arr
        if (active) setIds(new Set(arr))
      } catch {
        // Sin favoritos si falla la consulta; la UI no debe romperse
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [tipo, user?.id])

  const setFavorito = useCallback(
    (id, value) => {
      setIds((prev) => {
        const next = new Set(prev)
        if (value) {
          next.add(Number(id))
        } else {
          next.delete(Number(id))
        }
        cache[tipo] = Array.from(next)
        return next
      })
    },
    [tipo]
  )

  const toggle = useCallback(
    async (id) => {
      const target = Number(id)
      const isFav = ids.has(target)
      if (!user) {
        return { needsLogin: true }
      }
      // Optimista: actualiza la UI y revierte ante error.
      setFavorito(target, !isFav)
      try {
        if (isFav) {
          const action = tipo === 'destino' ? favoritosAPI.destinos : favoritosAPI.negocios
          await action.remove(target)
        } else {
          const action = tipo === 'destino' ? favoritosAPI.destinos : favoritosAPI.negocios
          await action.add(target)
        }
        return { added: !isFav }
      } catch (err) {
        setFavorito(target, isFav)
        throw err
      }
    },
    [ids, user, tipo, setFavorito]
  )

  return { ids, loading, toggle, setFavorito }
}