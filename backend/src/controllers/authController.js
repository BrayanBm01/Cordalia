const UsuarioModel = require("../models/usuarioModel");
const LoginModel = require("../models/loginModel");
const SuscripcionModel = require("../models/suscripcionModel");
const PasswordResetModel = require("../models/passwordResetModel");
const { enviarCorreo, correoDisponible } = require("../services/mailService");
const { esErrorDeEsquema } = require("../utils/sqlErrors");
const pool = require("../config/db");
const { hashPassword, comparePassword } = require("../utils/password");
const { generarToken, verificarToken } = require("../utils/jwt");
const {
  isEmail,
  isValidPersonName,
  validatePassword,
  isValidPhone,
  isValidHttpUrl,
  sanitizeString,
  validarTexto,
} = require("../utils/validators");
const { GoogleAuthError } = require("../services/googleAuth");
const googleAuth = require("../services/googleAuth");

const ROLES = { ADMIN: 0, TOURIST: 1, BUSINESS: 2 };
const ROLES_PUBLICOS = [ROLES.TOURIST, ROLES.BUSINESS];
const PROVEEDORES_VALIDOS = ["local", "google"];

const AVATAR_MAX_BYTES = 1024 * 1024 * 2; // 2 MB (coincide con el limite del frontend)
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Valida un avatar enviado como data-URL base64 (p. ej.
 * "data:image/png;base64,..."). Devuelve un mensaje de error descriptivo
 * o null si es valido. Sobre datos demasiado grandes o formato corrupto,
 * el error es de VALIDACION (400), nunca un 500.
 */
function validarAvatarDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    return "Avatar inválido: formato no reconocido";
  }
  const mime = match[1].toLowerCase();
  if (!IMAGENES_PERMITIDAS.includes(mime)) {
    return `Avatar inválido: solo se permiten imágenes (${IMAGENES_PERMITIDAS.join(", ")})`;
  }
  const contenido = match[2];
  if (!contenido) {
    return "Avatar inválido: datos de imagen vacíos";
  }
  // Estimamos el tamano binario real a partir de la base64.
  const approxBytes = Math.floor((contenido.length * 3) / 4) - (contenido.endsWith("==") ? 2 : contenido.endsWith("=") ? 1 : 0);
  if (approxBytes > AVATAR_MAX_BYTES) {
    return "Avatar demasiado grande: máximo 2 MB";
  }
  return null;
}

function mapRolId(rol_id) {
  const r = Number(rol_id);
  if (r === 0) return "ADMIN";
  if (r === 2) return "BUSINESS";
  return "TOURIST";
}

function mapPublicUser(usuario, rol) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido || null,
    email: usuario.email,
    rol,
    avatar_url: usuario.avatar_url || null,
    proveedor: usuario.proveedor || "local",
    telefono: usuario.telefono || null,
    ciudad: usuario.ciudad || null,
    pais: usuario.pais || null,
    bio: usuario.bio || null,
    intereses_turisticos: usuario.intereses_turisticos || null,
    preferencias_viaje: usuario.preferencias_viaje || null,
  };
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}

function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

/**
 * Parsea y valida el rol solicitado para registro publico.
 * Solo permite TOURIST (1) o BUSINESS (2).
 * Cualquier intento de ADMIN (0) es ignorado/forzado a default.
 */
function resolvePublicRol(rol) {
  if (rol === "BUSINESS" || Number(rol) === ROLES.BUSINESS) return ROLES.BUSINESS;
  return ROLES.TOURIST;
}

function buildSessionResponse(usuario, token, rolNombre) {
  return {
    token,
    usuario: mapPublicUser(usuario, rolNombre),
  };
}

async function iniciarSesion(usuario, req) {
  const rolNombre = mapRolId(usuario.rol_id);
  const token = generarToken(usuario.id, rolNombre);
  await UsuarioModel.setToken(usuario.id, token);
  await LoginModel.registrar(usuario.id, true, getClientIp(req), getUserAgent(req));
  return { token, usuario, rolNombre };
}

/**
 * Politica de sesion unica: un usuario con sesion activa no puede iniciar otra.
 *
 * Un `token_activo` cuyo JWT ya expiro (o es invalido) NO es una sesion
 * utilizable: el middleware tambien lo rechazaria. Dejarlo bloqueando la cuenta
 * impide para siempre que el usuario vuelva a entrar (ni con contrasena ni con
 * Google) hasta que un administrador revoque la sesion. Por eso se limpia y se
 * permite el ingreso. No se relaja ninguna validacion de seguridad: solo se
 * descarta una credencial que ya no sirve.
 *
 * @returns {Promise<boolean>} true si existe una sesion VIGENTE que debe bloquear.
 */
async function tieneSesionVigente(usuario) {
  if (!usuario || !usuario.token_activo) return false;
  try {
    verificarToken(usuario.token_activo);
    return true;
  } catch {
    await UsuarioModel.clearToken(usuario.id);
    usuario.token_activo = null;
    return false;
  }
}

/**
 * ¿El error es por esquema incompleto en la base de datos (faltan las
 * migraciones 018/019/020)? Ver utils/sqlErrors.js.
 */
exports.register = async (req, res) => {
  try {
    let { nombre, email, password, rol } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
    }
    if (typeof nombre !== "string" || typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Datos inválidos" });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email).toLowerCase();
    // La contraseña NO se recorta: se usa exactamente como la escribió el
    // usuario. bcrypt limita el hash a 72 bytes; validamos ese limite.
    const passwordError = validatePassword(password);

    if (!isValidPersonName(nombre)) {
      return res.status(400).json({
        success: false,
        message:
          "Nombre inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
      });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const existe = await UsuarioModel.findByEmail(email);
    if (existe) {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }

    // El backend es la autoridad sobre el rol: nunca confiar en el cliente.
    // Solo TOURIST o BUSINESS son valido para registro publico.
    const rolFinal = resolvePublicRol(rol);

    const hashed = await hashPassword(password);

    // ------------------------------------------------------------
    // Creacion ATOMICA de la cuenta.
    //
    // La cuenta y (si es vendedor) su prueba gratuita de 7 dias se
    // escriben en UNA sola transaccion: si la segunda parte falla
    // (p. ej. porque la base de datos no tiene las columnas de la
    // migracion 019), NO queda ninguna cuenta creada a medias. Antes
    // el INSERT se hacia fuera de transaccion y un fallo dejaba al
    // usuario creado sin prueba ni sesion, y el siguiente intento
    // respondia 409 "el email ya esta registrado".
    // ------------------------------------------------------------
    const client = await pool.connect();
    let usuario;
    let rolNombre;
    let token;
    try {
      await client.query("BEGIN");

      usuario = await UsuarioModel.create(nombre, email, hashed, rolFinal, {
        proveedor: "local",
      }, client);

      // Vendedor nuevo -> prueba gratuita de 7 dias. Se calcula en el
      // servidor y se asigna UNA sola vez (no se reinicia al volver a
      // iniciar sesion). NO se crea ninguna suscripcion de pago ni se
      // inicia ningun cobro: la prueba es gratuita.
      if (rolFinal === ROLES.BUSINESS) {
        await SuscripcionModel.asignarPruebaGratuita(usuario.id, client);
      }

      // Sesion iniciada en la misma transaccion: el registro devuelve la
      // MISMA estructura que /auth/login (token + usuario).
      rolNombre = mapRolId(usuario.rol_id);
      token = generarToken(usuario.id, rolNombre);
      await UsuarioModel.setToken(usuario.id, token, client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    // Historial de acceso (fuera de la transaccion: es un registro de
    // auditoria, no afecta a la consistencia de la cuenta).
    await LoginModel.registrar(usuario.id, true, getClientIp(req), getUserAgent(req)).catch(() => {});

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      data: {
        token,
        usuario: mapPublicUser(usuario, rolNombre),
        // Se mantienen estos campos por compatibilidad con consumidores
        // que usaban la respuesta anterior.
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: rolNombre,
      },
    });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }
    // El esquema de la base de datos no tiene lo que el codigo necesita
    // (migraciones pendientes). No es un fallo del usuario: se responde
    // 503 con un mensaje comprensible, y el error real queda en el log.
    if (esErrorDeEsquema(error)) {
      console.error(
        "[auth/register] El esquema de la base de datos esta incompleto. " +
          "Aplica las migraciones 018, 019 y 020.",
        error
      );
      return res.status(503).json({
        success: false,
        code: "ESQUEMA_INCOMPLETO",
        message:
          "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.",
      });
    }
    console.error("Error en register:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios" });
    }
    if (typeof email !== "string") {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }

    email = sanitizeString(email).toLowerCase();
    // No se recorta la contraseña: debe coincidir exactamente con la
    // registrada. El limite evita procesar cadenas enormes con bcrypt.
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    if (typeof password !== "string" || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "Credenciales incorrectas" });
    }

    const usuario = await UsuarioModel.findByEmail(email);
    if (!usuario) {
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    // Cuenta creada solo por Google sin password: no se puede autenticar por password.
    if (usuario.proveedor === "google" && !usuario.password) {
      return res.status(401).json({
        success: false,
        message: "Esta cuenta usa Google. Inicia sesión con 'Continuar con Google'.",
      });
    }

    let coincide = await comparePassword(password, usuario.password);
    // Compatibilidad con cuentas antiguas: antes se recortaban los espacios
    // de la contraseña al registrarla. Se acepta una unica vez el valor
    // historico recortado, sin cambiar la contraseña almacenada.
    if (!coincide && password !== password.trim()) {
      coincide = await comparePassword(password.trim(), usuario.password);
    }
    if (!coincide) {
      await LoginModel.registrar(usuario.id, false, getClientIp(req), getUserAgent(req));
      return res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }

    if (await tieneSesionVigente(usuario)) {
      return res.status(403).json({ success: false, message: "Ya hay una sesión activa" });
    }

    if (usuario.rol_id === null || usuario.rol_id === undefined) {
      return res.status(401).json({ success: false, message: "Usuario sin rol asignado" });
    }

    const { token, rolNombre } = await iniciarSesion(usuario, req);

    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      data: buildSessionResponse(usuario, token, rolNombre),
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

/**
 * POST /auth/google
 * Recibe { idToken, rol }.
 * El idToken se verifica contra Google (firma/audiencia/exp).
 * El rol solo se usa en cuentas NUEVAS y se restringe a TOURIST/BUSINESS.
 * Para cuentas existentes, el rol SIEMPRE se conserva desde la BD.
 */
exports.google = async (req, res) => {
  try {
    const { idToken, rol } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ success: false, message: "Token de Google requerido" });
    }

    let verified;
    try {
      verified = await googleAuth.verifyGoogleIdToken(idToken);
    } catch (error) {
      if (error instanceof GoogleAuthError) {
        // Motivo tecnico en los logs de Railway (sin el token ni datos sensibles).
        console.error(
          `[auth/google] credencial rechazada (${error.motivo})` +
            (error.detalle ? `: ${error.detalle}` : "")
        );
        // Solo los intentos con credencial presente se auditan como fallidos.
        if (error.motivo !== "token_ausente") {
          await LoginModel.registrar(null, false, getClientIp(req), getUserAgent(req));
        }
        return res
          .status(error.status || 401)
          .json({ success: false, message: error.message });
      }
      throw error;
    }

    const { googleId, email, nombre, avatarUrl } = verified;

    let usuario = await UsuarioModel.findByGoogleId(googleId);

    if (usuario) {
      // Usuario ya vinculado a este google_id: conserva su rol y datos.
      // (flujo de cuenta existente)
    } else {
      // No vinculado por google_id: buscar por email para vincular (evitar duplicados).
      const porEmail = await UsuarioModel.findByEmail(email);

      if (porEmail) {
        // Vincular la cuenta existente (tradicional o google) a este google_id.
        // Se conserva el ROL y todos los datos del usuario existente.
        await UsuarioModel.update(porEmail.id, {
          google_id: googleId,
          proveedor: "google",
          avatar_url: avatarUrl || porEmail.avatar_url || null,
        });
        usuario = {
          ...porEmail,
          google_id: googleId,
          proveedor: "google",
          avatar_url: avatarUrl || porEmail.avatar_url || null,
        };
      } else {
        // Crear usuario nuevo. Rol restringido a TOURIST (default) o BUSINESS.
        // La cuenta y su prueba gratuita se crean en UNA sola transaccion
        // (igual que en /auth/register): si algo falla, no queda ninguna
        // cuenta a medias.
        const rolFinal = resolvePublicRol(rol);
        // El nombre visible de Google puede traer caracteres especiales;
        // se normaliza y se limita a la columna. Nunca se confia en el
        // cliente para el rol (resolvePublicRol) ni para identidad.
        let nombreGoogle = sanitizeString(nombre || "");
        if (!nombreGoogle) nombreGoogle = sanitizeString(email.split("@")[0]);
        nombreGoogle = nombreGoogle.slice(0, 100);
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          usuario = await UsuarioModel.create(nombreGoogle, email, null, rolFinal, {
            proveedor: "google",
            google_id: googleId,
            avatar_url: avatarUrl || null,
          }, client);
          // Vendedor nuevo (tambien con Google) -> prueba gratuita de 7 dias.
          // NO se crea ninguna suscripcion de pago ni se inicia ningun cobro.
          if (rolFinal === ROLES.BUSINESS) {
            await SuscripcionModel.asignarPruebaGratuita(usuario.id, client);
          }
          await client.query("COMMIT");
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      }
    }

    // Con Google el usuario se reidentifica explicitamente. Si existe una
    // sesion vigente en otro dispositivo/navegador, se sustituye por la nueva
    // (sigue habiendo UNA sola sesion activa). Esto corrige el re-login con
    // Google sin romper la politica de sesion unica.
    if (usuario.token_activo) {
      try {
        verificarToken(usuario.token_activo);
        // Hay sesion vigente: se revoca para permitir el re-login con Google.
        await UsuarioModel.clearToken(usuario.id);
        usuario.token_activo = null;
      } catch {
        await UsuarioModel.clearToken(usuario.id);
        usuario.token_activo = null;
      }
    }

    if (usuario.rol_id === null || usuario.rol_id === undefined) {
      return res.status(401).json({ success: false, message: "Usuario sin rol asignado" });
    }

    const { token, rolNombre } = await iniciarSesion(usuario, req);

    return res.status(200).json({
      success: true,
      message: "Login con Google exitoso",
      data: buildSessionResponse(usuario, token, rolNombre),
    });
  } catch (error) {
    if (error instanceof GoogleAuthError) {
      console.error(
        `[auth/google] credencial rechazada (${error.motivo})` +
          (error.detalle ? `: ${error.detalle}` : "")
      );
      return res
        .status(error.status || 401)
        .json({ success: false, message: error.message });
    }
    if (esErrorDeEsquema(error)) {
      console.error(
        "[auth/google] El esquema de la base de datos esta incompleto. " +
          "Aplica las migraciones 018, 019 y 020.",
        error
      );
      return res.status(503).json({
        success: false,
        code: "ESQUEMA_INCOMPLETO",
        message:
          "El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.",
      });
    }
    console.error("[auth/google] error inesperado:", error);
    return res.status(500).json({ success: false, message: "Error al iniciar sesión con Google" });
  }
};

/**
 * POST /auth/password
 *
 * Permite a un usuario AUTENTICADO establecer o cambiar su contrasena local.
 *
 * Casos:
 *   * Cuenta creada solo con Google (sin contrasena local): puede
 *     ESTABLECER una contrasena propia sin aportar la anterior (no existe).
 *     Esto habilita el acceso tradicional sin depender de Google, sin crear
 *     un sistema paralelo de autenticacion.
 *   * Cuenta con contrasena local ya configurada: para CAMBIARLA debe enviar
 *     `password_actual` y esta debe coincidir. Nunca se permite sobrescribir
 *     una contrasena existente sin conocer la actual.
 *
 * La contrasena se guarda SIEMPRE con bcrypt (hashPassword). Nunca en texto
 * plano, y nunca se registra ni se devuelve.
 */
exports.setPassword = async (req, res) => {
  try {
    const id = req.usuario.id;
    const passwordNueva = req.body?.password_nueva;
    const passwordActual = req.body?.password_actual;

    const passwordError = validatePassword(passwordNueva);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    // Necesitamos el hash actual: findByEmail no aplica, buscamos por id con
    // password incluido a traves del modelo (findByGoogleId/findById no lo traen).
    const conPassword = await UsuarioModel.findAuthById(id);
    if (!conPassword) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    const tienePasswordLocal = Boolean(conPassword.password);

    if (tienePasswordLocal) {
      // Cambio de contrasena: exige la actual. No se recorta (la
      // contrasena se usa tal cual), pero se acota su tamano para no
      // procesar cadenas absurdamente grandes con bcrypt.
      if (typeof passwordActual !== "string" || passwordActual.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Debes ingresar tu contraseña actual para cambiarla",
        });
      }
      if (Buffer.byteLength(passwordActual, "utf8") > 72) {
        return res.status(401).json({ success: false, message: "La contraseña actual no es correcta" });
      }
      let coincide = await comparePassword(passwordActual, conPassword.password);
      // Compatibilidad con hashes antiguos creados tras recortar espacios.
      if (!coincide && passwordActual !== passwordActual.trim()) {
        coincide = await comparePassword(passwordActual.trim(), conPassword.password);
      }
      if (!coincide) {
        return res.status(401).json({ success: false, message: "La contraseña actual no es correcta" });
      }
    }

    const hashed = await hashPassword(passwordNueva);
    await UsuarioModel.update(id, { password: hashed });

    return res.json({
      success: true,
      message: tienePasswordLocal
        ? "Contraseña actualizada correctamente"
        : "Contraseña establecida correctamente. Ya puedes iniciar sesión con tu correo.",
    });
  } catch (error) {
    console.error("Error en setPassword:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar la contraseña" });
  }
};

/**
 * POST /auth/recuperar-password
 *
 * Inicia la recuperacion de contrasena. Envia un enlace de un solo uso
 * al correo del usuario.
 *
 * Seguridad:
 *   * SIEMPRE responde 200 con el mismo mensaje, exista o no el correo:
 *     no se revela que correos estan registrados.
 *   * Si el envio de correo NO esta configurado en el servidor, se
 *     responde 503 con un mensaje claro (no se finge un envio).
 */
exports.recuperarPassword = async (req, res) => {
  try {
    const emailRaw = req.body?.email;
    if (typeof emailRaw !== "string") {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    const email = sanitizeString(emailRaw).toLowerCase();
    if (!email || !isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }

    const usuario = await UsuarioModel.findByEmail(email);
    const mensaje =
      "Si el correo está registrado, te enviamos un enlace para establecer tu contraseña.";

    if (!usuario) {
      // Mismo mensaje: no revelamos si el correo existe.
      return res.json({ success: true, message: mensaje });
    }

    if (!correoDisponible()) {
      return res.status(503).json({
        success: false,
        code: "MAIL_NOT_CONFIGURED",
        message:
          "El envío de correos no está configurado en el servidor. Contacta al administrador de Cordalia.",
      });
    }

    const { token, registro } = await PasswordResetModel.crearToken(usuario.id);
    const enlace = construirEnlaceRecuperacion(token);

    try {
      await enviarCorreo({
        para: usuario.email,
        asunto: "Restablece tu contraseña de Cordalia",
        texto:
          `Hola ${usuario.nombre || ''},\n\n` +
          `Recibimos una solicitud para restablecer tu contraseña de Cordalia.\n` +
          `Abre el siguiente enlace (válido por 1 hora y de un solo uso):\n\n${enlace}\n\n` +
          `Si no fuiste tú, ignora este mensaje: tu contraseña actual sigue vigente.\n`,
      });
    } catch (error) {
      console.error("[auth/recuperar-password] no se pudo enviar el correo:", error.message);
      return res.status(error.status || 502).json({
        success: false,
        message: "No se pudo enviar el correo de recuperación. Intenta más tarde.",
      });
    }

    // En DESARROLLO se devuelve el enlace para poder probarlo sin correo.
    const esProduccion = (process.env.NODE_ENV || "development") === "production";
    return res.json({
      success: true,
      message: mensaje,
      ...(esProduccion ? {} : { enlace_pruebas: enlace, expira_en: registro.expira_en }),
    });
  } catch (error) {
    console.error("Error en recuperarPassword:", error);
    return res.status(500).json({ success: false, message: "Error al procesar la solicitud" });
  }
};

/**
 * POST /auth/resetear-password
 *
 * Consume el token de recuperacion y establece la nueva contrasena.
 * El token es de UN SOLO USO y caduca en 1 hora.
 */
exports.resetearPassword = async (req, res) => {
  try {
    const tokenRaw = req.body?.token;
    const password = req.body?.password;

    if (typeof tokenRaw !== "string" || tokenRaw.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Token requerido" });
    }
    // Los tokens son cadenas aleatorias cortas; un limite evita procesar
    // entradas enormes en la consulta.
    if (tokenRaw.length > 512) {
      return res.status(400).json({ success: false, message: "Token inválido" });
    }
    const token = tokenRaw.trim();

    // La contrasena NO se recorta: se guarda exactamente como se ingreso.
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const consumo = await PasswordResetModel.consumirToken(token);
    if (!consumo) {
      return res.status(400).json({
        success: false,
        message: "El enlace es inválido o ya expiró. Solicita uno nuevo.",
      });
    }

    const hashed = await hashPassword(password);
    await UsuarioModel.update(consumo.usuario_id, { password: hashed });

    // El token es de un solo uso: se invalida el resto de la cuenta.
    await PasswordResetModel.limpiarTokens();

    return res.json({
      success: true,
      message: "Contraseña establecida correctamente. Ya puedes iniciar sesión con tu correo.",
    });
  } catch (error) {
    console.error("Error en resetearPassword:", error);
    return res.status(500).json({ success: false, message: "Error al restablecer la contraseña" });
  }
};

/**
 * Construye el enlace de recuperacion usando la URL publica del FRONTEND
 * (no la del backend: el usuario vuelve a la web).
 */
function construirEnlaceRecuperacion(token) {
  const frontend = (process.env.FRONTEND_URL || "").replace(/\/+$/, "");
  const base = frontend || "";
  return `${base}/restablecer-contrasena?token=${encodeURIComponent(token)}`;
}

exports.logout = async (req, res) => {
  try {
    await UsuarioModel.clearToken(req.usuario.id);
    return res.json({ success: true, message: "Sesión cerrada correctamente" });
  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({ success: false, message: "Error al cerrar sesión" });
  }
};

exports.me = async (req, res) => {
  try {
    const usuario = await UsuarioModel.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    return res.json({
      success: true,
      data: mapPublicUser(usuario, req.usuario.rol),
    });
  } catch (error) {
    console.error("Error en me:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const id = req.usuario.id;
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const fields = {};

    if (body.nombre !== undefined) {
      if (typeof body.nombre !== "string" || !isValidPersonName(body.nombre)) {
        return res.status(400).json({
          success: false,
          message:
            "Nombre inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
        });
      }
      fields.nombre = sanitizeString(body.nombre);
    }

    if (body.apellido !== undefined) {
      if (body.apellido === null || body.apellido === "") {
        fields.apellido = null;
      } else if (typeof body.apellido !== "string" || !isValidPersonName(body.apellido)) {
        return res.status(400).json({
          success: false,
          message:
            "Apellido inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
        });
      } else {
        fields.apellido = sanitizeString(body.apellido);
      }
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string") {
        return res.status(400).json({ success: false, message: "Email inválido" });
      }
      const email = sanitizeString(body.email).toLowerCase();
      if (!isEmail(email)) {
        return res.status(400).json({ success: false, message: "Email inválido" });
      }
      const existing = await UsuarioModel.findByEmail(email);
      if (existing && existing.id != id) {
        return res.status(409).json({ success: false, message: "El email ya está en uso" });
      }
      fields.email = email;
    }

    // Una contrasena vacia/null significa "no cambiarla"; cualquier otro
    // valor debe cumplir la politica y se guarda SIN recortar espacios.
    if (body.password !== undefined && body.password !== null && body.password !== "") {
      const passwordError = validatePassword(body.password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      fields.password = await hashPassword(body.password);
    }

    // Campos opcionales de perfil. Un string vacio limpia el campo.
    const textosOpcionales = [
      { key: "ciudad", max: 100, label: "Ciudad" },
      { key: "pais", max: 100, label: "País" },
      { key: "bio", max: 1000, label: "Biografía", multiline: true },
      { key: "intereses_turisticos", max: 500, label: "Intereses turísticos" },
      { key: "preferencias_viaje", max: 500, label: "Preferencias de viaje" },
    ];

    for (const campo of textosOpcionales) {
      if (body[campo.key] === undefined) continue;
      const resultado = validarTexto(body[campo.key], {
        max: campo.max,
        label: campo.label,
        multiline: Boolean(campo.multiline),
      });
      if (resultado.error) {
        return res.status(400).json({ success: false, message: resultado.error });
      }
      fields[campo.key] = resultado.value;
    }

    if (body.telefono !== undefined) {
      if (body.telefono === null || body.telefono === "") {
        fields.telefono = null;
      } else if (typeof body.telefono !== "string" || !isValidPhone(body.telefono)) {
        return res.status(400).json({
          success: false,
          message: "Teléfono inválido: usa entre 7 y 15 dígitos, con +, espacios, guiones o paréntesis",
        });
      } else {
        fields.telefono = sanitizeString(body.telefono);
      }
    }

    if (body.avatar_url !== undefined) {
      if (body.avatar_url !== null && typeof body.avatar_url !== "string") {
        return res.status(400).json({ success: false, message: "Avatar inválido: debe ser una URL" });
      }
      const avatar = sanitizeString(body.avatar_url || "");
      if (avatar) {
        const esDataUrl = /^data:image\//i.test(avatar);
        if (esDataUrl) {
          const errorAvatar = validarAvatarDataUrl(avatar);
          if (errorAvatar) {
            return res.status(400).json({ success: false, message: errorAvatar });
          }
        } else if (!isValidHttpUrl(avatar)) {
          return res.status(400).json({
            success: false,
            message: "Avatar inválido: debe ser una URL http(s) válida",
          });
        }
      }
      fields.avatar_url = avatar || null;
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    const updated = await UsuarioModel.update(id, fields);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    return res.json({ success: true, message: "Perfil actualizado", data: mapPublicUser(updated, req.usuario.rol) });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ success: false, message: "El email ya está en uso" });
    }
    console.error("Error en updateProfile:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar" });
  }
};
