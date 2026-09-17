# SHARED_CONTEXT — Contexto Compartido de Cordalia

## Proyecto
**Cordalia** — Plataforma turística enfocada en **Córdoba, Colombia**.

## Estado del proyecto (2026-09-13)

### Base de datos (turismo_db — PostgreSQL)
Migraciones aplicadas: 001 → 015

#### Tablas principales
| Tabla | Estado | Notas |
|-------|--------|-------|
| `usuarios` | ✅ Completo | Tiene columna `pais` (se oculta en frontend, no eliminar) |
| `lugares` | ✅ Completo | Destinos de Córdoba sembrados |
| `businesses` | ✅ Completo | Negocios turísticos |
| `tour_plans` | ✅ Completo | Planes turísticos |
| `tour_plan_salidas` | ✅ Completo | Fechas de salida con cupo |
| `inscripciones` | ✅ Completo | Sistema de estados ('pagada', 'pendiente', etc.) implementado |
| `promotions` | ✅ Completo | Informativo |
| `vehiculos` / `conductores` / `transportes` | ✅ Completo | Logística |
| `reviews` | ✅ Completo | Reseñas |
| `favorite_destinos` / `favorite_negocios` | ✅ Completo | Favoritos |
| `actividades` / `puntos_interes` | ✅ Completo (015) | Catálogos reutilizables por destino |
| `destino_actividades` / `destino_puntos_interes` | ✅ Completo (015) | Asignaciones con orden por destino |
| `destino_info_viaje` | ✅ Completo (015) | Info de viaje + costos + moneda (comparación de presupuesto) |

#### Catálogos de contenido (migración 015)
- **actividades**: 16 ítems (naturaleza, cultura, gastronomía, deportes, playa...) con imagen, categoría y `activo`
- **puntos_interes**: 24 ítems (playas, ríos, parques, museos, plazas...) con tipo y `activo`
- **asignaciones**: 51 `destino_actividades` + 36 `destino_puntos_interes`, con campo `orden`
- **destino_info_viaje**: 16 filas (una por destino) con transporte, alimentación, alojamiento, costos y moneda (COP/USD/EUR/MXN/PEN)

### Validaciones de negocios (businessController)
- Monedas permitidas: **COP, USD, EUR, MXN, PEN** (whitelist; se rechaza cualquier otra)
- Categorías con rango de precios muestran `precio_min`/`precio_max` (precios opcionales)
- Categorías sin rango (Bar, Cafe, Tienda, Transporte, Otro) rechazan precios
- Sugerir no re-ejecutar la migración 015 completa: los catálogos tienen UNIQUE por nombre (los datos ya están aplicados)

### Sistema de pagos
- **Estado**: ✅ Implementado (Backend API, UI frontend, y Base de datos actualizados).
- **Proveedor elegido**: MercadoPago (Mock / Sandbox actual).
- **Credenciales**: pendientes de configurar para producción.
- **Acción Pendiente**: Documentar en `.env.example` y probar real.

### Información estática de destinos
- `frontend/src/data/destinos.js` (44KB) → datos detallados hardcodeados
- **Plan**: se usa solo como fallback visual (hero, galería, overview, tagline)
- `LugarDetalle.jsx` ahora consume: `GET /api/lugares/:id/contenido` (Qué hacer, Qué visitar, Info de viaje) y `GET /api/lugares/:id/presupuesto` (comparación por tu cuenta vs planes)

## Dependencias activas

### Frontend necesita de Backend
| Feature | Endpoint | Estado |
|---------|----------|--------|
| Contenido público de destino | GET /api/lugares/:id/contenido | ✅ Implementado |
| Información de viaje de destino | GET /api/lugares/:id/presupuesto | ✅ Implementado |
| Gestión admin de contenido | GET/POST/PUT/DELETE /api/contenido/actividades y /puntos + /api/lugares/:id/administrar/* | ✅ Implementado |
| Recomendaciones | GET /api/recomendaciones | ⏳ Pendiente |

### Backend necesita de Frontend
| Acción | Estado |
|--------|--------|
| URLs de retorno para MercadoPago | URL: `/planes/:id/comprobante` — ✅ Implementado |

## Roles en la aplicación
| rol_id | Nombre | Acceso |
|--------|--------|--------|
| 0 (ADMIN) | Administrador | Panel admin completo |
| 1 (TOURIST) | Turista | Ver + inscribirse en planes |
| 2 (BUSINESS) | Propietario de negocio | Panel de negocios |

## URLs clave del frontend
| Ruta | Componente |
|------|-----------|
| `/` | Home.jsx |
| `/lugares` | Lugares.jsx |
| `/lugares/:id` | LugarDetalle.jsx |
| `/negocios` | NegociosPublicos.jsx |
| `/negocios/:id` | NegocioDetalle.jsx |
| `/planes` | PlanesPublicos.jsx |
| `/planes/:id` | PlanDetalle.jsx |
| `/perfil` | Perfil.jsx |
| `/admin` | AdminDashboard.jsx |
| `/mis-negocios` | MisNegocios.jsx |

## API Base URL
- Desarrollo: `http://localhost:3000` (proxy Vite en `/api`)
- El frontend usa `/api/*` que Vite redirige al backend

## Tests (backend, `npm test` → 111 PASS / 0 FAIL)
```
Planes: crear, editar, eliminar, consultar, autorización
Inscripciones: crear, usuario correcto/incorrecto, plan vencido
Pagos: exitoso, fallido, pendiente, confirmación, falsificación
Perfil: preferencias, recomendaciones
Seguridad: IDOR, autorización, acceso entre usuarios/negocios
Contenido destinos (12-contenido-destinos.test.js): endpoints públicos, RBAC, CRUD catálogos,
  asignaciones con orden, upsert info de viaje (round-trip de texto y costos), validaciones de negocio
```
