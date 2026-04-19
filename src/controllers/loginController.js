const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { generarToken } = require("../utils/jwtUtil");

const login = async (req, res) => {
  let { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos incompletos"
    });
  }

  try {
    email = email.trim();
    password = password.trim();

    // Buscar usuario incluyendo token_activo
    const result = await db.query(
      "SELECT id, nombre, email, password, rol_id, token_activo FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no encontrado"
      });
    }

    const usuario = result.rows[0];

    // Verificar contraseña
    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      await db.query(
        "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
        [usuario.id, false]
      );

      return res.status(401).json({
        ok: false,
        mensaje: "Contraseña incorrecta"
      });
    }

    // Verificar si ya hay sesión activa
    if (usuario.token_activo) {
      return res.status(403).json({
        ok: false,
        mensaje: "Ya hay una sesión iniciada en otro dispositivo"
      });
    }

    // Validar rol
    if (usuario.rol_id === null) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario sin rol asignado. Contacta al administrador"
      });
    }

    let rolNombre;
    if (usuario.rol_id === 0) {
      rolNombre = "ADMIN";
    } else if (usuario.rol_id === 1) {
      rolNombre = "USER";
    } else {
      return res.status(401).json({
        ok: false,
        mensaje: "Rol inválido"
      });
    }

    // Generar token
    const token = generarToken(usuario.id, rolNombre);

    // Guardar token como sesión activa
    await db.query(
      "UPDATE usuarios SET token_activo = $1 WHERE id = $2",
      [token, usuario.id]
    );

    // Registrar login exitoso
    await db.query(
      "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
      [usuario.id, true]
    );

    return res.status(200).json({
      ok: true,
      mensaje: "Login exitoso",
      token,
      rol: rolNombre,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: rolNombre
      }
    });

  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor"
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.usuario.id;

    await db.query(
      "UPDATE usuarios SET token_activo = NULL WHERE id = $1",
      [userId]
    );

    return res.json({
      ok: true,
      mensaje: "Sesión cerrada correctamente"
    });

  } catch (error) {
    console.error("Error en logout:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error al cerrar sesión"
    });
  }
};

module.exports = { login, logout };