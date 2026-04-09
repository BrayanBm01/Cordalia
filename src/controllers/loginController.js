const bcrypt = require("bcrypt");
const db = require("../config/db");
const { generarToken } = require("../utils/jwtUtil");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      mensaje: "Datos incompletos"
    });
  }

  try {
    const result = await db.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        ok: false,
        mensaje: "Usuario no encontrado"
      });
    }

    const usuario = result.rows[0];

    const coincide = await bcrypt.compare(password, usuario.password);

    if (!coincide) {
      // guardar intento fallido
      try {
        await db.query(
          "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
          [usuario.id, false]
        );
      } catch (err) {
        console.error("Error guardando intento fallido:", err);
      }

      return res.status(401).json({
        ok: false,
        mensaje: "Contraseña incorrecta"
      });
    }

    // 🔐 TOKEN CON ROL REAL
    const token = generarToken(usuario.id, usuario.rol_id);

    // guardar intento exitoso
    try {
      await db.query(
        "INSERT INTO login (usuario_id, exito) VALUES ($1, $2)",
        [usuario.id, true]
      );
    } catch (err) {
      console.error("Error guardando intento exitoso:", err);
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Login exitoso",
      token,
      rol: usuario.rol_id, // 🔥 CLAVE
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre
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