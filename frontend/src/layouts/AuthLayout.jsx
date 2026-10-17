import { Outlet, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-cream-200 text-xs font-semibold text-dark-800 lg:bg-black/35 lg:border-white/20 lg:text-white/90 lg:hover:bg-black/55 backdrop-blur-md transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Cordalia</span>
        </Link>
      </div>
      <Outlet />
    </div>
  )
}
