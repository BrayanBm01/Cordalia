# Manual de Usuario - Explora Turismo

Manual practico para utilizar la plataforma Explora Turismo. No requiere conocimientos tecnicos.

---

## Que es Explora Turismo

Explora Turismo es una plataforma web para descubrir destinos turisticos de Colombia. Permite explorar 12 destinos con informacion detallada: actividades, puntos turisticos, gastronomia, consejos de viaje y mas.

## Requisitos

- Un navegador web actualizado (Chrome, Firefox, Edge, Safari)
- Conexion a internet
- Las direcciones del servidor:
  - Frontend: `http://localhost:5173`
  - Backend: `http://localhost:3000`

---

## Primeros pasos

### Crear una cuenta

1. Abrir `http://localhost:5173` en el navegador.
2. Hacer clic en **Crear cuenta** o ir a la pagina de registro.
3. Completar el formulario:
   - **Nombre**: tu nombre completo.
   - **Email**: tu direccion de correo electronico.
   - **Contrasena**: elige una contrasena segura.
4. Hacer clic en **Crear cuenta**.
5. Seras redirigido automaticamente a la pagina de inicio de sesion.

### Iniciar sesion

1. Ir a `http://localhost:5173/login`.
2. Ingresar tu email y contrasena.
3. Hacer clic en **Iniciar sesion**.
4. Si las credenciales son correctas, accedes al sistema y el navbar mostrara las opciones: **Explorar**, **Mi perfil** y **Cerrar sesion**.

### Errores comunes al iniciar sesion

- **"Credenciales incorrectas"**: el email o la contrasena no coinciden. Verificar ambos datos.
- **"Ya hay una sesion activa"**: ya tienes una sesion abierta desde otro navegador o dispositivo. Consultar la seccion [Gestion de sesiones](#gestion-de-sesiones) mas abajo.

### Cerrar sesion

1. Hacer clic en **Cerrar sesion** en la barra de navegacion.
2. Tu sesion se cierra y seras redirigido a la pagina de inicio.
3. Las rutas protegidas (perfil, destinos) ya no estaran disponibles hasta que inicies sesion de nuevo.

---

## Explorar destinos

### Ver el listado de destinos

1. Iniciar sesion.
2. Hacer clic en **Explorar** en la barra de navegacion, o ir a la seccion de destinos desde la pagina de inicio.
3. Se muestra la cuadricula de destinos turisticos con imagen, nombre, ubicacion y descripcion breve.

### Buscar un destino

1. En la pagina de destinos, usar el campo de busqueda.
2. Escribir el nombre del destino (ej: "Cartagena", "Salento", "Tayrona").
3. Los resultados se filtran automaticamente mientras escribes.
4. Para ver todos los destinos de nuevo, borrar el texto del campo de busqueda.

### Ver el detalle de un destino

1. En la cuadricula de destinos, hacer clic en **Ver detalle** del destino que te interese.
2. Se abre la pagina de detalle con:
   - **Descripcion general** del destino.
   - **Galeria de imagenes**.
   - **Actividades** disponibles.
   - **Puntos turisticos** para visitar.
   - **Gastronomia y restaurantes** recomendados.
   - **Zonas** del destino.
   - **Consejos praticos**: mejor epoca para visitar, como llegar, duracion recomendada, presupuesto estimado.
   - **Destinos relacionados** al final de la pagina.

---

## Mi perfil

### Ver mi perfil

1. Hacer clic en **Mi perfil** en la barra de navegacion.
2. Se muestra tu nombre, email y rol.

### Editar mi perfil

1. En la pagina de perfil, hacer clic en **Editar perfil**.
2. Modificar los campos que deseas cambiar (nombre, email).
3. Hacer clic en **Guardar**.
4. Los cambios se aplican inmediatamente.

---

## Panel de administrador

> **Nota**: Solo los usuarios con rol de administrador pueden acceder al panel de administracion. Si no eres administrador, no veras las opciones de administracion en la navegacion.

### Acceder al panel

1. Iniciar sesion con una cuenta de administrador.
2. En la barra de navegacion aparecera la seccion **Admin** con un menu desplegable.
3. Hacer clic en la opcion deseada: **Dashboard**, **Usuarios**, **Lugares** o **Historial**.

### Dashboard

Muestra las estadisticas generales del sistema:

- Total de usuarios registrados.
- Total de lugares turisticos.
- Logins exitosos.
- Logins fallidos.

### Gestion de usuarios

1. Ir a **Admin > Usuarios**.
2. Se muestra la tabla de todos los usuarios con:
   - Nombre
   - Email
   - Rol (Usuario / Admin)
   - Estado de sesion (Activa / Inactiva)
   - Acciones

#### Crear un usuario

1. Hacer clic en **Crear usuario**.
2. Completar nombre, email, contrasena y rol.
3. Hacer clic en **Crear**.

#### Editar un usuario

1. En la tabla de usuarios, hacer clic en el icono de editar (lapiz).
2. Modificar los campos deseados.
3. Hacer clic en **Guardar**.

#### Eliminar un usuario

1. En la tabla de usuarios, hacer clic en el icono de eliminar (basurero).
2. Confirmar la eliminacion en el modal que aparece.
3. El usuario se elimina permanentemente.

> **Nota**: No puedes eliminarte a ti mismo desde la tabla si eres el administrador actualmente autenticado.

### Gestion de lugares

1. Ir a **Admin > Lugares**.
2. Se muestra la tabla de todos los destinos turisticos.

#### Crear un lugar

1. Hacer clic en **Crear lugar**.
2. Completar nombre, descripcion, ubicacion e imagen (URL).
3. Hacer clic en **Crear**.

#### Editar un lugar

1. En la tabla de lugares, hacer clic en el icono de editar.
2. Modificar los campos deseados.
3. Hacer clic en **Guardar**.

#### Eliminar un lugar

1. En la tabla de lugares, hacer clic en el icono de eliminar.
2. Confirmar la eliminacion.

### Historial de accesos

1. Ir a **Admin > Historial**.
2. Se muestra el registro de todos los intentos de inicio de sesion:
   - Usuario
   - Email
   - Resultado (exitoso / fallido)
   - Fecha y hora

### Notificaciones

1. En la barra de navegacion del panel de administracion, hacer clic en el icono de campana.
2. Se muestra el historial reciente de logins.
3. Los nuevos registros aparecen marcados con un indicador.
4. Hacer clic en **Marcar todo leido** para limpiar el indicador.

---

## Gestion de sesiones

### El problema

Explora Turismo utiliza un sistema de sesion unica: cada usuario solo puede tener una sesion activa al mismo tiempo.

Si cierras el navegador sin hacer logout, o si cambias de dispositivo, la sesion anterior puede seguir activa. Al intentar iniciar sesion desde otro lugar, recibiras el error:

> "Ya hay una sesion activa"

### Solucion (usuario normal)

Si otro usuario tiene una sesion activa y no puede acceder:

1. Un administrador debe ir a **Admin > Usuarios**.
2. En la tabla, buscar el usuario con sesion activa.
3. Hacer clic en el icono de **Cerrar sesion** (LogOut) en la columna de sesion.
4. Confirmar la accion en el modal.
5. El usuario ahora podra iniciar sesion desde cualquier dispositivo.

> **Importante**: "Cerrar sesion" NO elimina al usuario. Solo cierra su sesion activa. El usuario conserva todos sus datos.

### Recuperacion del administrador

Si el administrador quedo bloqueado porque su sesion anterior sigue activa y no puede acceder al panel para revocarla:

1. Abrir una terminal.
2. Navegar a la carpeta del backend:
   ```bash
   cd backend
   ```
3. Ejecutar el script de recuperacion con el email del administrador:
   ```bash
   node revoke-session.js tu-email@ejemplo.com
   ```
4. El script mostrara los datos del usuario y pedira confirmacion.
5. Presionar **s** para confirmar.
6. La sesion se revocara y podras iniciar sesion normalmente.

---

## Solucion de problemas

### "Ya hay una sesion activa"

**Causa**: Existe un `token_activo` registrado en la base de datos para tu cuenta. Esto ocurre cuando la sesion no se cerro correctamente.

**Solucion**:
- Si eres usuario normal: pedir a un administrador que revoque tu sesion desde Admin > Usuarios.
- Si eres administrador: usar el script `revoke-session.js` desde la terminal (ver [Recuperacion del administrador](#recuperacion-del-administrador)).

### "Credenciales incorrectas"

**Causa**: El email o la contrasena no coinciden con los registrados.

**Solucion**: Verificar que el email y la contrasena sean correctos. Recordar que las contrasenas son sensibles a mayusculas/minusculas.

### "401 Unauthorized"

**Causa**: Tu sesion expiro, el token no es valido, o tu sesion fue revocada.

**Solucion**: Volver a iniciar sesion.

### "403 Forbidden"

**Causa**: Estas intentando acceder a una funcion que requiere rol de administrador.

**Solucion**: Iniciar sesion con una cuenta de administrador, o pedir a un administrador que te asigne el rol adecuado.

### "No se puede conectar a PostgreSQL"

**Causa**: PostgreSQL no esta ejecutandose, las credenciales en `.env` son incorrectas, o la base de datos no existe.

**Solucion**:
1. Verificar que PostgreSQL este ejecutandose.
2. Verificar que las credenciales en `backend/.env` sean correctas.
3. Verificar que la base de datos `turismo_db` exista.

### "npm install falla"

**Causa**: Version de Node.js incompatibile o problema de permisos.

**Solucion**:
1. Verificar que Node.js este instalado (`node --version`). Se requiere v18 o superior.
2. Si el error persiste, eliminar `node_modules` y volver a instalar:
   ```bash
   rm -rf node_modules backend/node_modules frontend/node_modules
   npm run install:all
   ```

### "El frontend no carga"

**Causa**: El backend no esta ejecutandose o hay un error de compilacion.

**Solucion**:
1. Verificar que el backend este corriendo en el puerto 3000.
2. Verificar la consola del navegador (F12) para ver errores.
3. Verificar la terminal del frontend para errores de compilacion.

### "La API devuelve 500"

**Causa**: Error interno del servidor.

**Solucion**:
1. Revisar la terminal del backend para ver el error especifico.
2. Verificar que PostgreSQL este ejecutandose y accesible.
3. Verificar que `backend/.env` tenga los valores correctos.

---

## Desarrollo

### Estructura tecnica

```
Frontend (React, puerto 5173)
    |
    v  proxy /api/*
Backend (Express, puerto 3000)
    |
    v  SQL parametrizado
PostgreSQL (turismo_db)
```

### Variables de entorno

El archivo `backend/.env` contiene:

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL de conexion a PostgreSQL | Si |
| `JWT_SECRET` | Secreto para firmar tokens JWT | Si |
| `PORT` | Puerto del backend (default: 3000) | No |
| `FRONTEND_URL` | URL del frontend para CORS | No |

### Scripts de administracion

| Script | Ubicacion | Uso |
|--------|-----------|-----|
| `setup-admin.js` | `backend/` | Crear usuario administrador |
| `revoke-session.js` | `backend/` | Revocar sesion de un usuario por email |

### Comandos principales

| Comando | Descripcion |
|---------|-------------|
| `npm run install:all` | Instalar todas las dependencias |
| `npm run dev` | Iniciar frontend y backend en paralelo |
| `npm run build` | Construir frontend para produccion |
| `npm start` | Iniciar solo el backend |
