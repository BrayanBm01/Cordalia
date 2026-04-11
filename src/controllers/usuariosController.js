const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, email, password, rol_id } = req.body;

  try {
    // 🔐 Si viene password → encriptar
    let hashedPassword = null;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    let result;

    if (password) {
      // 👉 actualizar TODO
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