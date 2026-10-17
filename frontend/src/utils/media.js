// Utilidades de imágenes y recursos fotográficos de Córdoba para el frontend público.
// Conserva compatibilidad total con URLs remotas válidas y provee recursos locales
// de alta resolución para Córdoba (playas, manglares, ríos, arquitectura y cultura).

const UMBRAL_DATA_URI = 5000

export function esImagenDeRelleno(src) {
  if (!src || typeof src !== 'string') return true
  if (src.startsWith('data:image')) return src.length < UMBRAL_DATA_URI
  return false
}

const DESTINO_FALLBACKS = {
  1: '/img/destinos/monteria.jpg',
  2: '/img/destinos/lorica.jpg',
  3: '/img/destinos/san-antero.jpg',
  4: '/img/destinos/san-bernardo.jpg',
  5: '/img/destinos/monitos.jpg',
  6: '/img/destinos/tuchin.jpg',
  7: '/img/destinos/tierralta.jpg',
  8: '/img/destinos/tierralta.jpg',
  'monteria': '/img/destinos/monteria.jpg',
  'santa-cruz-de-lorica': '/img/destinos/lorica.jpg',
  'lorica': '/img/destinos/lorica.jpg',
  'san-antero': '/img/destinos/san-antero.jpg',
  'san-bernardo-del-viento': '/img/destinos/san-bernardo.jpg',
  'monitos': '/img/destinos/monitos.jpg',
  'tuchin': '/img/destinos/tuchin.jpg',
  'tierralta': '/img/destinos/tierralta.jpg',
  'valencia': '/img/destinos/tierralta.jpg',
  'ayapel': '/img/destinos/ayapel.jpg',
}

const PLAN_FALLBACKS = [
  '/img/planes/plan-playa-cispata.jpg',
  '/img/planes/plan-rio-sinu.jpg',
  '/img/planes/plan-manglares.jpg',
  '/img/planes/plan-artesania.jpg',
]

export function getDestinoImagen(destino) {
  if (!destino) return '/img/destinos/san-antero.jpg'
  const img = destino.imagen || destino.imagen_url
  if (img && !esImagenDeRelleno(img)) return img

  const id = destino.id || destino._id
  if (id && DESTINO_FALLBACKS[id]) return DESTINO_FALLBACKS[id]

  const slug = (destino.slug || '').toLowerCase()
  if (slug && DESTINO_FALLBACKS[slug]) return DESTINO_FALLBACKS[slug]

  const nombre = (destino.nombre || '').toLowerCase()
  const muni = (destino.municipio || '').toLowerCase()

  if (nombre.includes('monter') || muni.includes('monter')) return '/img/destinos/monteria.jpg'
  if (nombre.includes('lorica') || muni.includes('lorica')) return '/img/destinos/lorica.jpg'
  if (nombre.includes('antero') || muni.includes('antero') || nombre.includes('cispata')) return '/img/destinos/san-antero.jpg'
  if (nombre.includes('bernardo') || muni.includes('bernardo')) return '/img/destinos/san-bernardo.jpg'
  if (nombre.includes('tuch') || muni.includes('tuch')) return '/img/destinos/tuchin.jpg'
  if (nombre.includes('tierra') || muni.includes('tierra') || nombre.includes('paramillo')) return '/img/destinos/tierralta.jpg'
  if (nombre.includes('ayapel') || muni.includes('ayapel')) return '/img/destinos/ayapel.jpg'
  if (nombre.includes('moñito') || muni.includes('moñito') || nombre.includes('monito')) return '/img/destinos/monitos.jpg'

  return '/img/destinos/san-antero.jpg'
}

export function getPlanImagen(plan, index = 0) {
  if (!plan) return PLAN_FALLBACKS[index % PLAN_FALLBACKS.length]
  const portada = (plan.plan_imagenes || []).find((i) => i?.is_primary) || (plan.plan_imagenes || [])[0]
  const img = portada?.url || plan.imagen_url || plan.imagen
  if (img && !esImagenDeRelleno(img)) return img

  const nombre = (plan.nombre || plan.titulo || '').toLowerCase()
  if (nombre.includes('mangle') || nombre.includes('cispata') || nombre.includes('bahia')) return '/img/planes/plan-manglares.jpg'
  if (nombre.includes('sinu') || nombre.includes('río') || nombre.includes('rio')) return '/img/planes/plan-rio-sinu.jpg'
  if (nombre.includes('playa') || nombre.includes('mar') || nombre.includes('costa') || nombre.includes('isla')) return '/img/planes/plan-playa-cispata.jpg'
  if (nombre.includes('artesan') || nombre.includes('zenu') || nombre.includes('sombrero') || nombre.includes('cultur')) return '/img/planes/plan-artesania.jpg'

  const idNum = typeof plan.id === 'number' ? plan.id : index
  return PLAN_FALLBACKS[Math.abs(idNum) % PLAN_FALLBACKS.length]
}
