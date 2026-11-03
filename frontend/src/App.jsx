import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { obtenerRuta } from './routes/offuscatedRoutes.js'
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
          {/* La raíz "/" es un alias neutro de la página de inicio: no revela
              ningún nombre interno y mantiene funcionando el dominio, los
              enlaces antiguos y las recargas directas. */}
          <Route path="/" element={<Home />} />
          <Route path={obtenerRuta('INICIO')} element={<Home />} />
          <Route path={obtenerRuta('LUGARES')} element={<Lugares />} />
          <Route path={obtenerRuta('LUGARES') + '/:id'} element={<LugarDetalle />} />
          <Route path={obtenerRuta('NEGOCIOS_PUBLICOS')} element={<NegociosPublicos />} />
          <Route path={obtenerRuta('NEGOCIOS_PUBLICOS') + '/:id'} element={<NegocioDetalle />} />
          <Route path={obtenerRuta('PLANES_PUBLICOS')} element={<PlanesPublicos />} />
          <Route path={obtenerRuta('PLANES_PUBLICOS') + '/:id'} element={<PlanDetalle />} />
          <Route path={obtenerRuta('PERFIL')} element={
            <ProtectedRoute><Perfil /></ProtectedRoute>
          } />
          <Route path={obtenerRuta('FAVORITOS')} element={
            <ProtectedRoute><MisFavoritos /></ProtectedRoute>
          } />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path={obtenerRuta('LOGIN')} element={<Login />} />
          <Route path={obtenerRuta('REGISTRO')} element={<Registro />} />
          <Route path={obtenerRuta('RESET_PASSWORD')} element={<RestablecerContrasena />} />
        </Route>

        <Route element={<ProtectedRoute roles={['BUSINESS', 'ADMIN']}><BusinessLayout /></ProtectedRoute>}>
          <Route path={obtenerRuta('PANEL_VENDEDOR')} element={<PanelVendedor />} />
          <Route path={obtenerRuta('MIS_NEGOCIOS_RESUMEN')} element={<ResumenNegocios />} />
          <Route path={obtenerRuta('MIS_NEGOCIOS')} element={<MisNegocios />} />
          <Route path={obtenerRuta('NEGOCIO_NUEVO')} element={<NegocioForm />} />
          <Route path={obtenerRuta('MIS_NEGOCIOS') + '/:id'} element={<NegocioDetalle manage />} />
          <Route path={obtenerRuta('MIS_NEGOCIOS') + '/:id/editar'} element={<NegocioForm />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path={obtenerRuta('ADMIN')} element={<AdminDashboard />} />
            <Route path={obtenerRuta('ADMIN_USUARIOS')} element={<AdminUsuarios />} />
            <Route path={obtenerRuta('ADMIN_VENDEDORES')} element={<AdminVendedores />} />
            <Route path={obtenerRuta('ADMIN_LUGARES')} element={<AdminDestinos />} />
            <Route path={obtenerRuta('ADMIN_NEGOCIOS')} element={<AdminNegocios />} />
            <Route path={obtenerRuta('ADMIN_RESEÑAS')} element={<AdminResenas />} />
            <Route path={obtenerRuta('ADMIN_HISTORIAL')} element={<AdminHistorial />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
        </Routes>
        </AppErrorBoundary>
      </MotionConfig>
    </AuthProvider>
  )
}
