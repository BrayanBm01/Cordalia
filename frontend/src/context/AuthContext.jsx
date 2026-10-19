import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import {
  SESION_INACTIVIDAD_MS,
  SESION_INACTIVIDAD_FLAG,
  RUTA_INICIO,
  rutaActual,
  marcarSesionExpirada,
  EVENTO_SESION_INVALIDA,
} from '../utils/session'

const AuthContext = createContext(null)

function limpiarSesionLocal() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    try {
      return saved ? JSON.parse(saved) : null
    } catch {
      limpiarSesionLocal()
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  // Evita que el cierre automático se dispare dos veces (inactividad + 401
  // simultáneos, StrictMode, etc.) y que queden redirecciones repetidas.
  const cierreEnCursoRef = useRef(false)
  const montadoRef = useRef(false)
  // Temporizador ÚNICO de inactividad (vive en un ref para poder cancelarlo
  // también desde el logout manual) y redirección de expiración pendiente.
  const timerRef = useRef(null)
  const redireccionPendienteRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    montadoRef.current = true
    return () => {
      montadoRef.current = false
      if (redireccionPendienteRef.current) {
        clearTimeout(redireccionPendienteRef.current)
        redireccionPendienteRef.current = null
      }
    }
  }, [])

  /**
   * Cierre de sesión único por expiración. Limpia SIEMPRE el estado local
   * (token + usuario) y avisa que la sesión terminó; NO navega con
   * `window.location.href` porque en producción (Vercel) eso produce un 404.
   *
   * La redirección a la página pública de inicio se agenda con `replace` en el
   * siguiente tick, vía el router de React. Así, si la ruta actual era privada
   * (ProtectedRoute/AdminRoute apuntan a /login), primero se procesa esa
   * navegación y después ésta, quedando SIEMPRE en '/' sin bucles.
   */
  const cerrarSesionExpirada = useCallback(() => {
    if (cierreEnCursoRef.current) return
    cierreEnCursoRef.current = true
    limpiarSesionLocal()
    marcarSesionExpirada()
    if (montadoRef.current) {
      setUser(null)
      if (rutaActual() !== RUTA_INICIO && !redireccionPendienteRef.current) {
        redireccionPendienteRef.current = setTimeout(() => {
          redireccionPendienteRef.current = null
          navigate(RUTA_INICIO, { replace: true })
        }, 0)
      }
    }
    // Se libera en el siguiente tick: permite que las peticiones en vuelo
    // terminen sin volver a disparar el aviso, pero no bloquea un futuro login.
    setTimeout(() => {
      cierreEnCursoRef.current = false
    }, 0)
  }, [navigate])

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
        limpiarSesionLocal()
        setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  /**
   * Guarda la sesión devuelta por el backend validando primero el formato,
   * de modo que NUNCA se persista una sesión incompleta (por ejemplo si el
   * backend o un proxy devolviera una estructura inesperada).
   */
  const guardarSesion = (res) => {
    const token = res?.data?.token
    const usuario = res?.data?.usuario
    if (!token || !usuario) {
      throw new Error('Respuesta de autenticación incompleta del servidor')
    }
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(usuario))
    cierreEnCursoRef.current = false
    // Un login nuevo invalida cualquier redirección de expiración pendiente.
    if (redireccionPendienteRef.current) {
      clearTimeout(redireccionPendienteRef.current)
      redireccionPendienteRef.current = null
    }
    setUser(usuario)
    return res
  }

  const login = async (email, password) => {
    const res = await authAPI.login(email, password)
    return guardarSesion(res)
  }

  const googleLogin = async (idToken, rol) => {
    const res = await authAPI.google(idToken, rol)
    return guardarSesion(res)
  }

  const register = async (nombre, email, password, rol) => {
    return await authAPI.register(nombre, email, password, rol)
  }

  const logout = async () => {
    // Cierre manual: nunca debe disparar el aviso de inactividad. El candado
    // silencia cualquier 401/expiración que ocurra durante el propio logout.
    cierreEnCursoRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    try {
      await authAPI.logout()
    } catch {
    } finally {
      limpiarSesionLocal()
      setUser(null)
      // Un logout deliberado deja el estado limpio: no hay aviso pendiente.
      try {
        sessionStorage.removeItem(SESION_INACTIVIDAD_FLAG)
      } catch {
        // sessionStorage no disponible
      }
      // Se libera en el siguiente tick para que un 401 de una petición en
      // vuelo durante el propio logout NO dispare el aviso de inactividad.
      setTimeout(() => {
        cierreEnCursoRef.current = false
      }, 0)
    }
  }

  const updateUser = (newData) => {
    setUser(prev => {
      const updated = { ...prev, ...newData }
      localStorage.setItem('user', JSON.stringify(updated))
      return updated
    })
  }

  // El interceptor HTTP detecta una sesión inválida (401) y lo comunica con el
  // evento de bajo nivel. El cierre definitivo (y el aviso visible) pasa por
  // `cerrarSesionExpirada`, que es único por expiración.
  useEffect(() => {
    const handler = () => cerrarSesionExpirada()
    window.addEventListener(EVENTO_SESION_INVALIDA, handler)
    return () => window.removeEventListener(EVENTO_SESION_INVALIDA, handler)
  }, [cerrarSesionExpirada])

  // Auto-logout por inactividad: solo cuenta la interacción humana
  // (puntero, teclado, toque, scroll/rueda). Los renders, fetches y
  // polling NO resetean el temporizador. Al expirar se invalida la
  // sesión en el backend (POST /auth/logout) y se avisa en la vista pública.
  //
  // El temporizador vive en un ref, no en una variable de cierre: así es
  // imposible que queden dos temporizadores activos (StrictMode, re-renders).
  useEffect(() => {
    if (!user) return
    const eventos = ['pointermove', 'mousedown', 'keydown', 'touchstart', 'wheel']

    const limpiarTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    const cerrarPorInactividad = async () => {
      limpiarTimer()
      try {
        await authAPI.logout()
      } catch {
        // Da igual si el backend no responde: la sesión local caduca igual.
      } finally {
        cerrarSesionExpirada()
      }
    }

    const reiniciarTimer = () => {
      limpiarTimer()
      timerRef.current = setTimeout(cerrarPorInactividad, SESION_INACTIVIDAD_MS)
    }

    eventos.forEach((ev) => window.addEventListener(ev, reiniciarTimer, { passive: true }))
    reiniciarTimer()

    return () => {
      limpiarTimer()
      eventos.forEach((ev) => window.removeEventListener(ev, reiniciarTimer))
    }
  }, [user, cerrarSesionExpirada])

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
