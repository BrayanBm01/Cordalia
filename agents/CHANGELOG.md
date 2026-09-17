# CHANGELOG — Cordalia

## Formato
```
## [FECHA] [AGENTE] — [PRIORIDAD: descripción breve]
### Cambios
- archivo → qué se hizo
### Dependencias
- Frontend necesita: ...
- Backend necesita: ...
```

---

## [2026-09-12] ANTIGRAVITY — PRIORIDAD 1: Sistema de agentes

### Cambios
- `agents/README.md` → Creado. Documenta propósito, reglas y formato de coordinación
- `agents/OPENCODE_BACKEND.md` → Creado. APIs pendientes, migraciones y reglas de seguridad para OpenCode
- `agents/ANTIGRAVITY_FRONTEND.md` → Creado. Stack, estructura, decisiones de diseño y APIs necesarias
- `agents/SHARED_CONTEXT.md` → Creado. Estado actual de BD, dependencias entre agentes, roles, URLs
- `agents/CHANGELOG.md` → Creado. Este archivo

### Dependencias generadas
- **Backend necesita**: crear migraciones 014, 015, 016 (ver OPENCODE_BACKEND.md)
- **Backend necesita**: implementar endpoints de mis-inscripciones, comprobante, pago, recomendaciones, actividades de destino

---

## [2026-09-12] ANTIGRAVITY — PRIORIDAD 4: Cambio de marca a Cordalia

### Cambios
- `frontend/src/layouts/PublicLayout.jsx` → "Explora Turismo" → "Cordalia"; eliminado "Experiencias" y "Explorar" del menú; eliminado "Hecho con amor en Colombia" del footer; descripción del footer enfocada en Córdoba
- `frontend/src/layouts/AdminLayout.jsx` → "Explora Turismo" → "Cordalia"
- `frontend/src/layouts/BusinessLayout.jsx` → "Explora Turismo" → "Cordalia"
- `frontend/src/pages/Home.jsx` → Rebranding completo: enfoque en Córdoba; sección "¿Por qué Córdoba?"; "Sobre Cordalia"; estadísticas actualizadas; copywriting nuevo
- `frontend/index.html` → Título y meta descripción actualizados a Cordalia y Córdoba
- `frontend/src/pages/Login.jsx` → Branding Cordalia y textos de bienvenida para Córdoba
- `frontend/src/pages/Registro.jsx` → Branding Cordalia y copywriting enfocado en Córdoba
- `frontend/src/pages/negocios/planUtils.js` → Mensaje de WhatsApp actualizado a Cordalia
- `frontend/src/pages/negocios/ResumenNegocios.jsx`, `MisNegocios.jsx`, `NegociosPublicos.jsx` → Mensajes vacíos y subtítulos actualizados a Cordalia

### Dependencias generadas
- Ninguna nueva

---

## [2026-09-12] ANTIGRAVITY — PRIORIDAD 3: Gráfica AdminDashboard

### Cambios
- `frontend/src/pages/admin/AdminDashboard.jsx` → Gráfica "Planes por Destino" con YAxis width dinámico (7px por carácter, máx 180px); misma corrección para "Negocios por Destino" y "Negocios por Categoría"; altura dinámica según cantidad de ítems para evitar solapamiento

### Dependencias generadas
- Ninguna nueva

---

## [2026-09-12] ANTIGRAVITY — PRIORIDAD 2: Panel de negocios responsive

### Cambios
- `frontend/src/layouts/BusinessLayout.jsx` → sidebar y drawer sin overflow; contenido ajustado
- `frontend/src/pages/negocios/NegocioDetalle.jsx` → tablas de servicios/horarios → cards en móvil; formularios reorganizados
- `frontend/src/pages/negocios/PlanesNegocio.jsx` → lista de planes responsive; tabla → cards en móvil
- `frontend/src/pages/negocios/ResumenNegocios.jsx` → grid de estadísticas responsive
- `frontend/src/pages/negocios/SalidasPanel.jsx` → panel responsive
- `frontend/src/pages/negocios/TransportePanel.jsx` → panel responsive
- `frontend/src/pages/negocios/PlanForm.jsx` → formulario responsive

### Dependencias generadas
- Ninguna nueva

---

## [2026-09-12] ANTIGRAVITY — PRIORIDAD 5: Perfil sin País

### Cambios
- `frontend/src/pages/Perfil.jsx` → eliminado campo `pais` del formulario y estado; la columna en BD no se eliminó

### Notas
- La columna `pais` sigue existiendo en la base de datos
- OpenCode puede opcionalmente crear migración DROP COLUMN si decide eliminarla definitivamente

---

## [2026-09-12] OPENCODE y ANTIGRAVITY — PRIORIDAD 6: Sistema de pagos

### Cambios Backend (OpenCode)
- `backend/src/models/inscripcionModel.js` → Modelo actualizado para pagos.
- `backend/src/controllers/inscripcionController.js` → Controladores y rutas creadas para pagos y webhooks.
- `backend/src/services/paymentService.js` → Servicio mock de MercadoPago listo.
- `backend/server.js` → Job de vencimiento agregado.
- Creada y aplicada migración 014.
- Tests completos pasados.

### Cambios Frontend (Antigravity)
- `frontend/src/services/api.js` → API de inscripciones actualizada (mis-inscripciones, pagar, comprobante).
- `frontend/src/pages/planes/PlanDetalle.jsx` → UI de botón "Pagar" añadida, simulación y estado tras pago.
- `frontend/src/pages/Perfil.jsx` → Sección "Mis inscripciones" agregada con historial (pendientes, pagadas).
- `frontend/src/pages/negocios/SalidasPanel.jsx` → Compatible con estados de pago de inscripciones.

### Dependencias
- Integración de MercadoPago real (configurar variables en `.env`).

---

## [2026-09-13] OPENCODE — PRIORIDAD ALTA: Contenido dinámico de destinos + formulario de negocios

### Cambios Backend
- `database/migrations/015_contenido_destinos.sql` → Creada y aplicada. 5 tablas: `actividades`, `puntos_interes`, `destino_actividades`, `destino_puntos_interes`, `destino_info_viaje` + seeds (16 actividades, 24 puntos, 51 asignaciones de actividades, 36 de puntos, 16 `info_viaje`)
- `backend/src/models/destinoContenidoModel.js` → Modelo nuevo (catálogos, asignaciones con orden, info de viaje upsert)
- `backend/src/controllers/destinoContenidoController.js` → Controlador nuevo (contenido público, presupuesto real, CRUD admin, asignación, info de viaje)
- `backend/src/routes/destinoContenidoRoutes.js` → Rutas nuevas (catálogos en `/api/contenido`, gestión por destino en `/api/lugares/:id/administrar` con `mergeParams`)
- `backend/src/routes/lugaresRoutes.js` → Rutas públicas `GET /api/lugares/:id/contenido` y `GET /api/lugares/:id/presupuesto`
- `backend/src/controllers/businessController.js` → Whitelist de monedas (COP/USD/EUR/MXN/PEN) y reglas por categoría: categorías sin rango no aceptan precios; precios opcionales en categorías con rango (valida orden mín≤máx). Fix: la validación de update usa la categoría actual del negocio
- `backend/tests/12-contenido-destinos.test.js` → Suite nueva (public endpoints, RBAC, CRUD catálogos, asignaciones, upsert info de viaje, validaciones de negocio). Total: 111 PASS / 0 FAIL

### Cambios Frontend
- `frontend/src/services/api.js` → `lugaresAPI.contenido`, `.presupuesto`, `.administrar`, asignaciones y `contenidoAPI` (CRUD catálogos)
- `frontend/src/pages/admin/DestinoContenidoManager.jsx` → Modal admin nuevo (asignar/reordenar/desasignar actividades y puntos, creación en catálogo, info de viaje con moneda y costos)
- `frontend/src/pages/admin/AdminDestinos.jsx` → Botón "Contenido" (Compass) por fila + modal
- `frontend/src/pages/LugarDetalle.jsx` → Secciones "Qué hacer", "Qué visitar" e "Información para tu viaje" ahora con datos del API (con fallback a `data/destinos.js` para hero/gallery/overview) y nueva sección "¿Por tu cuenta o con planes?" (comparación de presupuesto con planes reales)
- `frontend/src/pages/negocios/NegocioForm.jsx` → Moneda como select (COP/USD/EUR/MXN/PEN); campos de precio mínimo/máximo condicionales según categoría (obligatorios en categorías con rango, ocultos en las demás y nunca enviados)

### Dependencias generadas
- Frontend necesita: endpoints de contenido/presupuesto (ya implementados)
- Backend necesita: nada nuevo

---

## [PENDIENTE] OPENCODE — Migraciones de información de destinos
Ver `OPENCODE_BACKEND.md` para detalles.
