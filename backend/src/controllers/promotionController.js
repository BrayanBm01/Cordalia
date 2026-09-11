const PromotionModel = require("../models/promotionModel");
const PlanModel = require("../models/planModel");
const pool = require("../config/db");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");

const ESTADOS = ["activo", "inactivo"];
const TIPOS_DESCUENTO = ["porcentaje", "valor"];
const URL_RE = /^https?:\/\/.+/i;
const IMAGEN_MAX_BYTES = 1500 * 1024; // 1.5 MB por imagen
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const NOMBRE_MAX = 150;
const DESCRIPCION_MAX = 2000;

// El router se monta bajo /:id; ver planController.getBusinessId.
function getBusinessId(req) {
  return req.params.businessId || req.params.id;
}

function parseNumber(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

function isValidDateString(val) {
  if (typeof val !== "string" || !FECHA_RE.test(val)) return false;
  const d = new Date(val + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

function validarImagenDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) return "Imagen inválida: formato no reconocido";
  const mime = match[1].toLowerCase();
  if (!IMAGENES_PERMITIDAS.includes(mime)) {
    return `Imagen inválida: solo se permiten ${IMAGENES_PERMITIDAS.join(", ")}`;
  }
  const contenido = match[2];
  if (!contenido) return "Imagen inválida: datos de imagen vacíos";
  const approxBytes = Math.floor((contenido.length * 3) / 4) - (contenido.endsWith("==") ? 2 : contenido.endsWith("=") ? 1 : 0);
  if (approxBytes > IMAGEN_MAX_BYTES) return "Imagen demasiado grande: máximo 1.5 MB";
  return null;
}

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
}

// owner/admin pueden ver todas; el resto solo activas vigentes.
function isOwnerView(req, business) {
  const rol = req.usuario?.rol;
  if (!rol || rol === "TOURIST") return false;
  if (rol === "ADMIN") return true;
  return business.owner_id === req.usuario.id;
}

async function validarPromo(body, business, esCreacion = false) {
  let {
    plan_id, service_id, nombre, descripcion, tipo_descuento, valor_descuento,
    precio_anterior, precio_promocional, imagen_url, fecha_inicio, fecha_fin, estado,
  } = body || {};

  const data = {};

  if (estado !== undefined) {
    const e = sanitizeString(estado).toLowerCase();
    if (!ESTADOS.includes(e)) {
      return { error: { status: 400, message: "Estado inválido" } };
    }
    data.estado = e;
  } else if (esCreacion) {
    data.estado = "activo";
  }

  if (nombre !== undefined) {
    nombre = sanitizeString(nombre);
    if (!isNonEmptyString(nombre, 2, NOMBRE_MAX)) {
      return { error: { status: 400, message: `El nombre debe tener entre 2 y ${NOMBRE_MAX} caracteres` } };
    }
    data.nombre = nombre;
  } else if (esCreacion) {
    return { error: { status: 400, message: "El nombre de la promoción es obligatorio" } };
  }

  if (descripcion !== undefined) {
    const d = sanitizeString(descripcion).slice(0, DESCRIPCION_MAX);
    data.descripcion = d === "" ? null : d;
  }

  if (plan_id !== undefined) {
    if (plan_id === null || plan_id === "") data.plan_id = null;
    else {
      const pid = Number(plan_id);
      if (!Number.isInteger(pid) || pid <= 0) {
        return { error: { status: 400, message: "Plan relacionado inválido" } };
      }
      data.plan_id = pid;
    }
  }

  if (service_id !== undefined) {
    if (service_id === null || service_id === "") data.service_id = null;
    else {
      const sid = Number(service_id);
      if (!Number.isInteger(sid) || sid <= 0) {
        return { error: { status: 400, message: "Servicio relacionado inválido" } };
      }
      data.service_id = sid;
    }
  }

  if (esCreacion || plan_id !== undefined || service_id !== undefined) {
    const tienePlan = data.plan_id != null;
    const tieneServicio = data.service_id != null;
    if (!tienePlan && !tieneServicio) {
      return { error: { status: 400, message: "Debes relacionar un plan o un servicio" } };
    }
    if (tienePlan) {
      const plan = await PlanModel.findByBusinessAndId(business.id, data.plan_id);
      if (!plan) {
        return { error: { status: 400, message: "El plan relacionado no pertenece a este negocio" } };
      }
    }
    if (tieneServicio) {
      const { rows } = await pool.query(
        "SELECT id FROM business_services WHERE id = $1 AND business_id = $2 LIMIT 1",
        [data.service_id, business.id]
      );
      if (rows.length === 0) {
        return { error: { status: 400, message: "El servicio relacionado no pertenece a este negocio" } };
      }
    }
  }

  if (tipo_descuento !== undefined) {
    const t = sanitizeString(tipo_descuento).toLowerCase();
    if (!TIPOS_DESCUENTO.includes(t)) {
      return { error: { status: 400, message: "Tipo de descuento inválido" } };
    }
    data.tipo_descuento = t;
  } else if (esCreacion) {
    data.tipo_descuento = "porcentaje";
  }

  if (valor_descuento !== undefined) {
    const p = parseNumber(valor_descuento);
    if (p === null || Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "El valor del descuento debe ser mayor o igual a 0" } };
    }
    data.valor_descuento = p;
  } else if (esCreacion) {
    return { error: { status: 400, message: "El valor del descuento es obligatorio" } };
  }

  const descuento = data.valor_descuento;
  if (descuento != null && (data.tipo_descuento || "porcentaje") === "porcentaje" && descuento > 100) {
    return { error: { status: 400, message: "El porcentaje de descuento no puede superar 100" } };
  }

  if (precio_anterior !== undefined && precio_anterior !== null && precio_anterior !== "") {
    const p = parseNumber(precio_anterior);
    if (Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "El precio anterior debe ser un número mayor o igual a 0" } };
    }
    data.precio_anterior = p;
  } else if (precio_anterior === "" || precio_anterior === null) {
    data.precio_anterior = null;
  }

  if (precio_promocional !== undefined && precio_promocional !== null && precio_promocional !== "") {
    const p = parseNumber(precio_promocional);
    if (Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "El precio promocional debe ser un número mayor o igual a 0" } };
    }
    data.precio_promocional = p;
  } else if (precio_promocional === "" || precio_promocional === null) {
    data.precio_promocional = null;
  }

  if (data.precio_anterior != null && data.precio_promocional != null && data.precio_promocional > data.precio_anterior) {
    return { error: { status: 400, message: "El precio promocional no puede ser mayor que el anterior" } };
  }

  if (imagen_url !== undefined) {
    const i = sanitizeString(imagen_url);
    data.imagen_url = i === "" ? null : i;
    if (data.imagen_url && !URL_RE.test(data.imagen_url)) {
      const errorImg = validarImagenDataUrl(data.imagen_url);
      if (errorImg) {
        return { error: { status: 400, message: errorImg } };
      }
    }
  } else if (esCreacion) {
    data.imagen_url = null;
  }

  for (const field of ["fecha_inicio", "fecha_fin"]) {
    if (body[field] !== undefined) {
      if (!isValidDateString(body[field])) {
        return { error: { status: 400, message: `La ${field === "fecha_inicio" ? "fecha de inicio" : "fecha final"} debe tener formato YYYY-MM-DD` } };
      }
      data[field] = body[field];
    } else if (esCreacion) {
      return { error: { status: 400, message: `${field === "fecha_inicio" ? "La fecha de inicio" : "La fecha final"} es obligatoria` } };
    }
  }

  if (data.fecha_inicio && data.fecha_fin && data.fecha_fin < data.fecha_inicio) {
    return { error: { status: 400, message: "La fecha final no puede ser anterior a la fecha de inicio" } };
  }

  return { data };
}

// ---------- Listado ----------
exports.list = async (req, res) => {
  try {
    const businessId = Number(getBusinessId(req));
    const ownerView = isOwnerView(req, req.business);
    const promos = await PromotionModel.list(businessId, !ownerView);
    return res.json({ success: true, data: promos });
  } catch (error) {
    return serverError(res, error, "list promociones");
  }
};

// ---------- Detalle (owner) ----------
exports.getById = async (req, res) => {
  try {
    const promoId = Number(req.params.promoId);
    const businessId = Number(getBusinessId(req));
    if (!promoId || !Number.isInteger(promoId)) {
      return res.status(400).json({ success: false, message: "ID de promoción inválido" });
    }
    const promo = await PromotionModel.findByBusinessAndId(businessId, promoId);
    if (!promo) return res.status(404).json({ success: false, message: "Promoción no encontrada" });
    return res.json({ success: true, data: promo });
  } catch (error) {
    return serverError(res, error, "getById promo");
  }
};

// ---------- Crear ----------
exports.create = async (req, res) => {
  try {
    const businessId = Number(getBusinessId(req));
    const { error, data } = await validarPromo(req.body, req.business, true);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    const promo = await PromotionModel.create({ ...data, business_id: businessId });
    return res.status(201).json({
      success: true,
      message: "Promoción creada correctamente",
      data: promo,
    });
  } catch (error) {
    return serverError(res, error, "create promo");
  }
};

// ---------- Actualizar ----------
exports.update = async (req, res) => {
  try {
    const promoId = Number(req.params.promoId);
    const businessId = Number(getBusinessId(req));
    const existing = await PromotionModel.findByBusinessAndId(businessId, promoId);
    if (!existing) return res.status(404).json({ success: false, message: "Promoción no encontrada" });

    const { error, data } = await validarPromo(req.body, req.business);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    const updated = await PromotionModel.update(promoId, data);
    return res.json({ success: true, message: "Promoción actualizada correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "update promo");
  }
};

// ---------- Estado (activar/desactivar) ----------
exports.setEstado = async (req, res) => {
  try {
    const promoId = Number(req.params.promoId);
    const businessId = Number(getBusinessId(req));
    const { estado } = req.body || {};
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }
    const existing = await PromotionModel.findByBusinessAndId(businessId, promoId);
    if (!existing) return res.status(404).json({ success: false, message: "Promoción no encontrada" });
    const updated = await PromotionModel.setEstado(promoId, estado);
    return res.json({ success: true, message: "Estado actualizado correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "setEstado promo");
  }
};

// ---------- Eliminar ----------
exports.remove = async (req, res) => {
  try {
    const promoId = Number(req.params.promoId);
    const businessId = Number(getBusinessId(req));
    const deleted = await PromotionModel.delete(promoId, businessId);
    if (!deleted) return res.status(404).json({ success: false, message: "Promoción no encontrada" });
    return res.json({ success: true, message: "Promoción eliminada correctamente" });
  } catch (error) {
    return serverError(res, error, "remove promo");
  }
};

module.exports.isValidDateString = isValidDateString;
module.exports.parseNumber = parseNumber;
module.exports.URL_RE = URL_RE;