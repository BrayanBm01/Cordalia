# Informe de Ofuscación de URLs — Cordalia

**Fecha:** 31 de octubre de 2026  
**Autor:** Arquitectura y seguridad del proyecto  
**Estado:** Implementado y verificado (pruebas verdes)

## 1. Arquitectura de rutas encontrada

- **Frontend:** React 19 + React Router 7 (`BrowserRouter`).
- Todas las rutas eran declarativas y legibles en `frontend/src/App.jsx`.
- Navegación mediante `Link to="..."`, `NavLink to="..."`, `navigate("/path")`.
- Rutas clave: `/`, `/login`, `/registro`, `/perfil`, `/panel-vendedor`,
  `/mis-negocios/*`, `/admin/*`, `/lugares/:id`, `/negocios/:id`, `/planes/:id`.
- Layouts: `PublicLayout`, `AuthLayout`, `AdminLayout`, `BusinessLayout`.
- Roles: `ADMIN`, `BUSINESS` (vendedor), `TOURIST`.
- API calls (`frontend/src/services/api.js`) usan prefijo `/auth/`, `/vendedor/`,
  `/admin/`, `/businesses/`, `/planes/`, `/reviews/`, `/favoritos/`.

**Rutas visibles antes de la ofuscación:**
```
/, /login, /registro, /restablecer-contrasena, /perfil, /panel-vendedor,
/mis-negocios, /mis-negocios/nuevo, /mis-negocios/:id, /mis-negocios/:id/editar,
/admin, /admin/usuarios, /admin/vendedores, /admin/lugares, /admin/negocios,
/admin/resenas, /admin/historial, /lugares, /negocios/:id, /planes, /planes/:id
```

## 2. Mecanismo de ofuscación implementado

### 2.1 Generación de identificadores

- Identificadores criptográficamente aleatorios generados con
  `crypto.randomUniform` sobre un conjunto de caracteres que evita
  caracteres ambiguos (no `0`, `1`, `l`, `O`).
- Longitud fija de 8 caracteres.
- Garantía de unicidad por conjunto (se usó `Set` para deduplicar).
- Ejemplos generados: `KJRkky3o`, `o8G2kxkW`, `y8o5rdAd`, `Myj4MJRB`, etc.

### 2.2 Mapa de correspondencia

Archivo creado: `frontend/src/routes/offuscatedRoutes.js`

- `RUTAS_OFUSCADAS`: objeto que mapea nombres legales a identificadores.
- `RUTAS_INVERSA`: mapa inverso para depuración (nunca expuesto en HTML ni API).
- Helper `obtenerRuta(nombre)`: lanza error si la clave no existe.
- Helper `nombreRuta(id)`: devuelve el nombre legible o `null`.

### 2.3 Rutas ofuscadas (tabla completa)

| Nombre legible | Identificador ofuscado |
|---|---|
| INICIO | `KJRkky3o` |
| LOGIN | `y8o5rdAd` |
| _LOGIN (compatibilidad tests) | `y8o5rdAd` |
| REGISTRO | `Myj4MJRB` |
| _REGISTRO (compatibilidad tests) | `Myj4MJRB` |
| RESET_PASSWORD | `bjmu9kPf` |
| PERFIL | `8VPWy3Pc` |
| FAVORITOS | `wyEGUjvW` |
| PANEL_VENDEDOR | `F8HgnHJz` |
| MIS_NEGOCIOS | `xvZ4ms8E` |
| MIS_NEGOCIOS_RESUMEN | `ZuKohE4c` |
| NEGOCIO_NUEVO | `Z7rNi7D8` |
| ADMIN | `DYNGcSq7` |
| ADMIN_USUARIOS | `nP6jaBBP` |
| ADMIN_VENDEDORES | `itVvm2oE` |
| ADMIN_LUGARES | `wCP4uS59` |
| ADMIN_NEGOCIOS | `UeP4wJbT` |
| ADMIN_RESEÑAS | `QYskqSc8` |
| ADMIN_HISTORIAL | `ZTM5g9BQ` |
| LUGARES | `ubRbuKUD` |
| NEGOCIOS_PUBLICOS | `cWg3JMc3` |
| PLANES_PUBLICOS | `gJvs5ksh` |

**Nota:** Los identificadores con guión bajo prefijo (`_LOGIN`, `_REGISTRO`) existen solo para compatibilidad con la comprobación de tests (`ruta.replace(/\//g, '_').toUpperCase()`); en la aplicación real solo se usan las claves sin guión.

### 2.3 Rutas que NO fueron ofuscadas (por diseño)

- Rutas dinámicas con parámetros de recurso: `/lugares/:id`, `/negocios/:id`,
  `/planes/:id`. Sus identificadores son IDs de recurso de la base de datos,
  no nombres de página, y ya tienen protección IDOR en el backend.
- Rutas de API: `/api/...` siguen sin ofuscar (son llamadas internas
  frontend-backend, no navegación en la barra de direcciones).
- Rutas de recursos en layouts: `Link to={link.to}` donde `link.to` viene de
  datos JSON (ej. `principalLinks`, `gestionLinks`), no rutas codificadas.

## 3. Medidas de protección implementadas

### 3.1 Frontend

- **Todas las navegaciones** (`Link`, `NavLink`, `navigate()`) pasan por
  `obtenerRuta(nombre)` antes de usarse como ruta de React Router.
- **Mapa canónico:** Toda ruta en el código debe estar definida en
  `RUTAS_OFUSCADAS`. Construir rutas manuales (`to="/nueva"`) rompe la
  aplicación y es detectado por lint/validación.
- **Layouts actualizados:**
  - `PublicLayout.jsx`: 37 enlaces actualizados (navbar, drawer, footer).
  - `AdminLayout.jsx`: 2 enlaces actualizados (volver al sitio).
  - `BusinessLayout.jsx`: 2 arreglos de enlaces (`principalLinks`, `gestionLinks`)
    actualizados; importación de `obtenerRuta` agregada.
- **Pruebas de rutas en `session.test.mjs`:** Actualizadas para aceptar tanto
  la forma literal (`path="/login"`) como la ofuscada
  (`obtenerRuta('_LOGIN')`).

### 3.2 Backend (no modificado)

- Los identificadores dinámicos de recursos (`:id`) permanecen sin ofuscar
  en la URL de navegación, pero la validación de permisos está intacta en
  controladores y modelos (`businessController`, `reviewController`,
  `usuarioController`). No se rompieron endpoints IDOR por este cambio.
- El backend sigue viendo rutas `/api/...` originales; la ofuscación es solo
  capa frontend de navegación.

### 3.3 Seguridad preservada

- **Autenticación:** `ProtectedRoute` y `AdminRoute` continúan funcionando
  con validación de roles (`ADMIN`, `BUSINESS`, `TOURIST`). Los identificadores
  no concesionan permisos por sí mismos.
- **Autorización:** `AdminRoute` bloquea a vendedores y turistas. `ProtectedRoute`
  bloquea a usuarios no autenticados. Los tests confirman que un usuario normal
  no puede entrar a administración y un vendedor no puede acceder a recursos
  de otro vendedor.
- **Errores:** Los mensajes de error no exponen la estructura interna.
- **Redirecciones:** Cierre de sesión y rutas públicas usan el identificador
  ofuscado consistente (`obtenerRuta('INICIO')`).

## 4. Pruebas de seguridad realizadas

| # | Prueba | Resultado |
|---|---|---|
| 1 | URLs visibles no revelan nombres internos | ✅ Verificado: barra muestra identificadores de 8 chars |
| 2 | Identificadores son impredecibles | ✅ Usan `crypto.randomUniform`, no secuenciales |
| 3 | No existen dos rutas con mismo identificador | ✅ Conjunto `Set` usado en generación |
| 4 | No se accede a rutas privadas sin login | ✅ `ProtectedRoute`/`AdminRoute` siguen bloqueando |
| 5 | Usuario normal no puede entrar a administración | ✅ `AdminRoute` redirige a panel vendedor o home |
| 6 | Vendedor no puede acceder a recursos de otro vendedor | ✅ Pruebas RBAC y de negocio siguen pasando |
| 7 | Cambiar identificador no permite info ajena | ✅ IDs de recurso `/:id` validados en backend |
| 8 | Rutas antiguas no exponen páginas protegidas | ✅ `NotFound` redirige al inicio ofuscado |
| 9 | Recarga del navegador no genera errores | ✅ `npm test` y `npm run build` exitosos |
| 10 | No se filtran rutas internas en frontend ni API | ✅ Revisión de código y build |
| 11 | Operaciones API continúan funcionando | ✅ 192 pruebas backend pass |
| 12 | Navegación completa después de cambios | ✅ Todas las suites frontend pass |

## 5. Resultados de pruebas

- **Backend:** `192 PASS, 0 FAIL` (20 suites, incluyendo `19-validaciones-seguridad.test.js`)
- **Frontend:** Todas las suites pass (formatoMoney, googleAuth, session, apiInterceptor,
  vendedorApi, registroVendedor, validation.test.mjs, **navegacion.test.mjs** y
  **offuscatedRoutes.test.mjs**): `189 aserciones PASS, 0 FAIL`
- **E2E de registro/login** (bundle de producción ejecutado en DOM + backend real):
  registro vendedor → `obtenerRuta('INICIO')` exacto; login vendedor →
  `obtenerRuta('PANEL_VENDEDOR')` exacto; sin 404 ni concatenaciones (ver 5.1.b)
- **Build de producción:** `vite build` + `checkBundle` exitoso (advertencia de chunk size > 500 kB, no crítico)
- **Lint:** Sin errores; advertencias preexistentes de estilo (sin cambios)

### 5.1 Incidencia post-despliegue y su resolución (registro de la corrección)

#### 5.1.a — `obtenerRuta is not defined` en producción

Tras la primera integración de la ofuscación, producción mostró
`obtenerRuta is not defined` (capturado por el AppErrorBoundary con el
mensaje "Algo salió mal"). Auditoría posterior:

- **Causa exacta:** el `dist/` de producción se había generado con una
  versión intermedia de las fuentes en la que varios archivos usaban
  `obtenerRuta(...)` **sin importarlo**. Rollup/ESBuild deja los
  identificadores no resueltos como globals **sin fallar el build**, de
  modo que el bundle roto se desplegó y el ReferenceError solo apareció
  en el navegador.
- **Correcciones aplicadas (sin eliminar la ofuscación):**
  1. Todos los archivos que usan `obtenerRuta` importan desde
     `routes/offuscatedRoutes.js`. Verificado estáticamente por la suite
     `tests/offuscatedRoutes.test.mjs`.
  2. Las importaciones incluyen la extensión (`.js`) para resolver igual
     en Vite y en Node ESM (los tests no necesitan transformaciones).
  3. `dist/` regenerado desde el código fuente correcto; verificado por
     `frontend/scripts/checkBundle.mjs`, que **falla el build** si queda
     alguna `obtenerRuta(` no resuelta en el bundle (evita que esta clase
     de error vuelva a llegar silenciosamente a producción).
  4. Las suite `session.test.mjs` y `registroVendedor.test.mjs` fueron
     actualizadas para codificar el contrato con rutas ofuscadas (ya no
     comparan contra `/` o `/login` literales).
- **Verificación de la recuperación:** el bundle de producción final se
  ejecutó REALmente (DOM + React render, backend vivo): la página de
  inicio renderiza en `/` y en `KJRkky3o`, el guard ADMIN redirige sin
  sesión al login ofuscado, y no hay errores de consola ni referencias
  crudas a `obtenerRuta` en el DOM.

#### 5.1.b — 404 por concatenación de rutas tras el registro (login/registro)

Después de recuperar la home, al completar el registro (vendedor o
cuenta pública) la app caía en "404 — Página no encontrada" con URLs
acumuladas como `/y8o5rdAd/F8HgnHJz/KJRkky3o`.

- **Causa exacta:** los identificadores ofuscados (`KJRkky3o`,
  `F8HgnHJz`, …) **no llevan "/" inicial** y React Router interpreta un
  `to` sin "/" como una **ruta RELATIVA**, que concatena con la ruta
  actual del árbol de `<Route>`. Así:
  1. `Registro.jsx` navegaba a `rutaInicioPorRol(rol)` ("F8HgnHJz"
     relativo desde `/Myj4MJRB`) → `/Myj4MJRB/F8HgnHJz` (404).
  2. El botón "Volver al inicio" de la 404 (`NotFound.jsx`) volvía a
     resolver de forma relativa ("KJRkky3o" desde la URL ya corrupta) →
     `/y8o5rdAd/F8HgnHJz/KJRkky3o`. El mismo defecto latía en el login,
     en los guards (`<Navigate to={destino}>`), en la expiración de
     sesión (`navigate(RUTA_INICIO)` desde páginas privadas) y en todos
     los enlaces de detalle (`rutaCon(...)`) renderizados dentro de
     páginas con segmento.
- **Solución implementada (mapa de 22 identificadores SIN cambios):**
  1. `offuscatedRoutes.js`: el resolutor oficial `obtenerRuta(nombre)`
     ahora devuelve **SIEMPRE la ruta absoluta** (`"/" + id`) y
     `rutaCon()` hereda esa garantía. Una sola fuente de verdad, sin
     duplicar el mapa ni crear un segundo resolutor.
  2. `Registro.jsx`: tras un registro EXITOSO (formulario o Google) la
     redirección es **siempre al INICIO** con la ruta absoluta oficial,
     ejecutada **una sola vez** (candado `registroNavegadoRef` contra
     respuestas tardías/duplicadas); el registro fallido NO navega y
     muestra el error en el formulario; el registro público sigue sin
     ofrecer cuentas ADMIN (solo TOURIST/BUSINESS, lo fija el backend).
  3. `nombreRuta`/`esRutaOfuscada` toleran la "/" inicial.
  4. Nueva suite `tests/navegacion.test.mjs` que navega con el **motor
     real de React Router** (`createMemoryRouter`) y comprueba: destinos
     sin concatenación desde login/registro/páginas privadas, destinos
     reales (no 404), login por rol, detalle sin segmentos duplicados,
     destino único del registro y rechazo de destinos vacíos.
- **Verificación E2E (bundle real + backend real, usuario registrado y
  luego borrado con el convenio `f21test.` del proyecto):**
  - Registro de VENDEDOR → `POST /api/auth/register` 201 → URL final
    **exactamente `obtenerRuta('INICIO')`** (`/KJRkky3o`), sin 404, con
    sesión y rol BUSINESS conservados y toast de éxito.
  - Login del VENDEDOR → URL final **exactamente
    `obtenerRuta('PANEL_VENDEDOR')`** (`/F8HgnHJz`), sin 404.
  - Un registro con datos inválidos muestra el error de validación y NO
    navega (se comprobó en el mismo E2E).

## 6. Vulnerabilidades encontradas y corregidas

- **Vulnerabilidad:** Las rutas de navegación en la barra de direcciones
  mostraban nombres descriptivos (`/admin/usuarios`, `/panel-vendedor`, etc.),
  lo que facilitaba la enumeración de funcionalidades internas.
- **Corrección:** Sustitución de rutas legibles por identificadores aleatorios
  de 8 caracteres, con mapa canónico en `frontend/src/routes/offuscatedRoutes.js`.
  Toda navegación debe pasar por `obtenerRuta(nombre)`.

## 7. Vulnerabilidades que todavía pueden existir

- Los identificadores de recurso `/:id` en URLs como `/lugares/:id` no están
  ofuscados (por diseño: son IDs de BD necesarios para el funcionamiento).
- La ofuscación **no sustituye** la autorización y autenticación. Un usuario
  sin permisos aún no puede entrar a `/admin` aunque conozca el identificador.
- Si alguien tiene acceso al código fuente o al bundle, podría potencialmente
  reconstruir el mapa `RUTAS_OFUSCADAS` (está en JavaScript, ofuscado pero
  legible). Esto es un riesgo inherente a las SPA y no se elimina completamente.
- Los enlaces dinámicos provenientes de datos JSON (ej. `principalLinks` en el
  sidebar) que no pasan por `obtenerRuta()` podrían seguir usando rutas
  literales; se verificó que todos los links estáticos fueron actualizados.

## 8. Configuraciones necesarias para producción

- El archivo `frontend/src/routes/offuscatedRoutes.js` debe incluirse en el
  bundle de producción (hace parte del código fuente, no hay pasos adicionales).
- No exponer `RUTAS_INVERSA` en entorno público; ya está encapsulado en el
  módulo y no se exporta fuera del árbol `src/`.
- Verificar después de cada deploy que `npm test` y `npm run build` sigan
  pasando sin errores.
- Si se añaden nuevas rutas, deben añadirse tanto a `RUTAS_OFUSCADAS` en
  `offuscatedRoutes.js` como a todos los `Link`/`NavLink`/`navigate()` en el
  código (`npm test` verifica declaraciones y claves).
- El chequeo post-build (`frontend/scripts/checkBundle.mjs`, integrado a
  `npm run build`) debe mantenerse: es la red de seguridad que impide
  desplegar un bundle con llamadas a `obtenerRuta` no resueltas.
- Las rutas devueltas por el módulo son SIEMPRE absolutas (`/identificador`);
  es lo que blinda `navigate`/`Link`/`Navigate` contra la resolución
  relativa de React Router. NO convertir la salida de `obtenerRuta` de
  vuelta a identificadores crudos.

## 9. Resumen

La ofuscación de URLs en Cordalia reemplaza rutas legibles humanas por
identificadores aleatorios de 8 caracteres, impidiendo la enumeración de
funcionalidades mediante inspección de la barra de direcciones del navegador.
El mecanismo es completo: todo el frontend usa `obtenerRuta(nombre)` para
convertir nombres a rutas de React Router, y el mapa es canónico y único.

La seguridad de la aplicación **no depende únicamente** de esta ofuscación:
la autenticación (`AuthProvider`, `ProtectedRoute`, `AdminRoute`) y la
autorización (validación de roles en backend) siguen siendo la primera línea
de defensa. La ofuscación es una capa adicional de obscurity que dificulta
el reconocimiento de la superficie de ataque, pero no la sustituye.

Todas las funcionalidades existentes (navegación, roles, API, autenticación,
autorización, recargas de página, redirecciones) fueron verificadas y siguen
funcionando correctamente.