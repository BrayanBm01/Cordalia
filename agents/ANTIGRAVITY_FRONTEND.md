# ANTIGRAVITY — Frontend de Cordalia

## Rol
Antigravity es el agente responsable del **frontend** de Cordalia.

## Stack
- React 19
- Vite
- Tailwind CSS v4
- Framer Motion (animaciones)
- Lucide React (iconos)
- Recharts (gráficas)
- React Router DOM v7
- Sonner (notificaciones toast)

## Estructura de archivos
```
frontend/src/
├── App.jsx                     ← Rutas principales
├── main.jsx                    ← Entry point
├── index.css                   ← Tema Tailwind (colores, fuentes)
├── context/AuthContext.jsx     ← Estado de autenticación global
├── services/api.js             ← Cliente HTTP (fetch wrapper)
├── layouts/                    ← Layouts de página
│   ├── PublicLayout.jsx        ← Navbar + Footer público
│   ├── AdminLayout.jsx         ← Sidebar admin
│   ├── BusinessLayout.jsx      ← Sidebar panel de negocios
│   └── AuthLayout.jsx          ← Layout login/registro
├── pages/                      ← Páginas de la app
│   ├── Home.jsx
│   ├── Perfil.jsx
│   ├── admin/                  ← Dashboard admin
│   ├── negocios/               ← Panel de negocios
│   └── planes/                 ← Planes turísticos
├── components/                 ← Componentes reutilizables
└── data/destinos.js            ← Datos ESTÁTICOS de destinos (44KB)
                                   ← Mantener como fallback
```

## Decisiones de diseño ya implementadas

- **Paleta principal**: `primary-*` (verde), `ocean-*` (azul), `dark-*` (gris), `sand-*` (arena)
- **Fuente display**: `var(--font-display)` para títulos
- **Tailwind v4**: usar clases utilitarias, no CSS custom salvo necesidad
- **Recharts**: librería de gráficas — NO reemplazar
- **Framer Motion**: para animaciones de entrada — mantener patrón `fadeUp` + `staggerContainer`

## Cambios implementados por Antigravity (session actual)

### Marca
- "Explora Turismo" → "Cordalia" en toda la UI
- Menú: eliminados "Experiencias" y "Explorar" (duplicado)
- Footer: eliminada frase "Hecho con amor en Colombia"
- Home: enfocado en Córdoba, no en Colombia genérico

### Responsive — Panel de negocios
- BusinessLayout: sin overflow horizontal
- NegocioDetalle, PlanesNegocio, SalidasPanel, TransportePanel, PlanForm: responsive completo
- Tablas → cards en móvil

### Dashboard Admin
- Gráfica "Planes por Destino": YAxis width dinámico según longitud de nombres
- Misma corrección para "Negocios por Destino" y "Negocios por Categoría"

### Perfil
- Eliminado campo "País" del formulario y estado del form
- La columna `pais` sigue en BD (no se eliminó, solo se ocultó)

## APIs que uso actualmente

Ver `services/api.js` para la lista completa. Los endpoints principales:
- `lugaresAPI` → `/api/lugares`
- `businessesAPI` → `/api/businesses`
- `businessPlanesAPI` → `/api/businesses/:id/planes`
- `planesAPI` → `/api/planes`
- `authAPI` → `/api/auth`
- `adminAPI` → `/api/admin`

## APIs que necesito de OpenCode

Ver `OPENCODE_BACKEND.md` sección "APIs pendientes que Antigravity necesita".

Cuando OpenCode implemente un endpoint, Antigravity:
1. Agrega el endpoint a `services/api.js`
2. Actualiza el componente correspondiente para usar datos reales
3. Elimina datos mock si los hay

## Validación

```bash
cd frontend
npx oxlint src        # debe pasar sin errores
npx vite build        # build exitoso
```
