import { Outlet, Link } from 'react-router-dom'
import { Mountain } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-white">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-dark-400 hover:text-dark-700 lg:text-white/70 lg:hover:text-white transition-colors"
        >
          <Mountain className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
