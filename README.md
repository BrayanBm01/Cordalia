# Explora Turismo

Plataforma web para descubrir los mejores destinos turisticos de Colombia. Permite a los usuarios explorar destinos, buscar por nombre, ver detalles completos (actividades, puntos turisticos, gastronomia) y gestionar su perfil. Incluye un panel de administracion para gestionar usuarios, lugares y monitorear actividad del sistema.

## Funcionalidades

### Usuarios

- Registro con nombre, email y contrasena
- Inicio de sesion con JWT
- Cierre de sesion
- Perfil: ver y editar datos personales
- Sesion unica: solo una sesion activa por usuario

### Destinos

- Listado de 12 destinos turisticos colombianos
- Busqueda por nombre
- Paginacion
- Vista detallada de cada destino:
  - Descripcion general
  - Galeria de imagenes
  - Actividades disponibles
  - Puntos turisticos
  - Gastronomia y restaurantes
  - Zonas del destino
  - Consejos praticos (mejor epoca, como llegar, duracion, presupuesto)
  - Destinos relacionados

### Administrador

- Dashboard con estadisticas (usuarios, lugares, logins exitosos/fallidos)
- Gestion de usuarios: crear, editar, eliminar, ver sesion activa, revocar sesion
- Gestion de lugares: crear, editar, eliminar
- Historial de intentos de acceso
- Sistema de notificaciones con historial de logins

## Tecnologias

### Frontend

- React 19
- Vite
- Tailwind CSS v4
- Framer Motion (animaciones)
- Lucide React (iconografia)
- Recharts (graficos en dashboard)
- React Hook Form + Zod (formularios y validacion)
- Sonner (notificaciones toast)
- React Router DOM (enrutamiento)

### Backend

- Node.js
- Express 5
- PostgreSQL
- JSON Web Token (JWT)
- bcryptjs (hash de contrasenas)
- pg (cliente PostgreSQL)
- dotenv (variables de entorno)
- CORS

### Base de datos

- PostgreSQL

## Arquitectura

```
Frontend (React + Vite, puerto 5173)
        |
        |  HTTP (proxy /api -> localhost:3000)
        v
Backend (Express, puerto 3000)
        |
        |  SQL parametrizado
        v
PostgreSQL (turismo_db)
```

- **Frontend**: SPA construida con React, se comunica con el backend a traves de una API REST. En desarrollo, Vite actua como proxy redirigiendo `/api/*` al backend.
- **Backend**: API REST con Express. Autenticacion basada en JWT con sistema de sesion unica. Middleware para proteccion de rutas y control de roles.
- **Base de datos**: PostgreSQL con tres tablas principales: `usuarios`, `lugares` e `login` (historial de accesos).

## Estructura del proyecto

```
Explora-Turismo/
├── README.md
├── MANUAL_USUARIO.md
├── package.json                    # Scripts globales (concurrently)
├── .gitignore
│
├── backend/
│   ├── .env                        # Variables de entorno (no versionado)
│   ├── .env.example                # Plantilla de variables
│   ├── package.json
│   ├── setup-admin.js              # Script: crear usuario admin
│   ├── revoke-session.js           # Script: recuperar sesion admin
│   └── src/
│       ├── app.js                  # Configuracion Express (CORS, rutas)
│       ├── server.js               # Inicio del servidor
│       ├── config/
│       │   └── db.js               # Conexion PostgreSQL
│       ├── controllers/
│       │   ├── authController.js   # Register, login, logout, perfil
│       │   ├── adminController.js  # Stats, historial de login
│       │   ├── lugaresController.js# CRUD de lugares
│       │   └── usuarioController.js# CRUD de usuarios + revocar sesion
│       ├── middlewares/
│       │   ├── authMiddleware.js   # Verifica JWT y token_activo
│       │   ├── adminMiddleware.js  # Verifica rol de administrador
│       │   └── errorHandler.js     # Manejo centralizado de errores
│       ├── models/
│       │   ├── loginModel.js       # Consultas historial de login
│       │   ├── lugarModel.js       # Consultas de lugares
│       │   └── usuarioModel.js     # Consultas de usuarios
│       ├── routes/
│       │   ├── authRoutes.js       # /api/auth/*
│       │   ├── adminRoutes.js      # /api/admin/*
│       │   ├── lugaresRoutes.js    # /api/lugares/*
│       │   └── usuarioRoutes.js    # /api/usuarios/*
│       └── utils/
│           ├── jwt.js              # Firmar y verificar tokens
│           ├── password.js         # Hash y comparacion de contrasenas
│           └── validators.js       # Validaciones de entrada
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                 # Rutas de la aplicacion
│       ├── index.css               # Tema Tailwind (colores, fuentes)
│       ├── assets/
│       │   └── (hero image)
│       ├── components/
│       │   ├── AdminRoute.jsx      # Ruta protegida para admin
│       │   ├── ConfirmModal.jsx    # Modal de confirmacion
│       │   ├── EmptyState.jsx      # Estado vacio generico
│       │   ├── LoadingSpinner.jsx  # Indicador de carga
│       │   ├── Modal.jsx           # Modal generico
│       │   └── ProtectedRoute.jsx  # Ruta protegida para usuarios
│       ├── context/
│       │   └── AuthContext.jsx     # Estado global de autenticacion
│       ├── data/
│       │   └── destinos.js         # Datos detallados de 12 destinos
│       ├── layouts/
│       │   ├── AdminLayout.jsx     # Layout del panel admin
│       │   ├── AuthLayout.jsx      # Layout para login/registro
│       │   └── PublicLayout.jsx    # Layout publico (navbar + footer)
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Login.jsx
│       │   ├── Registro.jsx
│       │   ├── Lugares.jsx
│       │   ├── LugarDetalle.jsx
│       │   ├── Perfil.jsx
│       │   ├── NotFound.jsx
│       │   └── admin/
│       │       ├── AdminDashboard.jsx
│       │       ├── AdminUsuarios.jsx
│       │       ├── AdminDestinos.jsx
│       │       └── AdminHistorial.jsx
│       └── services/
│           └── api.js              # Cliente HTTP (axios)
│
└── database/
    ├── schema.sql                  # Estructura de tablas
    └── seed.sql                    # Datos iniciales (12 destinos)
```

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- [PostgreSQL](https://www.postgresql.org/) v14 o superior
- npm

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://gitlab.com/brayan-borja-madrid/lenguaje-avanzado-2-grupo-1.git
cd lenguaje-avanzado-2-grupo-1
```

### 2. Instalar dependencias

```bash
npm run install:all
```

Esto instala dependencias en la raiz, `backend/` y `frontend/`.

### 3. Configurar la base de datos

Crear la base de datos en PostgreSQL:

```sql
CREATE DATABASE turismo_db;
```

### 4. Configurar variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/turismo_db
JWT_SECRET=una_clave_secreta_larga_y_aleatoria
PORT=3000
```

### 5. Crear las tablas

```bash
psql -U postgres -d turismo_db -f database/schema.sql
```

### 6. Cargar datos iniciales

```bash
psql -U postgres -d turismo_db -f database/seed.sql
```

Esto carga los 12 destinos turisticos de ejemplo.

### 7. Crear usuario administrador

```bash
cd backend
node setup-admin.js
```

El script solicitara nombre, email y contrasena. El usuario se crea con rol de administrador (`rol_id = 0`).

### 8. Iniciar la aplicacion

Desde la raiz del proyecto:

```bash
npm run dev
```

Esto inicia simultaneamente:

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

## Base de datos

### Tablas

**usuarios**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | Identificador unico |
| nombre | VARCHAR(100) | Nombre del usuario |
| email | VARCHAR(150) | Email (unico) |
| password | TEXT | Contrasena hasheada con bcrypt |
| rol_id | INTEGER | 0 = admin, 1 = usuario |
| token_activo | TEXT | Token JWT actual (sesion unica) |

**lugares**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | Identificador unico |
| nombre | VARCHAR(150) | Nombre del destino |
| descripcion | TEXT | Descripcion del destino |
| ubicacion | VARCHAR(200) | Ubicacion geografica |
| imagen | TEXT | URL de imagen |

**login**

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | SERIAL PK | Identificador unico |
| usuario_id | INTEGER FK | Referencia a usuarios.id |
| exito | BOOLEAN | true = exitoso, false = fallido |
| fecha | TIMESTAMP | Fecha y hora del intento |

### Relaciones

- `login.usuario_id` -> `usuarios.id` (ON DELETE CASCADE)

## Autenticacion

### JWT (JSON Web Token)

1. Al iniciar sesion, el backend genera un token JWT firmado con `JWT_SECRET`.
2. El token se almacena en `usuarios.token_activo` en la base de datos.
3. El frontend envia el token en el header `Authorization: Bearer <token>` en cada peticion protegida.
4. El middleware `authMiddleware` verifica:
   - Que el token sea valido (firmado correctamente).
   - Que `token_activo` en la BD coincida con el token enviado.
5. Si cualquiera de las verificaciones falla, se retorna 401.

### Sesion unica

- Solo puede existir una sesion activa por usuario.
- Al iniciar sesion, se reemplaza el `token_activo` anterior.
- Si un usuario cierra el navegador sin logout y luego intenta iniciar sesion desde otro dispositivo, recibira un error 403 ("Ya hay una sesion activa").
- Un administrador puede revocar la sesion desde el panel de usuarios.
- Para recuperar la sesion del administrador, usar `revoke-session.js`.

### Roles

| Rol | rol_id | Permisos |
|-----|--------|----------|
| Usuario | 1 | Ver destinos, buscar, ver perfil, editar perfil |
| Administrador | 0 | Todo lo del usuario + gestionar usuarios, lugares, ver estadisticas, historial, revocar sesiones |

## API

### Autenticacion

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registrar nuevo usuario |
| POST | `/api/auth/login` | No | Iniciar sesion |
| POST | `/api/auth/logout` | Si | Cerrar sesion (limpia token_activo) |
| GET | `/api/auth/me` | Si | Obtener perfil del usuario actual |
| PUT | `/api/auth/me` | Si | Actualizar perfil del usuario actual |

### Lugares

| Metodo | Ruta | Auth | Rol | Descripcion |
|--------|------|------|-----|-------------|
| GET | `/api/lugares` | Si | Cualquiera | Listar lugares (busqueda opcional via `?search=`) |
| GET | `/api/lugares/:id` | Si | Cualquiera | Obtener lugar por ID |
| POST | `/api/lugares` | Si | Admin | Crear lugar |
| PUT | `/api/lugares/:id` | Si | Admin | Actualizar lugar |
| DELETE | `/api/lugares/:id` | Si | Admin | Eliminar lugar |

### Usuarios (solo admin)

| Metodo | Ruta | Auth | Rol | Descripcion |
|--------|------|------|-----|-------------|
| GET | `/api/usuarios` | Si | Admin | Listar usuarios con estado de sesion |
| GET | `/api/usuarios/:id` | Si | Admin | Obtener usuario por ID |
| POST | `/api/usuarios` | Si | Admin | Crear usuario |
| PUT | `/api/usuarios/:id` | Si | Admin | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | Si | Admin | Eliminar usuario |
| POST | `/api/usuarios/:id/revoke-session` | Si | Admin | Revocar sesion de un usuario |

### Admin (solo admin)

| Metodo | Ruta | Auth | Rol | Descripcion |
|--------|------|------|-----|-------------|
| GET | `/api/admin/stats` | Si | Admin | Estadisticas del sistema |
| GET | `/api/admin/login-history` | Si | Admin | Historial de intentos de acceso |

## Seguridad

- **Contrasenas**: Almacenadas con bcrypt (10 rounds de salt). Nunca se guardan en texto plano.
- **JWT**: Tokens firmados con `JWT_SECRET` definido en variables de entorno.
- **SQL parametrizado**: Todas las consultas usan parametrizacion ($1, $2...) para prevenir inyeccion SQL.
- **Sesion unica**: Un usuario solo puede tener una sesion activa. Revocar una sesion invalida inmediatamente el token.
- **Roles**: Middleware `adminMiddleware` protege endpoints que requieren privilegios de administrador.
- **CORS**: Configurado para permitir solo origenes especificos.
- **Variables de entorno**: Secretos almacenados en `.env` (no versionado). El archivo `.env.example` muestra solo los nombres de las variables.

## Scripts

### setup-admin.js

Crea un usuario con rol de administrador.

```bash
cd backend
node setup-admin.js
```

Solicita interactivamente: nombre, email, contrasena. Verifica si el email ya existe antes de crear.

### revoke-session.js

Revoca la sesion activa de un usuario por email. Util para recuperar acceso cuando el administrador queda bloqueado.

```bash
cd backend
node revoke-session.js usuario@ejemplo.com
```

Muestra los datos del usuario, pide confirmacion, y elimina `token_activo` si se confirma.

## Comandos disponibles

### Desde la raiz

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Iniciar frontend y backend en paralelo |
| `npm run build` | Construir el frontend para produccion |
| `npm start` | Iniciar solo el backend |
| `npm run install:all` | Instalar todas las dependencias |

### En frontend/

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Iniciar servidor de desarrollo Vite |
| `npm run build` | Construir para produccion |
| `npm run lint` | Ejecutar linter (oxlint) |

### En backend/

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Iniciar con nodemon (auto-reload) |
| `npm start` | Iniciar en modo produccion |
