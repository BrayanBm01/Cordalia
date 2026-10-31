# Informe de correcciones — Cordalia

**Fecha:** 31 de octubre de 2026
**Alcance:** auditoría y corrección del backend Express, el frontend React y la base de datos PostgreSQL de la plataforma turística Cordalia.
**Estado:** cambios aplicados en el árbol de trabajo, pruebas ejecutadas y build de producción correcto.

---

## 1. Resumen ejecutivo

Se corrigieron los hallazgos de validación, protección del servidor, reglas de aprobación de negocios, reseñas y calificación con estrellas. Las correcciones se hicieron sobre la arquitectura existente, sin migrar de framework ni reescribir la base de datos.

Resultados verificados:

| Verificación | Resultado |
|---|---|
| Suite backend completa | **192 PASS, 0 FAIL** (20 suites) |
| Nueva suite de validaciones y seguridad | **10 casos, 192 pruebas en total** |
| Suite frontend completa | **PASS** en todas las suites existentes |
| Nueva suite de validación frontend | **76 PASS, 0 FAIL** |
| Build de producción frontend | **Correcto** (solo advertencia de tamaño de chunk) |
| Lint frontend | **Sin errores**, 47 advertencias |
| Migración de índices 022 | Aplicada y verificada en la base local |
| API local | `GET /api/health` → **200** |

Además se eliminaron credenciales de aspecto real del archivo versionado `backend/.env.example` y se dejaron marcadores vacíos. **Si esos valores alguna vez fueron reales, deben rotarse.**

---

## 2. Arquitectura encontrada

No se asumió una arquitectura distinta a la real. La revisión confirmó:

- **Backend:** Node.js + Express 5, CommonJS, PostgreSQL mediante `pg`, autenticación JWT, contraseñas con bcryptjs, `express-rate-limit`, Helmet, CORS y Mercado Pago.
- **Frontend:** React 19, Vite 8, React Router 7, React Hook Form, Zod 4 y Tailwind 4.
- **Base de datos:** PostgreSQL con migraciones SQL numeradas en `database/migrations/`.
- **Pruebas backend:** runner propio en `backend/tests/`; requiere un servidor escuchando en `http://localhost:3000` y la base de datos configurada.
- **Pruebas frontend:** scripts Node sin navegador en `frontend/tests/`.
- **Despliegue documentado:** frontend en Vercel, backend en Render y base de datos en Supabase/PostgreSQL.

La auditoría revisó rutas, controladores, modelos, middlewares, validaciones del frontend y las pruebas existentes antes de modificar nada.

---

## 3. Hallazgos y correcciones

### 3.1 Validación de entrada

Se creó una fuente única de reglas en el backend (`backend/src/utils/validators.js`) y una réplica deliberada en el frontend (`frontend/src/utils/validation.js`). El backend sigue siendo la autoridad final.

| Dato | Regla aplicada | Dónde se aplica |
|---|---|---|
| Nombre de persona | Letras Unicode (tildes, diéresis, ñ), marcas combinadas, espacios simples, guiones y apóstrofos. Entre 2 y 100 caracteres. Rechaza dígitos, vacíos, solo espacios, controles y secuencias inválidas. | Registro, creación/edición administrativa de usuarios, perfil |
| Nombre de negocio | Entre 2 y 200 caracteres, con al menos una letra o número. Puede contener dígitos (“Hotel 5 Estrellas”), pero no ser solo signos/espacios. | Crear/editar negocio y formulario |
| Email | Formato básico, máximo 254 caracteres, sin espacios ni controles, sin puntos consecutivos al inicio/fin. Se normaliza a minúsculas. Duplicado → **409**. | Registro, login, perfil, usuarios admin, email de contacto |
| Contraseña | Mínimo 6 caracteres, máximo 72 **bytes** UTF-8 (límite real de bcrypt), sin caracteres de control. No se recorta. | Registro, login, cambio/recuperación, usuarios admin |
| Teléfono / WhatsApp | Entre 7 y 15 dígitos; admite `+`, espacios, guiones, paréntesis y puntos. | Negocios, perfil, conductores |
| URL | Solo `http`/`https`, con host válido, sin credenciales embebidas. Rechaza `javascript:`, `data:` y `ftp:`. | Web, portada, redes sociales, imágenes |
| Precios | Finitos, no negativos, máximo `99999999.99` (DECIMAL(10,2)), máximo 2 decimales. Rechaza `NaN`, `Infinity`, booleanos, arreglos y texto mal formado. | Negocios y planes |
| Coordenadas | Latitud entre -90 y 90; longitud entre -180 y 180; hasta 7 decimales. | Negocios |
| Fechas | Formato real `YYYY-MM-DD`; valida días existentes y años bisiestos. | Salidas, promociones y fechas de negocio |
| Texto libre | Límites por campo; controles no imprimibles rechazados. En multilínea solo se permiten `\t`, `\n` y `\r`. | Descripciones, reseñas, respuestas, perfil |

Decisiones relevantes:

- Los nombres de persona **no** aceptan dígitos; los nombres comerciales **sí**.
- Los errores devuelven **400** con mensaje claro, en lugar de truncar silenciosamente.
- Los campos numéricos de actualización parcial se comparan contra los valores ya guardados para no dejar rangos de precio inconsistentes.
- La contraseña no se recorta. Se mantiene compatibilidad de lectura con hashes antiguos creados a partir de contraseñas recortadas, sin relajar la política para contraseñas nuevas.

### 3.2 Rate limiting y protección del servidor

Se implementó un middleware configurable (`backend/src/middlewares/rateLimit.js`) y se aplicó a los flujos sensibles:

| Limitador | Identidad | Ventana | Límite por defecto | Variable |
|---|---|---|---|---|
| Global API | IP | 15 min | 5000 | `GLOBAL_RATE_LIMIT_MAX` |
| Login / cambio de contraseña | IP o usuario | 15 min | 30 | `AUTH_RATE_LIMIT_MAX` |
| Registro público | IP | 1 h | 20 | `REGISTER_RATE_LIMIT_MAX` |
| Google | IP | 15 min | 20 | `GOOGLE_RATE_LIMIT_MAX` |
| Recuperación/restablecimiento | IP | 1 h | 10 | `PASSWORD_RESET_RATE_LIMIT_MAX` |
| Escritura de negocios | Usuario | 1 h | 60 | `BUSINESS_WRITE_RATE_LIMIT_MAX` |
| Reseñas | Usuario | 1 h | 20 | `REVIEW_RATE_LIMIT_MAX` |
| Búsquedas/listados | Usuario o IP | 1 min | 120 | `SEARCH_RATE_LIMIT_MAX` |

Comportamiento:

- Las respuestas bloqueadas son **HTTP 429** con `Retry-After` y cuerpo `{ success: false, code: "RATE_LIMITED", message }`.
- La clave es el ID del usuario autenticado cuando existe; si no, la IP normalizada por la librería.
- Los límites se leen de variables de entorno y se pueden ajustar sin tocar código.
- Los listados públicos de negocios, destinos y planes tienen limitador de búsqueda. El resto de `/api` queda cubierto por el limitador global.

Protecciones adicionales del servidor:

- Cuerpo JSON y URL-encoded limitados a **4 MB** (margen para avatares base64).
- Timeouts HTTP: `requestTimeout` 30 s, `headersTimeout` 35 s, `keepAliveTimeout` 5 s.
- Pool PostgreSQL con máximo de conexiones, timeouts de conexión, sentencia y consulta configurables.
- Cierre ordenado ante `SIGTERM`/`SIGINT` y cierre del pool.
- Helmet con CSP, CORS con orígenes normalizados y `trust proxy` solo en producción.
- `JWT_SECRET` obligatorio; en producción se rechaza un secreto de menos de 32 caracteres.
- Manejador de errores que no expone stack traces al cliente.
- Migración **022** con índices compuestos para reseñas, negocios e historial de accesos.

### 3.3 Aprobación de negocios y propiedad

Reglas implementadas y verificadas:

- Un negocio solo puede recibir reseñas si su estado es **`approved`**. La regla se aplica en el backend, no solo en la interfaz.
- Estados `draft`, `pending`, `rejected`, `suspended` e `inactive` rechazan reseñas nuevas con **409**.
- El dueño del negocio **no puede reseñar su propio negocio** (**403**).
- El cambio de estado (`PUT /api/businesses/:id/estado`) está protegido con `requireAdmin`. Ni el dueño, ni otro vendedor, ni un turista pueden aprobar.
- La aprobación conserva el mismo negocio, el mismo `owner_id` y sus datos. No se recrea el registro.
- El `owner_email` solo se devuelve a un ADMIN autenticado; la ficha pública lo elimina.
- El listado y detalle público siguen mostrando únicamente negocios aprobados (o los propios del vendedor/ADMIN según corresponda).

### 3.4 Reseñas y calificación con estrellas

Frontend (`frontend/src/pages/negocios/ResenasSection.jsx`):

- El formulario inicia siempre con **0 estrellas**. El usuario debe elegir explícitamente entre 1 y 5.
- Selector accesible con `role="radiogroup"`, botones `role="radio"`, `aria-checked`, etiquetas “1 estrella”/“N estrellas” y navegación con flechas, Home y End.
- Si se intenta enviar sin calificación, se muestra un error visible con `role="alert"` y no se llama a la API.
- El comentario y la respuesta del negocio están limitados a **2000 caracteres**, con contador y `maxLength`.
- El formulario solo aparece para usuarios autenticados, en negocios aprobados y que no sean el dueño.
- Los negocios no aprobados muestran un aviso; no se ofrece crear reseñas ni se recrea el negocio para habilitarlas.

Backend:

- `rating` se parsea como entero estricto entre 1 y 5. Se rechazan 0, 6, decimales, texto, booleanos, `null` y ausencia del campo con **400**.
- El comentario se valida como texto multilínea de hasta 2000 caracteres; si excede, se rechaza (no se trunca).
- Duplicados: se comprueba la reseña del usuario en **cualquier estado**, no solo `active`, para respetar la restricción `UNIQUE (user_id, business_id)` y evitar un 500. La respuesta es **409**.
- El promedio y la cantidad se calculan en el backend sobre reseñas `active`; se recalculan al crear o editar.
- Editar una reseña también valida el rating y el comentario.
- Las respuestas del negocio solo las puede crear/gestionar el dueño o un ADMIN, con una sola respuesta por reseña.

### 3.5 Consultas, duplicados y consistencia

- Se añadió `database/migrations/022_indices_rendimiento.sql` con índices compuestos para:
  - reseñas por negocio, estado y fecha;
  - negocios aprobados por id;
  - negocios por propietario;
  - negocios por destino y estado;
  - historial de accesos por usuario y fecha.
- La migración es idempotente, solo crea índices y no modifica datos.
- Se verificó su aplicación en la base local y la existencia de los cinco índices.
- Los duplicados de email se manejan tanto en la comprobación previa como en la restricción de base, devolviendo **409**.
- Las operaciones de aprobación y edición conservan los registros existentes.

### 3.6 Credenciales y configuración

- `backend/.env.example` contenía valores con aspecto de credenciales reales de Mercado Pago. Fueron reemplazados por variables vacías y se corrigieron los nombres a los que realmente lee el backend (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`).
- El proveedor de pagos de ejemplo queda en `PAYMENT_PROVIDER=mock` para no sugerir cobros reales por defecto.
- **Acción pendiente recomendada:** rotar esas credenciales en Mercado Pago si alguna vez fueron válidas y revisar el historial de Git, porque el archivo estaba versionado.
- `docs/PRODUCCION.md` documenta las nuevas variables de rate limiting, las migraciones 021/022 y la limitación del almacén en memoria.

---

## 4. Archivos principales modificados

| Área | Archivos |
|---|---|
| Validación backend | `backend/src/utils/validators.js` |
| Rate limiting | `backend/src/middlewares/rateLimit.js` |
| Protección del servidor | `backend/src/app.js`, `backend/src/server.js`, `backend/src/config/db.js`, `backend/src/utils/jwt.js` |
| Autenticación y usuarios | `backend/src/controllers/authController.js`, `backend/src/controllers/usuarioController.js`, `backend/src/routes/authRoutes.js` |
| Negocios | `backend/src/controllers/businessController.js`, `backend/src/routes/businessRoutes.js` |
| Reseñas | `backend/src/controllers/reviewController.js`, `backend/src/models/reviewModel.js`, `backend/src/routes/reviewRoutes.js` |
| Búsquedas/listados | `backend/src/routes/lugaresRoutes.js`, `backend/src/routes/planRoutes.js` |
| Validación frontend | `frontend/src/utils/validation.js` |
| Formularios y perfil | `frontend/src/pages/Login.jsx`, `Registro.jsx`, `Perfil.jsx`, `RestablecerContrasena.jsx` |
| Negocios y reseñas (UI) | `frontend/src/pages/negocios/NegocioForm.jsx`, `NegocioDetalle.jsx`, `ResenasSection.jsx` |
| Pruebas | `backend/tests/19-validaciones-seguridad.test.js`, `frontend/tests/validation.test.mjs`, ajustes de fixtures en suites existentes |
| Base de datos | `database/migrations/022_indices_rendimiento.sql` |
| Configuración y documentación | `backend/.env.example`, `docs/PRODUCCION.md` |

Los cambios están **sin commit** en el árbol de trabajo. No se eliminaron archivos ni se reescribieron módulos completos.

---

## 5. Pruebas y evidencia

### 5.1 Backend

Comando:

```bash
cd backend
npm test
```

Resultado final:

```text
=== Ejecutando 192 pruebas de 20 suites ===
...
Resultado: 192 PASS, 0 FAIL
```

La nueva suite `19-validaciones-seguridad.test.js` cubre:

1. Setup aislado de usuarios de prueba.
2. Validadores unitarios de nombres, emails, contraseñas, enteros, decimales, fechas, teléfonos, URLs y controles.
3. Registro público con normalización, contraseña sin recorte, duplicados y rechazos.
4. Creación administrativa de usuarios con las mismas reglas.
5. Rechazo de precios negativos, no numéricos, con demasiados decimales, fuera de rango e invertidos; aceptación de nombres comerciales con dígitos.
6. Reseñas rechazadas en negocios pendientes/rechazados/suspendidos/inactivos; aprobación exclusiva del ADMIN.
7. Aprobación sin recrear datos y sin filtrar `owner_email` en la ficha pública; bloqueo de auto-reseña del dueño.
8. Rating estricto 1–5, comentario máximo, duplicados 409, promedio recalculado y edición validada.
9. Rate limiter aislado: dos peticiones pasan, la tercera recibe **429** con `Retry-After`.
10. Limpieza de los datos creados por la suite.

La prueba del limitador usa un servidor Express aislado para no agotar los límites de las demás suites. Los límites altos del `.env` local son solo para pruebas repetibles; los valores por defecto de producción están en el código.

### 5.2 Frontend

Comandos:

```bash
cd frontend
npm test
npm run build
```

Resultado:

- Todas las suites existentes pasan.
- La nueva suite `tests/validation.test.mjs` termina con **76 PASS, 0 FAIL**.
- El build de producción transforma 3755 módulos y genera `dist/` correctamente.

Advertencia del build: el chunk principal mide aproximadamente **1.39 MB** (372 KB gzip), por encima del umbral de 500 KB. No impide el despliegue, pero conviene dividir rutas con imports dinámicos en una fase posterior.

### 5.3 Lint

```bash
cd frontend
npm run lint
```

Resultado: **sin errores**, 47 advertencias. Incluyen advertencias preexistentes de React (`set-state-in-effect`, librerías no memoizables), variables no usadas y dos avisos intencionales por las expresiones regulares que detectan caracteres de control. No se silenciaron para no ocultar deuda técnica.

### 5.4 Base de datos y API

- Migración 022 aplicada en local.
- Verificados los índices `idx_reviews_business_estado_fecha`, `idx_businesses_estado_id`, `idx_businesses_owner_id`, `idx_businesses_destination_estado_id` e `idx_login_usuario_fecha`.
- `GET http://localhost:3000/api/health` → **200**.

---

## 6. Limitaciones y riesgos residuales

Estas limitaciones se documentan de forma explícita; no se ocultaron fallos ni se presentaron resultados no verificados.

1. **Rate limiting en memoria.** Los límites son exactos con una sola instancia del backend, que es el despliegue documentado. Con varias réplicas, cada proceso lleva su propia cuenta y el límite efectivo se multiplica. Para escalar horizontalmente hace falta un store compartido (Redis o PostgreSQL).
2. **Pruebas backend dependientes de un servidor externo.** La suite no inicia el servidor ni la base de datos: requiere que estén disponibles en `localhost:3000` y que existan las variables de entorno de prueba. No es una suite autocontenida.
3. **Límites locales altos.** El `.env` local se ajustó para que las pruebas repetidas no choquen con el rate limiting. Esos valores no se versionan y no deben copiarse a producción; los valores seguros por defecto están en el código.
4. **JWT local corto.** El secreto local tiene menos de 32 caracteres y el arranque solo advierte en desarrollo. En producción el backend rechaza secretos cortos, pero el entorno local no representa esa configuración.
5. **Sin pruebas E2E de navegador.** El selector de estrellas se implementó con semántica ARIA y navegación por teclado, pero no se ejecutó una prueba automatizada en navegador real. Se verificó por revisión de código, lint y build.
6. **Pagos no verificados contra un proveedor real.** El flujo probado usa el proveedor simulado (`mock`). No se ejecutaron cobros reales ni se verificó la integración completa con Mercado Pago. La webhook tiene verificación de firma, pero no forma parte de las pruebas dinámicas de esta auditoría.
7. **Correo en modo desarrollo.** El flujo de recuperación se probó con el servicio de correo local (registro en log). No se verificó la entrega real mediante un proveedor externo.
8. **Migraciones pendientes en producción.** La 022 se aplicó en local; en producción debe ejecutarse manualmente y revisarse antes. La 021 también queda documentada. El orden recomendado es migraciones → reinicio del backend → frontend.
9. **Cambios sin commit.** Todo el trabajo está en el árbol de trabajo. Antes de desplegar conviene revisar el diff, hacer commit y ejecutar la suite en el entorno de destino.
10. **Tamaño del bundle y advertencias de lint.** No bloquean el build, pero son deuda técnica que conviene atender por separado.
11. **Rotación de credenciales.** Los valores con aspecto de credenciales que estaban en `backend/.env.example` deben rotarse si fueron reales. Este informe no reproduce esos valores.

---

## 7. Checklist de despliegue

1. Revisar el diff completo y confirmar que no se incluyen secretos.
2. Rotar las credenciales de Mercado Pago que hayan estado expuestas y actualizar el entorno real.
3. Configurar en Render las variables de rate limiting documentadas (o aceptar los valores por defecto).
4. Verificar `JWT_SECRET` con al menos 32 caracteres y `NODE_ENV=production`.
5. Aplicar las migraciones pendientes, en orden:
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/018_inscripcion_gratuita.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/019_prueba_gratuita_suscripciones.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/020_password_reset_tokens.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/021_restaurar_catalogo_cordoba.sql
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/migrations/022_indices_rendimiento.sql
   ```
6. Reiniciar el backend y comprobar `/api/health` y el log de verificación de esquema.
7. Ejecutar `npm test` en backend y frontend contra el entorno de destino.
8. Ejecutar `npm run build` en frontend y desplegar.
9. Probar manualmente: registro, login, recuperación, creación de negocio, aprobación por ADMIN, reseña en negocio aprobado y rechazo en negocio pendiente.

---

## 8. Conclusión

Las correcciones cubren los puntos auditados: validación consistente en frontend y backend, límites de peticiones con respuesta 429, protección básica del servidor, aprobación exclusiva por ADMIN, reseñas solo en negocios aprobados, bloqueo de auto-reseñas, calificación inicial en cero con selector accesible y validación estricta de 1 a 5.

La evidencia de ejecución es verificable: **192 pruebas backend y 76 comprobaciones de la nueva suite frontend, todas en verde**, build de producción correcto y migración de índices aplicada en local. Las limitaciones restantes están identificadas y no impiden el uso actual, pero deben considerarse antes de escalar horizontalmente, integrar pagos reales o desplegar en producción.
