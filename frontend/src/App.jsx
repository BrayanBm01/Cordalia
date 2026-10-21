import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import AppErrorBoundary from './components/AppErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
import AdminLayout from './layouts/AdminLayout'
import BusinessLayout from './layouts/BusinessLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Registro from './pages/Registro'
import RestablecerContrasena from './pages/RestablecerContrasena'
import Lugares from './pages/Lugares'
import LugarDetalle from './pages/LugarDetalle'
import Perfil from './pages/Perfil'
import NotFound from './pages/NotFound'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsuarios from './pages/admin/AdminUsuarios'
import AdminVendedores from './pages/admin/AdminVendedores'
import AdminDestinos from './pages/admin/AdminDestinos'
import AdminHistorial from './pages/admin/AdminHistorial'
import AdminNegocios from './pages/admin/AdminNegocios'
import AdminResenas from './pages/admin/AdminResenas'
import NegociosPublicos from './pages/negocios/NegociosPublicos'
import MisNegocios from './pages/negocios/MisNegocios'
import PanelVendedor from './pages/negocios/PanelVendedor'
import ResumenNegocios from './pages/negocios/ResumenNegocios'
import NegocioForm from './pages/negocios/NegocioForm'
import NegocioDetalle from './pages/negocios/NegocioDetalle'
import MisFavoritos from './pages/MisFavoritos'
import PlanesPublicos from './pages/planes/PlanesPublicos'
import PlanDetalle from './pages/planes/PlanDetalle'

export default function App() {
  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <ScrollToTop />
        <AppErrorBoundary>
        <Routes>
          <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/lugares" element={<Lugares />} />
          <Route path="/lugares/:id" element={<LugarDetalle />} />
          <Route path="/negocios" element={<NegociosPublicos />} />
          <Route path="/negocios/:id" element={<NegocioDetalle />} />
          <Route path="/planes" element={<PlanesPublicos />} />
          <Route path="/planes/:id" element={<PlanDetalle />} />
          <Route path="/perfil" element={
            <ProtectedRoute><Perfil /></ProtectedRoute>
          } />
          <Route path="/favoritos" element={
            <ProtectedRoute><MisFavoritos /></ProtectedRoute>
          } />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/restablecer-contrasena" element={<RestablecerContrasena />} />
        </Route>

        <Route element={<ProtectedRoute roles={['BUSINESS', 'ADMIN']}><BusinessLayout /></ProtectedRoute>}>
          <Route path="/panel-vendedor" element={<PanelVendedor />} />
          <Route path="/mis-negocios/resumen" element={<ResumenNegocios />} />
          <Route path="/mis-negocios" element={<MisNegocios />} />
          <Route path="/mis-negocios/nuevo" element={<NegocioForm />} />
          <Route path="/mis-negocios/:id" element={<NegocioDetalle manage />} />
          <Route path="/mis-negocios/:id/editar" element={<NegocioForm />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/usuarios" element={<AdminUsuarios />} />
            <Route path="/admin/vendedores" element={<AdminVendedores />} />
            <Route path="/admin/lugares" element={<AdminDestinos />} />
            <Route path="/admin/negocios" element={<AdminNegocios />} />
            <Route path="/admin/resenas" element={<AdminResenas />} />
            <Route path="/admin/historial" element={<AdminHistorial />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
        </Routes>
        </AppErrorBoundary>
      </MotionConfig>
    </AuthProvider>
  )
}
