const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// REGISTRO (para el login.html)
const register = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  try {
    // Verificar si ya existe el usuario
    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // ASIGNAR ROL SEGÚN TU BD
    let rol_id = 1; // usuario por defecto

    if (rol === "admin" || rol == 0) {
      rol_id = 0; // admin en tu BD
    }

    // Insertar usuario
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, hashedPassword, rol_id]
    );

    return res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error en register:", error);
    return res.status(500).json({ mensaje: "Error en el servidor" });
  }
};

// Crear usuario manual (admin puede usar esto)
const createUsuario = async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validar rol_id (solo 0 o 1)
    let rolFinal = 1;
    if (rol_id == 0) {
      rolFinal = 0;
    }

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, hashedPassword, rolFinal]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener usuarios
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios"
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

//  Obtener usuario por ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Actualizar usuario
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE usuarios 
       SET nombre=$1, email=$2
       WHERE id=$3
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Eliminar usuario
const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
    res.json({ mensaje: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  register
};