const pool = require("../config/db");
const bcrypt = require("bcryptjs");


// REGISTRO (LOGIN)
const register = async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  try {
    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
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
      [nombre, email, hashedPassword, 1] // 👈 siempre usuario
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
};

//  CREAR USUARIO (ADMIN)
const createUsuario = async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: "Faltan datos" });
  }

  try {
    // verificar duplicado
    const existe = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({ mensaje: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const rolFinal = rol_id == 0 ? 0 : 1;

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol_id`,
      [nombre.trim(), email.trim(), hashedPassword, rolFinal]
    );

    res.json({
      mensaje: "Usuario creado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ mensaje: "Error al crear usuario" });
  }
};

// OBTENER TODOS
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre, email, rol_id FROM usuarios ORDER BY id ASC"
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// OBTENER POR ID
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

//  ACTUALIZAR (FIX 🔥)
const updateUsuario = async (req, res) => {
  const { id } = req.params;
  let { nombre, email, password, rol_id } = req.body;

  if (!nombre || !email || rol_id === undefined) {
    return res.status(400).json({ mensaje: "Datos incompletos" });
  }

  try {
    nombre = nombre.trim();
    email = email.trim();

    // limpiar password
    if (password) {
      password = password.trim();
    }

    let result;

    if (password && password.length > 0) {
      // 🔐 actualizar con password
      const hashedPassword = await bcrypt.hash(password, 10);

      result = await pool.query(
        `UPDATE usuarios 
         SET nombre=$1, email=$2, password=$3, rol_id=$4
         WHERE id=$5
         RETURNING id, nombre, email, rol_id`,
        [nombre, email, hashedPassword, rol_id, id]
      );

    } else {
      // 👉 actualizar sin password
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

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error("Error actualizando:", error);
    res.status(500).json({ mensaje: "Error al actualizar usuario" });
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

    res.json({ mensaje: "Usuario eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ mensaje: error.message });
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