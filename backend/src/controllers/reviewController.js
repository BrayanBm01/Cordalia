const ReviewModel = require("../models/reviewModel");
const BusinessModel = require("../models/businessModel");
const { sanitizeString } = require("../utils/validators");

const ESTADOS_REVIEW = ["active", "hidden", "deleted"];
const COMENTARIO_MAX = 2000;

function parseId(val) {
  const n = Number(val);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseRating(val) {
  const n = Number(val);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

async function businessVisible(business, req) {
  if (!business) return false;
  const rol = req.usuario?.rol || null;
  if (rol === "ADMIN") return true;
  return business.estado === "approved";
}

// GET /api/reviews/business/:businessId — pública (solo negocios visibles)
exports.listForBusiness = async (req, res) => {
  try {
    const businessId = parseId(req.params.businessId);
    if (!businessId) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }
    const business = await BusinessModel.findById(businessId);
    if (!(await businessVisible(business, req))) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    const [stats, resenas] = await Promise.all([
      ReviewModel.statsByBusiness(businessId),
      ReviewModel.listByBusiness(businessId, req.usuario?.id || null),
    ]);
    return res.json({ success: true, data: { promedio: stats.promedio, cantidad: stats.cantidad, resenas } });
  } catch (error) {
    console.error("Error listar reseñas:", error);
    return res.status(500).json({ success: false, message: "Error al obtener reseñas" });
  }
};

// POST /api/reviews/business/:businessId — autenticado
exports.create = async (req, res) => {
  try {
    const businessId = parseId(req.params.businessId);
    if (!businessId) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }
    const business = await BusinessModel.findById(businessId);
    if (!(await businessVisible(business, req))) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    const rating = parseRating(req.body?.rating);
    if (!rating) {
      return res.status(400).json({ success: false, message: "La puntuación debe ser un número entre 1 y 5" });
    }
    const comment = sanitizeString(req.body?.comment || "").slice(0, COMENTARIO_MAX);
    if (await ReviewModel.findActiveByUserAndBusiness(req.usuario.id, businessId)) {
      return res.status(409).json({ success: false, message: "Ya has reseñado este negocio" });
    }
    const review = await ReviewModel.create(req.usuario.id, businessId, rating, comment || null);
    const stats = await ReviewModel.statsByBusiness(businessId);
    return res.status(201).json({ success: true, message: "Reseña publicada", data: { review, promedio: stats.promedio, cantidad: stats.cantidad } });
  } catch (error) {
    console.error("Error crear reseña:", error);
    return res.status(500).json({ success: false, message: "Error al crear la reseña" });
  }
};

// PUT /api/reviews/:id — dueño de la reseña o ADMIN
exports.update = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reseña inválido" });
    }
    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Reseña no encontrada" });
    }
    if (req.usuario.rol !== "ADMIN" && review.user_id !== req.usuario.id) {
      return res.status(403).json({ success: false, message: "No puedes editar una reseña ajena" });
    }
    const data = {};
    if (req.body?.rating !== undefined) {
      const rating = parseRating(req.body.rating);
      if (!rating) {
        return res.status(400).json({ success: false, message: "La puntuación debe ser un número entre 1 y 5" });
      }
      data.rating = rating;
    }
    if (req.body?.comment !== undefined) {
      const c = sanitizeString(req.body.comment).slice(0, COMENTARIO_MAX);
      data.comment = c === "" ? null : c;
    }
    const updated = await ReviewModel.update(id, data);
    const stats = await ReviewModel.statsByBusiness(review.business_id);
    return res.json({ success: true, message: "Reseña actualizada", data: { review: updated, promedio: stats.promedio, cantidad: stats.cantidad } });
  } catch (error) {
    console.error("Error actualizar reseña:", error);
    return res.status(500).json({ success: false, message: "Error al actualizar la reseña" });
  }
};

// DELETE /api/reviews/:id — dueño de la reseña o ADMIN (moderación)
exports.remove = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reseña inválido" });
    }
    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Reseña no encontrada" });
    }
    if (req.usuario.rol !== "ADMIN" && review.user_id !== req.usuario.id) {
      return res.status(403).json({ success: false, message: "No puedes eliminar una reseña ajena" });
    }
    await ReviewModel.remove(id);
    return res.json({ success: true, message: "Reseña eliminada" });
  } catch (error) {
    console.error("Error eliminar reseña:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar la reseña" });
  }
};

// PUT /api/reviews/:id/moderar — solo ADMIN (ocultar/eliminar/activar)
exports.moderar = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reseña inválido" });
    }
    const estado = sanitizeString(req.body?.estado || "");
    if (!ESTADOS_REVIEW.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado de moderación inválido" });
    }
    const updated = await ReviewModel.setEstado(id, estado);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Reseña no encontrada" });
    }
    return res.json({ success: true, message: "Reseña moderada", data: updated });
  } catch (error) {
    console.error("Error moderar reseña:", error);
    return res.status(500).json({ success: false, message: "Error al moderar la reseña" });
  }
};

// POST /api/reviews/:id/reply — dueño del negocio o ADMIN
exports.addReply = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reseña inválido" });
    }
    const review = await ReviewModel.findById(id);
    if (!review || review.estado !== "active") {
      return res.status(404).json({ success: false, message: "Reseña no encontrada" });
    }
    const isOwner = review.business_owner_id === req.usuario.id;
    if (req.usuario.rol !== "ADMIN" && !isOwner) {
      return res.status(403).json({ success: false, message: "Solo el dueño del negocio puede responder la reseña" });
    }
    if (await ReviewModel.findReplyByReview(id)) {
      return res.status(409).json({ success: false, message: "Esta reseña ya tiene una respuesta" });
    }
    const reply = sanitizeString(req.body?.reply || "");
    if (!reply) {
      return res.status(400).json({ success: false, message: "La respuesta no puede estar vacía" });
    }
    if (reply.length > COMENTARIO_MAX) {
      return res.status(400).json({ success: false, message: `La respuesta no puede superar ${COMENTARIO_MAX} caracteres` });
    }
    const created = await ReviewModel.addReply(id, req.usuario.id, reply);
    return res.status(201).json({ success: true, message: "Respuesta publicada", data: created });
  } catch (error) {
    console.error("Error responder reseña:", error);
    return res.status(500).json({ success: false, message: "Error al responder la reseña" });
  }
};

// DELETE /api/reviews/:id/reply — dueño del negocio o ADMIN
exports.removeReply = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reseña inválido" });
    }
    const review = await ReviewModel.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Reseña no encontrada" });
    }
    const isOwner = review.business_owner_id === req.usuario.id;
    if (req.usuario.rol !== "ADMIN" && !isOwner) {
      return res.status(403).json({ success: false, message: "Solo el dueño del negocio puede gestionar la respuesta" });
    }
    const removed = await ReviewModel.removeReplyByReview(id);
    if (!removed) {
      return res.status(404).json({ success: false, message: "La reseña no tiene respuesta" });
    }
    return res.json({ success: true, message: "Respuesta eliminada" });
  } catch (error) {
    console.error("Error eliminar respuesta:", error);
    return res.status(500).json({ success: false, message: "Error al eliminar la respuesta" });
  }
};

// GET /api/reviews — solo ADMIN (moderación)
exports.adminList = async (req, res) => {
  try {
    const reviews = await ReviewModel.listRecent();
    return res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Error listar reseñas admin:", error);
    return res.status(500).json({ success: false, message: "Error al obtener reseñas" });
  }
};