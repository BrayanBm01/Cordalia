import { Inbox } from 'lucide-react'

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Sin resultados',
  description = 'No se encontraron elementos para mostrar.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-dark-400" />
      </div>
      <h3 className="text-lg font-semibold text-dark-800 mb-1">{title}</h3>
      <p className="text-sm text-dark-500 text-center max-w-sm">{description}</p>
    </div>
  )
}
