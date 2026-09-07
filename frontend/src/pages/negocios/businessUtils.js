export const ESTADO_LABEL = {
  draft: 'Borrador',
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
  inactive: 'Inactivo',
}

export const ESTADO_BADGE = {
  draft: 'bg-dark-100 text-dark-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  inactive: 'bg-dark-100 text-dark-500',
}

export const DIAS_LABEL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return ''
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function formatRango(precioMin, precioMax) {
  const min = formatMoney(precioMin)
  const max = formatMoney(precioMax)
  if (min && max) return `${min} - ${max}`
  return min || max || ''
}