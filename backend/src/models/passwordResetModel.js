// ============================================================
// passwordResetModel — tokens de recuperacion de contrasena.
// ------------------------------------------------------------
// Seguridad:
//   * El token NUNCA se guarda en claro: solo su SHA-256.
//   * Es de UN SOLO USO (se marca `usado_en` al consumirlo).
//   * Caduca en 1 hora.
//   * Se genera con crypto.randomBytes (criptograficamente seguro).
// ============================================================
const crypto = require("crypto");
const pool = require("../config/db");

const MINUTOS_VALIDEZ = 60;

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

const PasswordResetModel = {
  MINUTOS_VALIDEZ,

  /** Genera un token, invalida los anteriores del usuario y guarda el hash. */
  async crearToken(usuarioId) {
    const token = crypto.randomBytes(32).toString("hex");
    // Los tokens previos del mismo usuario quedan invalidados.
    await pool.query(
      "UPDATE password_reset_tokens SET usado_en = NOW() WHERE usuario_id = $1 AND usado_en IS NULL",
      [usuarioId]
    );
    const { rows } = await pool.query(
      `INSERT INTO password_reset_tokens (usuario_id, token_hash, expira_en)
       VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)
       RETURNING id, usuario_id, expira_en, creado_en`,
      [usuarioId, hashToken(token), String(MINUTOS_VALIDEZ)]
    );
    return { token, registro: rows[0] };
  },

  /** Valida y CONSUME un token. Devuelve el usuario o null. */
  async consumirToken(token) {
    if (!token || typeof token !== "string") return null;
    const { rows } = await pool.query(
      `UPDATE password_reset_tokens
          SET usado_en = NOW()
        WHERE token_hash = $1
          AND usado_en IS NULL
          AND expira_en > NOW()
      RETURNING usuario_id, expira_en`,
      [hashToken(token)]
    );
    if (rows.length === 0) return null;
    return rows[0];
  },

  /** Limpia los tokens vencidos o usados (mantenimiento). */
  async limpiarTokens() {
    const { rowCount } = await pool.query(
      "DELETE FROM password_reset_tokens WHERE expira_en < NOW() - interval '1 day'"
    );
    return rowCount;
  },
};

module.exports = PasswordResetModel;
