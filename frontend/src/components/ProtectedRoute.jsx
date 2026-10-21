import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { destinoRutaProtegida } from '../utils/roles'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // La decisión (incluida la normalización del rol) vive en utils/roles
  // para poder probarse sin montar React.
  const { destino, permitido } = destinoRutaProtegida({
    rol: user?.rol,
    rolesPermitidos: roles,
    autenticado: Boolean(user),
  })

  if (!permitido) {
    // Sin sesión -> /login. Con sesión pero sin permiso -> SU panel
    // (no a una página de error).
    return <Navigate to={destino} replace />
  }

  return children
}
