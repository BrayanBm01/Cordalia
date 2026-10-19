const UsuarioModel = require("../models/usuarioModel");
const LoginModel = require("../models/loginModel");
const { hashPassword, comparePassword } = require("../utils/password");
const { generarToken, verificarToken } = require("../utils/jwt");
const { isEmail, isNonEmptyString, sanitizeString } = require("../utils/validators");
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

exports.register = async (req, res) => {
  try {
    let { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ success: false, message: "Todos los campos son obligatorios" });
    }

    nombre = sanitizeString(nombre);
    email = sanitizeString(email).toLowerCase();
    password = sanitizeString(password);

    if (!isNonEmptyString(nombre, 2, 100)) {
      return res.status(400).json({ success: false, message: "Nombre debe tener entre 2 y 100 caracteres" });
    }
    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: "Email inválido" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
    }

    const existe = await UsuarioModel.findByEmail(email);
    if (existe) {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }

    // El backend es la autoridad sobre el rol: nunca confiar en el cliente.
    // Solo TOURIST o BUSINESS son valido para registro publico.
    const rolFinal = resolvePublicRol(rol);

    const hashed = await hashPassword(password);
    const usuario = await UsuarioModel.create(nombre, email, hashed, rolFinal, {
      proveedor: "local",
    });

    return res.status(201).json({
      success: true,
      message: "Usuario registrado correctamente",
      data: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: mapRolId(usuario.rol_id) },
    });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ success: false, message: "El email ya está registrado" });
    }
    console.error("Error en register:", error);
    return res.status(500).json({ success: false, message: "Error en el servidor" });
  }
};

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email y contraseña son obligatorios" });
    }

    email = sanitizeString(email).toLowerCase();
    password = sanitizeString(password);

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

    const coincide = await comparePassword(password, usuario.password);
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
        const rolFinal = resolvePublicRol(rol);
        usuario = await UsuarioModel.create(nombre || email.split("@")[0], email, null, rolFinal, {
          proveedor: "google",
          google_id: googleId,
          avatar_url: avatarUrl || null,
        });
      }
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
    console.error("[auth/google] error inesperado:", error);
    return res.status(500).json({ success: false, message: "Error al iniciar sesión con Google" });
  }
};

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

    let { nombre, email, password } = req.body;
    const fields = {};

    if (nombre) {
      nombre = sanitizeString(nombre);
      if (!isNonEmptyString(nombre, 2, 100)) {
        return res.status(400).json({ success: false, message: "Nombre inválido" });
      }
      fields.nombre = nombre;
    }

    if (email) {
      email = sanitizeString(email).toLowerCase();
      if (!isEmail(email)) {
        return res.status(400).json({ success: false, message: "Email inválido" });
      }
      const existing = await UsuarioModel.findByEmail(email);
      if (existing && existing.id != id) {
        return res.status(409).json({ success: false, message: "El email ya está en uso" });
      }
      fields.email = email;
    }

    if (password && sanitizeString(password).length > 0) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: "La contraseña debe tener al menos 6 caracteres" });
      }
      fields.password = await hashPassword(sanitizeString(password));
    }

    // Campos opcionales de perfil. Un string vacio limpia el campo.
    const opcionales = [
      { key: "apellido", max: 100, label: "Apellido" },
      { key: "telefono", max: 30, label: "Teléfono" },
      { key: "ciudad", max: 100, label: "Ciudad" },
      { key: "pais", max: 100, label: "País" },
      { key: "bio", max: 1000, label: "Biografía" },
      { key: "intereses_turisticos", max: 500, label: "Intereses turísticos" },
      { key: "preferencias_viaje", max: 500, label: "Preferencias de viaje" },
    ];

    for (const campo of opcionales) {
      if (req.body[campo.key] === undefined) continue;
      const valor = sanitizeString(String(req.body[campo.key] ?? ""));
      if (valor.length > campo.max) {
        return res.status(400).json({
          success: false,
          message: `${campo.label} debe tener máximo ${campo.max} caracteres`,
        });
      }
      fields[campo.key] = valor || null;
    }

    if (req.body.avatar_url !== undefined) {
      const avatar = sanitizeString(String(req.body.avatar_url ?? ""));
      if (avatar) {
        const esUrl = /^https?:\/\//i.test(avatar);
        const esDataUrl = /^data:image\//i.test(avatar);
        if (!esUrl && !esDataUrl) {
          return res.status(400).json({ success: false, message: "Avatar inválido: debe ser una URL" });
        }
        if (esDataUrl) {
          const errorAvatar = validarAvatarDataUrl(avatar);
          if (errorAvatar) {
            return res.status(400).json({ success: false, message: errorAvatar });
          }
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
    console.error("Error en updateProfile:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar" });
  }
};
