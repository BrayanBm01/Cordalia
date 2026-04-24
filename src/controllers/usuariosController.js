const pool = require("../config/db");
const bcrypt = require("bcryptjs");

// REGISTRO
const register = async (req, res) => {
  let { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  try {
    nombre = nombre.trim();
    email = email.trim();
    password = password.trim();

    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, hashedPassword, 1]
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

// CREAR USUARIO (ADMIN)
const createUsuario = async (req, res) => {
  let { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    nombre = nombre.trim();
    email = email.trim();
    password = password.trim();

    const existe = await pool.query(
      "SELECT id FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const rolFinal = rol_id == 0 ? 0 : 1;

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre, email, hashedPassword, rolFinal]
    );

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error creando usuario:", error);
    return res.status(500).json({ mensaje: "Error al crear usuario" });
  }
};

// OBTENER TODOS
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios ORDER BY id ASC"
    );

    return res.status(200).json(result.rows);

  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// OBTENER POR ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;

  try {
    //  VALIDACIÓN CLAVE
    if (req.usuario.rol !== "ADMIN" && req.usuario.id != id) {
      return res.status(403).json({
        mensaje: "No tienes permiso para ver este usuario"
      });
    }

    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json(result.rows[0]);

  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

// ACTUALIZAR
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  let { nombre, email, password, rol_id } = req.body;

  // VALIDACIÓN
  if (req.usuario.rol !== "ADMIN" && req.usuario.id != id) {
    return res.status(403).json({
      mensaje: "No tienes permiso para editar este usuario"
    });
  }

  // USER NO PUEDE CAMBIAR ROL
  if (req.usuario.rol !== "ADMIN") {
    rol_id = 1;
  }

  if (!nombre || !email || rol_id === undefined) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  try {
    nombre = nombre.trim();
    email = email.trim();

    let result;

    if (password && password.trim().length > 0) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);

      result = await pool.query(
        `UPDATE usuarios 
         SET nombre=$1, email=$2, password=$3, rol_id=$4
         WHERE id=$5
         RETURNING id, nombre, email, rol_id`,
        [nombre, email, hashedPassword, rol_id, id]
      );
    } else {
      result = await pool.query(
        `UPDATE usuarios 
         SET nombre=$1, email=$2, rol_id=$3
         WHERE id=$4
         RETURNING id, nombre, email, rol_id`,
        [nombre, email, rol_id, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json({
      mensaje: "Usuario actualizado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    return res.status(500).json({ mensaje: "Error al actualizar usuario" });
  }
};

// ELIMINAR
const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM usuarios WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json({
      mensaje: "Usuario eliminado correctamente"
    });

  } catch (error) {
    return res.status(500).json({ mensaje: error.message });
  }
};

module.exports = {
  register,
  createUsuario,
  getUsuarios,
  getUsuarioById,
  updateUsuario,
  deleteUsuario
};