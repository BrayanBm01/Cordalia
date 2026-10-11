# SHARED_CONTEXT — Contexto Compartido de Cordalia

## Proyecto
**Cordalia** — Plataforma turística enfocada en **Córdoba, Colombia**.

## Estado del proyecto (2026-09-17)

### Base de datos (turismo_db — PostgreSQL)
Migraciones aplicadas: 001 → 017

#### Tablas principales
| Tabla | Estado | Notas |
|-------|--------|-------|
| `usuarios` | ✅ Completo | Tiene columna `pais` (se oculta en frontend, no eliminar) |
| `lugares` | ✅ Completo | Destinos de Córdoba sembrados |
| `businesses` | ✅ Completo | Negocios turísticos |
| `tour_plans` | ✅ Completo | **`precio` = precio normal permanente** (columna `precio_anterior` ELIMINADA en 017) |
| `tour_plan_salidas` | ✅ Completo | Fechas de salida con cupo |
| `inscripciones` | ✅ Completo | Estados: pendiente/pagada/fallida/cancelada/expirada/**vencida**; vencida = pagada cuyo viaje ya ocurrió (no libera cupo) |
| `promotions` | ✅ Completo | Descuento temporal (`porcentaje` o `valor` COP) sobre `tour_plans.precio`; vigencia = `CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin` (backend); columnas `precio_anterior`/`precio_promocional` ELIMINADAS en 017; **sin promos activas solapadas por plan** |
| `vehiculos` / `conductores` / `transportes` | ✅ Completo | Logística |
| `reviews` | ✅ Completo | Reseñas |
| `favorite_destinos` / `favorite_negocios` | ✅ Completo | Favoritos |
| `actividades` / `puntos_interes` | ✅ Completo (015) | Catálogos reutilizables por destino |
| `destino_actividades` / `destino_puntos_interes` | ✅ Completo (015) | Asignaciones con orden por destino |
| `destino_info_viaje` | ✅ Completo (015) | Info de viaje + costos + moneda (comparación de presupuesto) |

#### Migración 017 — "Precio anterior" eliminado (promociones)
- DROP `tour_plans.precio_anterior`, `promotions.precio_anterior`, `promotions.precio_promocional`.
- Índice `idx_promotions_plan_estado_fechas (plan_id, estado, fecha_inicio, fecha_fin)` para vigencia/solapamientos.
- Seeds 008/009 actualizadas (sin las columnas).
- Backend rechaza (400) cualquier payload con esos campos legado.
- `PromotionModel.hasActiveOverlap(planId, fechaInicio, fechaFin, excludeId)` impide promos activas solapadas del mismo plan (crear/editar/activar).

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
- `frontend/src/data/destinos.js` → **eliminado** en la fase 09/09/2026; estaba keyeado por IDs antiguos de Colombia (1=Cartagena) y causaba un mismatch con la DB Córdoba (id 1=Montería).
- `LugarDetalle.jsx` consume la API (`lugar.imagen`, `lugar.descripcion`) y genera los relacionados con `lugaresAPI.getAll()` priorizando mismo `municipio`/`tipo`.
- Contenido dinámico de destinos (Qué hacer / Qué visitar / Info de viaje / Comparación de presupuesto) se gestiona vía endpoints de `lugaresAPI.contenido` / `lugaresAPI.presupuesto`.

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

## Tests (backend, `npm test` → 119 PASS / 0 FAIL)
```
Planes: crear, editar, eliminar, consultar, autorización, promos válidas, rechazo de campos legado,
  bloqueo de promos activas solapadas, desactivar/activar (06-planes.test.js)
Inscripciones: crear, usuario correcto/incorrecto, plan vencido
Pagos: exitoso, fallido, pendiente, confirmación, falsificación, recálculo de promo vencida al pagar, viaje pagado ya ocurrido (vencida)
Precio: % sobre el precio normal (132.000 × 24% = 100.320, no 100.000), tercer caso, ocupación (10-precio.test.js)
Vigencia de promos (13-promos-vigencia.test.js): 10 casos — sin promo $100.000 / activa 20% $80.000 /
  vencida $100.000 / antes $100.000 / durante $80.000 / después $100.000 / nueva 30% $70.000 (y al vencer $100.000) /
  pago durante $80.000 / pago después $100.000 / cliente manipula precio → ignorado
Perfil: preferencias, recomendaciones
Seguridad: IDOR, autorización, acceso entre usuarios/negocios
Contenido destinos (12-contenido-destinos.test.js): endpoints públicos, RBAC, CRUD catálogos,
  asignaciones con orden, upsert info de viaje (round-trip de texto y costos), validaciones de negocio
```

## Temas abiertos / pendientes
- Recomendaciones (endpoint `GET /api/recomendaciones` + UI).
- MercadoPago real (hoy `mock`).
- Migración 017 debe aplicarse también en producción antes del despliegue.
