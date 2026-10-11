import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import { SESION_INACTIVIDAD_MS, SESION_INACTIVIDAD_FLAG } from '../utils/session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  // Restauracion de sesion al montar, con proteccion contra condiciones de carrera.
  useEffect(() => {
    let active = true
    ;(async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        if (active) setLoading(false)
        return
      }
      try {
        const res = await authAPI.me()
        if (!active) return
        setUser(res.data)
        localStorage.setItem('user', JSON.stringify(res.data))
      } catch {
        if (!active) return
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.usuario))
    setUser(res.data.usuario)
    return res
  }

  const googleLogin = async (idToken, rol) => {
    const res = await authAPI.google(idToken, rol)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.usuario))
    setUser(res.data.usuario)
    return res
  }

  const register = async (nombre, email, password, rol) => {
    return await authAPI.register(nombre, email, password, rol)
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch {
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
  }

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  // Auto-logout por inactividad: solo cuenta la interacción humana
  // (puntero, teclado, toque, scroll/rueda). Los renders, fetches y
  // polling NO resetean el temporizador. Al expirar se invalida la
  // sesión en el backend (POST /auth/logout) y se avisa en /login.
  useEffect(() => {
    if (!user) return
    let timer = null
    const eventos = ['pointermove', 'mousedown', 'keydown', 'touchstart', 'wheel']

    const cerrarPorInactividad = async () => {
      if (timer) clearTimeout(timer)
      try {
        await authAPI.logout()
      } catch {
      } finally {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }
      sessionStorage.setItem(SESION_INACTIVIDAD_FLAG, '1')
      window.location.href = '/login'
    }

    const reiniciarTimer = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(cerrarPorInactividad, SESION_INACTIVIDAD_MS)
    }

    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTimer, { passive: true }))
    reiniciarTimer()

    return () => {
      if (timer) clearTimeout(timer)
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTimer))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
