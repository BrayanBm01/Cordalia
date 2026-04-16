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

    // 🔍 buscar usuario
    const result = await db.query(
      "SELECT id, nombre, email, password, rol_id FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no encontrado"
      });
    }

    const usuario = result.rows[0];

    // 🔐 verificar contraseña
    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      try {
        await db.query(
          "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
          [usuario.id, false]
        );
      } catch (err) {
        console.error("Error log fallido:", err);
      }

      return res.status(401).json({
        ok: false,
        mensaje: "Contraseña incorrecta"
      });
    }

    // 🔑 generar token
    const token = generarToken(usuario.id, usuario.rol_id);

    // 🔥 sesión única (IMPORTANTE)
    await db.query(
      "UPDATE usuarios SET token_activo = $1 WHERE id = $2",
      [token, usuario.id]
    );

    // log exitoso
    try {
      await db.query(
        "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
        [usuario.id, true]
      );
    } catch (err) {
      console.error("Error log exitoso:", err);
    }

    // ✔ respuesta estable (IMPORTANTE PARA EVITAR BUGS FRONTEND)
    return res.status(200).json({
      ok: true,
      mensaje: "Login exitoso",
      token,
      rol: usuario.rol_id,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol_id
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

module.exports = { login };