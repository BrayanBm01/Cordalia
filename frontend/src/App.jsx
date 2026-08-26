import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Registro from './pages/Registro'
import Lugares from './pages/Lugares'
import LugarDetalle from './pages/LugarDetalle'
import Perfil from './pages/Perfil'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminDestinos from './pages/admin/AdminDestinos'
import AdminHistorial from './pages/admin/AdminHistorial'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/lugares" element={<Lugares />} />
          <Route path="/lugares/:id" element={<LugarDetalle />} />
          <Route path="/perfil" element={
            <ProtectedRoute><Perfil /></ProtectedRoute>
          } />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/lugares" element={<AdminDestinos />} />
            <Route path="/admin/historial" element={<AdminHistorial />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
