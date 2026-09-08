const PlanModel = require("../models/planModel");
const LugarModel = require("../models/lugarModel");
const PromotionModel = require("../models/promotionModel");
const { slugify } = require("../utils/slug");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");

const ESTADOS = ["activo", "inactivo"];
const TIPOS_PRECIO = ["por_persona", "por_pareja", "por_grupo", "precio_total"];
const TIPOS_PLAN = ["plan", "paquete", "experiencia"];
const URL_RE = /^https?:\/\/.+/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// El router de negocio se monta bajo /:id, por lo que el id del negocio llega
// como req.params.id (mergeParams). En rutas públicas no hay id de negocio.
function getBusinessId(req) {
  return req.params.businessId || req.params.id;
}

const INCLUYE_MAX = 50;
const INCLUYE_ITEM_MAX = 80;
const DIAS_MAX = 60;
const ACTIVIDADES_MAX = 60;
const DESCRIPCION_MAX = 5000;
const ACTIVIDAD_DESC_MAX = 300;

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

async function uniqueSlugFor(nombre, excludeId = null) {
  const base = slugify(nombre);
  if (!base) throw { status: 400, message: "No se pudo generar un slug válido desde el nombre" };
  let candidate = base;
  let suffix = 2;
  while (await PlanModel.existsBySlug(candidate, excludeId)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

function validarItinerario(val) {
  if (!Array.isArray(val)) return { error: { status: 400, message: "El itinerario debe ser un arreglo de días" } };
  const dias = val.slice(0, DIAS_MAX);
  const out = [];
  for (let i = 0; i < dias.length; i++) {
    const d = dias[i];
    if (!d || typeof d !== "object") {
      return { error: { status: 400, message: `El día ${i + 1} del itinerario es inválido` } };
    }
    const dia = Number(d.dia);
    if (!Number.isInteger(dia) || dia < 1) {
      return { error: { status: 400, message: `El día ${i + 1} debe tener un número de día válido` } };
    }
    const actividadesRaw = Array.isArray(d.actividades) ? d.actividades.slice(0, ACTIVIDADES_MAX) : [];
    const actividades = [];
    for (const act of actividadesRaw) {
      if (!act || typeof act !== "object") {
        return { error: { status: 400, message: `Actividad inválida en el día ${dia}` } };
      }
      const descripcion = sanitizeString(act.descripcion || "");
      if (!descripcion || descripcion.length > ACTIVIDAD_DESC_MAX) {
        return { error: { status: 400, message: `Descripción de actividad inválida en el día ${dia}` } };
      }
      const hora = act.hora != null && act.hora !== "" ? String(act.hora) : null;
      if (hora && !TIME_RE.test(hora)) {
        return { error: { status: 400, message: `Hora inválida (HH:MM) en el día ${dia}` } };
      }
      actividades.push({ hora, descripcion });
    }
    out.push({ dia, actividades });
  }
  return { data: out };
}

function validarIncluye(val) {
  if (!Array.isArray(val)) return { error: { status: 400, message: "Los incluidos deben ser un arreglo" } };
  if (val.length > INCLUYE_MAX) {
    return { error: { status: 400, message: `Máximo ${INCLUYE_MAX} elementos incluidos` } };
  }
  const out = [];
  for (const item of val) {
    const s = sanitizeString(item).slice(0, INCLUYE_ITEM_MAX);
    if (!s) return { error: { status: 400, message: "Hay un elemento incluido vacío" } };
    out.push(s);
  }
  return { data: out };
}

function validarPlan(body, esCreacion = false) {
  let {
    nombre, descripcion, destination_id, destino, duracion_dias, duracion_noches,
    precio, tipo_precio, precio_anterior, tipo_plan, incluye, itinerario, moneda,
  } = body || {};

  const data = {};

  if (nombre !== undefined) {
    nombre = sanitizeString(nombre);
    if (!isNonEmptyString(nombre, 2, 200)) {
      return { error: { status: 400, message: "El nombre del plan debe tener entre 2 y 200 caracteres" } };
    }
    data.nombre = nombre;
  } else if (esCreacion) {
    return { error: { status: 400, message: "El nombre del plan es obligatorio" } };
  }

  if (descripcion !== undefined) {
    const d = sanitizeString(descripcion).slice(0, DESCRIPCION_MAX);
    data.descripcion = d === "" ? null : d;
  }

  if (destination_id !== undefined) {
    if (destination_id === null || destination_id === "") {
      data.destination_id = null;
    } else {
      const did = Number(destination_id);
      if (!Number.isInteger(did) || did <= 0) {
        return { error: { status: 400, message: "Destino inválido" } };
      }
      data.destination_id = did;
    }
  } else if (esCreacion) {
    data.destination_id = null;
  }

  if (destino !== undefined) {
    const d = sanitizeString(destino).slice(0, 200);
    data.destino = d === "" ? null : d;
  }

  if (duracion_dias !== undefined) {
    const n = Number(duracion_dias);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      return { error: { status: 400, message: "Los días de duración deben ser un entero entre 1 y 365" } };
    }
    data.duracion_dias = n;
  } else if (esCreacion) {
    return { error: { status: 400, message: "La duración en días es obligatoria" } };
  }

  if (duracion_noches !== undefined) {
    const n = Number(duracion_noches);
    if (!Number.isInteger(n) || n < 0 || n > 365) {
      return { error: { status: 400, message: "Las noches deben ser un entero entre 0 y 365" } };
    }
    data.duracion_noches = n;
  } else if (esCreacion) {
    data.duracion_noches = 0;
  }

  if (precio !== undefined) {
    const p = parseNumber(precio);
    if (p === null || Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "El precio debe ser un número mayor o igual a 0" } };
    }
    data.precio = p;
  } else if (esCreacion) {
    return { error: { status: 400, message: "El precio es obligatorio" } };
  }

  if (tipo_precio !== undefined) {
    const t = sanitizeString(tipo_precio).toLowerCase();
    if (!TIPOS_PRECIO.includes(t)) {
      return { error: { status: 400, message: "Tipo de precio inválido" } };
    }
    data.tipo_precio = t;
  } else if (esCreacion) {
    data.tipo_precio = "por_persona";
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

  if (tipo_plan !== undefined) {
    const t = sanitizeString(tipo_plan).toLowerCase();
    if (!TIPOS_PLAN.includes(t)) {
      return { error: { status: 400, message: "Tipo de plan inválido" } };
    }
    data.tipo_plan = t;
  } else if (esCreacion) {
    data.tipo_plan = "plan";
  }

  if (incluye !== undefined) {
    const r = validarIncluye(incluye);
    if (r.error) return { error: r.error };
    data.incluye = r.data;
  } else if (esCreacion) {
    data.incluye = [];
  }

  if (itinerario !== undefined) {
    const r = validarItinerario(itinerario);
    if (r.error) return { error: r.error };
    data.itinerario = r.data;
  } else if (esCreacion) {
    data.itinerario = [];
  }

  if (moneda !== undefined) {
    const m = sanitizeString(moneda).toUpperCase();
    data.moneda = m === "" ? null : m;
    if (data.moneda && !/^[A-Z]{3}$/.test(data.moneda)) {
      return { error: { status: 400, message: "Moneda inválida (3 letras)" } };
    }
  } else if (esCreacion) {
    data.moneda = "COP";
  }

  if (data.precio != null && data.precio_anterior != null && data.precio_anterior < data.precio) {
    return { error: { status: 400, message: "El precio anterior no puede ser menor que el precio actual" } };
  }

  return { data };
}

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
}

// Para listados anidados: owner/admin pueden ver todo; el resto solo activo.
function isOwnerView(req, business) {
  const rol = req.usuario?.rol;
  if (!rol || rol === "TOURIST") return false;
  if (rol === "ADMIN") return true;
  return business.owner_id === req.usuario.id;
}

// ---------- Listado ----------
exports.list = async (req, res) => {
  try {
    const businessId = getBusinessId(req) ? Number(getBusinessId(req)) : null;
    if (businessId && !Number.isInteger(businessId)) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }

    const ownerView = businessId ? isOwnerView(req, req.business) : false;
    const visible = businessId ? !ownerView : true;

    const plans = await PlanModel.listWithImages({
      businessId,
      visible,
      search: req.query.search ? sanitizeString(req.query.search).slice(0, 120) : null,
      destinationId: req.query.destino ? Number(req.query.destino) || null : null,
      dias: req.query.dias ? Number(req.query.dias) || null : null,
      diasMin: req.query.dias_min != null && req.query.dias_min !== "" ? Number(req.query.dias_min) : null,
      diasMax: req.query.dias_max != null && req.query.dias_max !== "" ? Number(req.query.dias_max) : null,
      incluye: Array.isArray(req.query.incluye) ? req.query.incluye : req.query.incluye ? [req.query.incluye] : [],
      precioMin: req.query.precio_min != null && req.query.precio_min !== "" ? Number(req.query.precio_min) : null,
      precioMax: req.query.precio_max != null && req.query.precio_max !== "" ? Number(req.query.precio_max) : null,
      tipoPlan: req.query.tipo ? sanitizeString(req.query.tipo).toLowerCase() : null,
      promos: req.query.promos === "1" || req.query.promos === "true",
      limit: 200,
    });

    return res.json({ success: true, data: plans });
  } catch (error) {
    return serverError(res, error, "list planes");
  }
};

// ---------- Detalle ----------
exports.getById = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ success: false, message: "ID de plan inválido" });
    }

    let plan;
    if (getBusinessId(req)) {
      const businessId = Number(getBusinessId(req));
      plan = await PlanModel.findByBusinessAndId(businessId, planId);
      if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
      const ownerView = isOwnerView(req, req.business);
      if (!ownerView && plan.estado !== "activo") {
        return res.status(404).json({ success: false, message: "Plan no encontrado" });
      }
    } else {
      plan = await PlanModel.findById(planId, true);
      if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    }

    const promocionesActivas = getBusinessId(req) ? [] : await PromotionModel.listActiveByPlan(plan.id);
    return res.json({ success: true, data: { ...plan, promociones: promocionesActivas } });
  } catch (error) {
    return serverError(res, error, "getById plan");
  }
};

// ---------- Crear ----------
exports.create = async (req, res) => {
  try {
    const businessId = Number(getBusinessId(req));
    if (!Number.isInteger(businessId)) {
      return res.status(400).json({ success: false, message: "ID de negocio inválido" });
    }

    const { error, data } = validarPlan(req.body, true);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (data.destination_id) {
      const destino = await LugarModel.findById(data.destination_id);
      if (!destino) {
        return res.status(400).json({ success: false, message: "El destino seleccionado no existe" });
      }
    }

    const slug = await uniqueSlugFor(data.nombre);
    const plan = await PlanModel.create({ ...data, business_id: businessId, slug });

    return res.status(201).json({
      success: true,
      message: "Plan creado correctamente",
      data: plan,
    });
  } catch (error) {
    return serverError(res, error, "create plan");
  }
};

// ---------- Actualizar ----------
exports.update = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const businessId = Number(getBusinessId(req));
    const plan = await PlanModel.findByBusinessAndId(businessId, planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });

    const { error, data } = validarPlan(req.body);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    if (data.nombre && data.nombre !== plan.nombre) {
      data.slug = await uniqueSlugFor(data.nombre, planId);
    }

    if (data.destination_id) {
      const destino = await LugarModel.findById(data.destination_id);
      if (!destino) {
        return res.status(400).json({ success: false, message: "El destino seleccionado no existe" });
      }
    }

    const updated = await PlanModel.update(planId, data);
    return res.json({ success: true, message: "Plan actualizado correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "update plan");
  }
};

// ---------- Estado (activar/desactivar) ----------
exports.setEstado = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const businessId = Number(getBusinessId(req));
    const { estado } = req.body || {};
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }
    const plan = await PlanModel.findByBusinessAndId(businessId, planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    const updated = await PlanModel.setEstado(planId, estado);
    return res.json({ success: true, message: "Estado actualizado correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "setEstado plan");
  }
};

// ---------- Eliminar ----------
exports.remove = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const businessId = Number(getBusinessId(req));
    const deleted = await PlanModel.delete(planId, businessId);
    if (!deleted) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    return res.json({ success: true, message: "Plan eliminado correctamente" });
  } catch (error) {
    return serverError(res, error, "remove plan");
  }
};

// ---------- Imágenes ----------
exports.listImages = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const imagenes = await PlanModel.listImages(planId);
    return res.json({ success: true, data: imagenes });
  } catch (error) {
    return serverError(res, error, "listImages plan");
  }
};

exports.addImage = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const { url, alt_text, is_primary, orden } = req.body || {};
    if (!isNonEmptyString(url, 1, 2000) || !URL_RE.test(url)) {
      return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
    }
    if (!(await PlanModel.findByBusinessAndId(Number(getBusinessId(req)), planId))) {
      return res.status(404).json({ success: false, message: "Plan no encontrado" });
    }
    const imagen = await PlanModel.addImage(
      planId,
      url.trim(),
      sanitizeString(alt_text).slice(0, 250) || null,
      Boolean(is_primary),
      Number.isInteger(Number(orden)) ? Number(orden) : 0
    );
    return res.status(201).json({ success: true, message: "Imagen agregada", data: imagen });
  } catch (error) {
    return serverError(res, error, "addImage plan");
  }
};

exports.setPrimaryImage = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const ok = await PlanModel.setPrimaryImage(Number(req.params.imageId), planId);
    if (!ok) return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    return res.json({ success: true, message: "Imagen principal actualizada" });
  } catch (error) {
    return serverError(res, error, "setPrimaryImage plan");
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const ok = await PlanModel.deleteImage(Number(req.params.imageId), planId);
    if (!ok) return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    return res.json({ success: true, message: "Imagen eliminada" });
  } catch (error) {
    return serverError(res, error, "deleteImage plan");
  }
};

module.exports.isValidDateString = isValidDateString;
module.exports.parseNumber = parseNumber;
module.exports.URL_RE = URL_RE;