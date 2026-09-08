import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * ScrollToTop
 * -------
 * Comportamiento global de navegacion: cada vez que cambia la ruta,
 * la nueva pagina comienza desde arriba.
 *
 * Detecta los cambios de ruta con useLocation (funciona con clics,
 * boton atras/adelante del navegador y recarga F5) y resetea el scroll
 * del contenedor principal que efectivamente contiene el scroll:
 *   - window (layouts Publico, Business y Auth: <main className="flex-1">)
 *   - el <main> con overflow-y-auto interno (layout Admin)
 *
 * No interfiere con los scrolls internos de tablas, modales, dropdowns
 * ni paneles, porque esos son contenedores descendientes y no se tocan.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Prioriza "nueva vista arriba" tambien con atras/adelante del navegador.
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    // 1) Scrolls basados en la ventana (layouts Publico / Business / Auth).
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    // 2) Contenedor principal con scroll interno (layout Admin: <main overflow-y-auto>).
    requestAnimationFrame(() => {
      const mains = document.querySelectorAll('main')
      mains.forEach((main) => {
        const style = window.getComputedStyle(main)
        if (/(scroll|auto|overlay)/.test(style.overflowY)) {
          main.scrollTop = 0
        }
      })
    })
  }, [pathname])

  return null
}
