import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { destinoRutaProtegida } from '../utils/roles'

export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-50">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // La decisión vive en utils/roles (rol normalizado + destino propio de
  // cada rol). Un vendedor que intente abrir /admin va a SU panel, no a
  // una página de error; sin sesión, va a /login.
  const { destino, permitido } = destinoRutaProtegida({
    rol: user?.rol,
    rolesPermitidos: ['ADMIN'],
    autenticado: Boolean(user),
  })

  if (!permitido) {
    return <Navigate to={destino} replace />
  }

  return <Outlet />
}
