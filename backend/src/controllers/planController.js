const PlanModel = require("../models/planModel");
const LugarModel = require("../models/lugarModel");
const PromotionModel = require("../models/promotionModel");
const UsuarioModel = require("../models/usuarioModel");
const pool = require("../config/db");
const { slugify } = require("../utils/slug");
const { isNonEmptyString, sanitizeString } = require("../utils/validators");

const poolQuery = pool.query.bind(pool);

const ESTADOS = ["activo", "inactivo"];
const TIPOS_PRECIO = ["por_persona", "por_pareja", "por_grupo", "precio_total"];
const TIPOS_PLAN = ["plan", "paquete", "experiencia"];
const URL_RE = /^https?:\/\/.+/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERSONAS = 200;
const MAX_RANGOS = 20;
const IMAGEN_MAX_BYTES = 1500 * 1024; // 1.5 MB por imagen
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

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

function validarDescuentosRango(val) {
  if (!Array.isArray(val)) {
    return { error: { status: 400, message: "Los descuentos por rango deben ser un arreglo" } };
  }
  if (val.length > MAX_RANGOS) {
    return { error: { status: 400, message: `Máximo ${MAX_RANGOS} rangos de descuento` } };
  }
  const out = [];
  for (let i = 0; i < val.length; i++) {
    const r = val[i];
    if (!r || typeof r !== "object") {
      return { error: { status: 400, message: `El rango ${i + 1} es inválido` } };
    }
    const min = Number(r.min);
    const max = r.max === null || r.max === undefined || r.max === "" ? Infinity : Number(r.max);
    const descuento = Number(r.descuento);
    if (!Number.isInteger(min) || min < 1) {
      return { error: { status: 400, message: `El rango ${i + 1} debe tener un mínimo de personas válido` } };
    }
    if (max !== Infinity && (!Number.isInteger(max) || max < min)) {
      return { error: { status: 400, message: `El rango ${i + 1} tiene un máximo inválido` } };
    }
    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      return { error: { status: 400, message: `El descuento del rango ${i + 1} debe estar entre 0 y 100` } };
    }
    out.push({ min, max: max === Infinity ? null : max, descuento });
  }
  return { data: out };
}

function validarPlan(body, esCreacion = false) {
  let {
    nombre, descripcion, destination_id, destino, duracion_dias, duracion_noches,
    precio, tipo_precio, precio_anterior, tipo_plan, incluye, itinerario, moneda,
    descuentos_rango, capacidad_referencial,
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

  if (descuentos_rango !== undefined) {
    const r = validarDescuentosRango(descuentos_rango);
    if (r.error) return { error: r.error };
    data.descuentos_rango = r.data;
  } else if (esCreacion) {
    data.descuentos_rango = [];
  }

  if (capacidad_referencial !== undefined && capacidad_referencial !== null && capacidad_referencial !== "") {
    const c = Number(capacidad_referencial);
    if (!Number.isInteger(c) || c < 1 || c > MAX_PERSONAS) {
      return { error: { status: 400, message: `La capacidad referencial debe ser un entero entre 1 y ${MAX_PERSONAS}` } };
    }
    data.capacidad_referencial = c;
  } else if (esCreacion || capacidad_referencial === "" || capacidad_referencial === null) {
    data.capacidad_referencial = null;
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
    const img = sanitizeString(url);
    const esUrl = URL_RE.test(img);
    const esDataUrl = /^data:image\//i.test(img);
    if (!isNonEmptyString(img, 1, 3000000) || (!esUrl && !esDataUrl)) {
      return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
    }
    if (esDataUrl) {
      const errorImg = validarImagenDataUrl(img);
      if (errorImg) return res.status(400).json({ success: false, message: errorImg });
    }
    if (!(await PlanModel.findByBusinessAndId(Number(getBusinessId(req)), planId))) {
      return res.status(404).json({ success: false, message: "Plan no encontrado" });
    }
    const imagen = await PlanModel.addImage(
      planId,
      img.trim(),
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

// ---------- Precio por personas (cálculo en vivo) ----------
exports.calcularPrecio = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ success: false, message: "ID de plan inválido" });
    }
    const personas = req.query.personas != null ? Number(req.query.personas) : 1;
    if (!Number.isInteger(personas) || personas < 1 || personas > MAX_PERSONAS) {
      return res.status(400).json({ success: false, message: `Las personas deben ser un entero entre 1 y ${MAX_PERSONAS}` });
    }
    const precio = await PlanModel.calcularPrecio(planId, personas, true);
    if (!precio) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    return res.json({ success: true, data: precio });
  } catch (error) {
    return serverError(res, error, "calcularPrecio plan");
  }
};

// ---------- Salidas (fechas con cupo) ----------
exports.listSalidas = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const ownerView = getBusinessId(req) ? isOwnerView(req, req.business) : false;
    const salidas = await PlanModel.listSalidas(planId, !ownerView);
    return res.json({ success: true, data: salidas });
  } catch (error) {
    return serverError(res, error, "listSalidas plan");
  }
};

exports.createSalida = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const { fecha, hora, cupo_maximo, fecha_limite } = req.body || {};
    const plan = await PlanModel.findByBusinessAndId(Number(getBusinessId(req)), planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    const validacion = validarSalida(req.body);
    if (validacion.error) return res.status(validacion.error.status).json({ success: false, message: validacion.error.message });
    const salida = await PlanModel.createSalida(planId, validacion.data);
    return res.status(201).json({ success: true, message: "Salida creada correctamente", data: salida });
  } catch (error) {
    return serverError(res, error, "createSalida plan");
  }
};

exports.updateSalida = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const plan = await PlanModel.findByBusinessAndId(Number(getBusinessId(req)), planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    const validacion = validarSalida(req.body, true);
    if (validacion.error) return res.status(validacion.error.status).json({ success: false, message: validacion.error.message });
    const updated = await PlanModel.updateSalida(salidaId, planId, validacion.data);
    if (!updated) return res.status(404).json({ success: false, message: "Salida no encontrada" });
    return res.json({ success: true, message: "Salida actualizada correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "updateSalida plan");
  }
};

exports.deleteSalida = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const ok = await PlanModel.deleteSalida(salidaId, planId);
    if (!ok) return res.status(404).json({ success: false, message: "Salida no encontrada" });
    return res.json({ success: true, message: "Salida eliminada correctamente" });
  } catch (error) {
    return serverError(res, error, "deleteSalida plan");
  }
};

// ---------- Inscripciones ----------
exports.listInscripciones = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const inscripciones = await PlanModel.listInscripciones(salidaId, planId);
    return res.json({ success: true, data: inscripciones });
  } catch (error) {
    return serverError(res, error, "listInscripciones plan");
  }
};

exports.resumenInscripciones = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const resumen = await PlanModel.resumenInscripciones(salidaId, planId);
    return res.json({ success: true, data: resumen });
  } catch (error) {
    return serverError(res, error, "resumenInscripciones plan");
  }
};

exports.createInscripcion = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const { personas, mensaje } = req.body || {};
    const p = Number(personas);
    if (!Number.isInteger(p) || p < 1 || p > MAX_PERSONAS) {
      return res.status(400).json({ success: false, message: "Las personas deben ser un entero entre 1 y " + MAX_PERSONAS });
    }
    let nombre = null;
    let email = null;
    if (req.usuario?.id) {
      const usuario = await UsuarioModel.findById(req.usuario.id);
      if (usuario) {
        nombre = usuario.nombre || null;
        email = usuario.email || null;
      }
    }
    const inscripcion = await PlanModel.createInscripcion(salidaId, planId, {
      personas: p,
      mensaje: sanitizeString(mensaje).slice(0, 2000) || null,
      user_id: req.usuario?.id || null,
      nombre,
      email,
    });
    return res.status(201).json({ success: true, message: "Inscripción registrada correctamente", data: inscripcion });
  } catch (error) {
    if (error && error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    return serverError(res, error, "createInscripcion plan");
  }
};

exports.cancelarInscripcion = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const inscripcionId = Number(req.params.inscripcionId);
    const ok = await PlanModel.cancelarInscripcion(inscripcionId, salidaId, planId);
    if (!ok) return res.status(404).json({ success: false, message: "Inscripción no encontrada" });
    return res.json({ success: true, message: "Inscripción cancelada correctamente" });
  } catch (error) {
    if (error && error.status) return res.status(error.status).json({ success: false, message: error.message });
    return serverError(res, error, "cancelarInscripcion plan");
  }
};

// ---------- Transporte por plan ----------
exports.listTransportes = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const transportes = await PlanModel.listTransportes(planId);
    return res.json({ success: true, data: transportes });
  } catch (error) {
    return serverError(res, error, "listTransportes plan");
  }
};

exports.sugerirTransporte = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const personas = req.query.personas != null ? Number(req.query.personas) : 1;
    if (!Number.isInteger(personas) || personas < 1 || personas > MAX_PERSONAS) {
      return res.status(400).json({ success: false, message: `Las personas deben ser un entero entre 1 y ${MAX_PERSONAS}` });
    }
    const sugerencia = await PlanModel.sugerirTransporte(planId, personas);
    if (!sugerencia) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    return res.json({ success: true, data: sugerencia });
  } catch (error) {
    return serverError(res, error, "sugerirTransporte plan");
  }
};

exports.addTransporte = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const { vehiculo_id, conductor_id, orden, notas } = req.body || {};
    const plan = await PlanModel.findByBusinessAndId(Number(getBusinessId(req)), planId);
    if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" });
    if (!Number.isInteger(Number(vehiculo_id)) || Number(vehiculo_id) <= 0) {
      return res.status(400).json({ success: false, message: "Vehículo inválido" });
    }
    const transporte = await PlanModel.addTransporte(
      planId,
      Number(vehiculo_id),
      conductor_id ? Number(conductor_id) : null,
      Number.isInteger(Number(orden)) ? Number(orden) : 0,
      sanitizeString(notas).slice(0, 1000) || null
    );
    return res.status(201).json({ success: true, message: "Transporte asignado al plan", data: transporte });
  } catch (error) {
    return serverError(res, error, "addTransporte plan");
  }
};

exports.deleteTransporte = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const transporteId = Number(req.params.transporteId);
    const ok = await PlanModel.deleteTransporte(transporteId, planId);
    if (!ok) return res.status(404).json({ success: false, message: "Transporte no encontrado" });
    return res.json({ success: true, message: "Transporte eliminado del plan" });
  } catch (error) {
    return serverError(res, error, "deleteTransporte plan");
  }
};

// ---------- Transporte por salida (asignación con disponibilidad) ----------
exports.sugerirTransporteSalida = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const sugerencia = await PlanModel.recomendarTransporteSalida(salidaId, planId);
    if (!sugerencia) return res.status(404).json({ success: false, message: "Salida no encontrada" });
    return res.json({ success: true, data: sugerencia });
  } catch (error) {
    return serverError(res, error, "sugerirTransporteSalida plan");
  }
};

exports.listSalidaTransportes = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const transportes = await PlanModel.listTransportesSalida(salidaId, planId);
    return res.json({ success: true, data: transportes });
  } catch (error) {
    return serverError(res, error, "listTransportesSalida plan");
  }
};

exports.asignarTransporteSalida = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const businessId = Number(getBusinessId(req));
    const { vehiculo_id, conductor_id } = req.body || {};

    if (!Number.isInteger(Number(vehiculo_id)) || Number(vehiculo_id) <= 0) {
      return res.status(400).json({ success: false, message: "Vehículo inválido" });
    }
    const conductorN = conductor_id != null && conductor_id !== "" ? Number(conductor_id) : null;
    if (conductorN != null && (!Number.isInteger(conductorN) || conductorN <= 0)) {
      return res.status(400).json({ success: false, message: "Conductor inválido" });
    }

    const salida = await PlanModel.findSalidaById(planId, salidaId);
    if (!salida) return res.status(404).json({ success: false, message: "Salida no encontrada" });
    const fecha = String(salida.fecha).slice(0, 10);

    // Validar que el vehículo sea de la flota del negocio y esté disponible.
    const { rows: vehiculos } = await poolQuery(
      `SELECT v.*, c.nombre AS conductor_nombre, c.telefono AS conductor_telefono
       FROM vehiculos v LEFT JOIN conductores c ON c.id = v.conductor_id
       WHERE v.id = $1 AND v.business_id = $2 LIMIT 1`,
      [Number(vehiculo_id), businessId]
    );
    const vehiculo = vehiculos[0];
    if (!vehiculo) return res.status(400).json({ success: false, message: "El vehículo no pertenece a este negocio" });
    if (String(vehiculo.estado === null ? "disponible" : vehiculo.estado) !== "disponible") {
      return res.status(400).json({ success: false, message: "El vehículo no está disponible" });
    }
    if (Number(vehiculo.capacidad) < (Number(salida.cupo_ocupado) || 0)) {
      return res.status(400).json({
        success: false,
        message: `El vehículo tiene capacidad para ${vehiculo.capacidad} personas y la salida lleva ${salida.cupo_ocupado} inscritas`,
      });
    }

    // Solapamiento: el vehículo no puede estar asignado a otra salida del
    // mismo negocio programada para el mismo día.
    const { rows: usadoVehiculo } = await poolQuery(
      `SELECT t.id, s.fecha FROM transportes t
       JOIN tour_plan_salidas s ON s.id = t.salida_id
       WHERE t.salida_id IS NOT NULL AND t.salida_id <> $1 AND t.vehiculo_id = $2
         AND s.fecha = $3
         AND s.plan_id IN (SELECT p.id FROM tour_plans p WHERE p.business_id = $4)
       LIMIT 1`,
      [salidaId, Number(vehiculo_id), fecha, businessId]
    );
    if (usadoVehiculo.length > 0) {
      return res.status(400).json({ success: false, message: "El vehículo ya está asignado a otra salida ese día" });
    }

    let conductorObj = null;
    if (conductorN != null) {
      const { rows: conds } = await poolQuery(
        `SELECT id, nombre, disponible FROM conductores WHERE id = $1 AND business_id = $2 LIMIT 1`,
        [conductorN, businessId]
      );
      const cond = conds[0];
      if (!cond) return res.status(400).json({ success: false, message: "El conductor no pertenece a este negocio" });
      if (!cond.disponible) return res.status(400).json({ success: false, message: "El conductor no está disponible" });
      // Solapamiento del conductor en otra salida del mismo día.
      const { rows: usadoConductor } = await poolQuery(
        `SELECT t.id FROM transportes t
         JOIN tour_plan_salidas s ON s.id = t.salida_id
         WHERE t.salida_id IS NOT NULL AND t.salida_id <> $1 AND t.conductor_id = $2
           AND s.fecha = $3
           AND s.plan_id IN (SELECT p.id FROM tour_plans p WHERE p.business_id = $4)
         LIMIT 1`,
        [salidaId, conductorN, fecha, businessId]
      );
      if (usadoConductor.length > 0) {
        return res.status(400).json({ success: false, message: "El conductor ya está asignado a otra salida ese día" });
      }
      conductorObj = cond;
    } else {
      // Si no se indica conductor, usar el asignado al vehículo si está libre.
      const sugerencia = await PlanModel.recomendarTransporteSalida(salidaId, planId);
      conductorObj = sugerencia && sugerencia.conductor
        ? { id: Number(sugerencia.conductor.id), nombre: sugerencia.conductor.nombre }
        : null;
    }

    const transporte = await PlanModel.addTransporte(planId, Number(vehiculo_id), conductorObj ? conductorObj.id : null, 0, null, salidaId);
    return res.status(201).json({
      success: true,
      message: "Transporte asignado a la salida",
      data: { ...transporte, vehiculo_nombre: vehiculo.nombre, conductor_nombre: conductorObj ? conductorObj.nombre : null },
    });
  } catch (error) {
    return serverError(res, error, "asignarTransporteSalida plan");
  }
};

exports.quitarSalidaTransporte = async (req, res) => {
  try {
    const planId = Number(req.params.planId);
    const salidaId = Number(req.params.salidaId);
    const transporteId = Number(req.params.transporteId);
    const ok = await PlanModel.deleteTransporteSalida(transporteId, planId, salidaId);
    if (!ok) return res.status(404).json({ success: false, message: "Asignación no encontrada" });
    return res.json({ success: true, message: "Transporte desasignado de la salida" });
  } catch (error) {
    return serverError(res, error, "quitarSalidaTransporte plan");
  }
};

// ---------- Helpers de salida ----------
function validarSalida(body, esEdicion = false) {
  const { fecha, hora, cupo_maximo, fecha_limite, hora_limite, lugar_encuentro } = body || {};
  const data = {};

  if (fecha !== undefined || !esEdicion) {
    if (!isValidDateString(fecha)) {
      return { error: { status: 400, message: "La fecha de salida debe tener formato YYYY-MM-DD" } };
    }
    data.fecha = fecha;
  }

  if (hora !== undefined) {
    if (hora === null || hora === "") data.hora = null;
    else if (!TIME_RE.test(String(hora))) {
      return { error: { status: 400, message: "La hora de salida debe tener formato HH:MM" } };
    } else data.hora = String(hora);
  } else if (!esEdicion) {
    data.hora = null;
  }

  if (cupo_maximo !== undefined || !esEdicion) {
    const c = Number(cupo_maximo);
    if (!Number.isInteger(c) || c < 1 || c > 500) {
      return { error: { status: 400, message: "El cupo máximo debe ser un entero entre 1 y 500" } };
    }
    data.cupo_maximo = c;
  }

  if (fecha_limite !== undefined) {
    if (fecha_limite === null || fecha_limite === "") data.fecha_limite = null;
    else if (!isValidDateString(fecha_limite)) {
      return { error: { status: 400, message: "La fecha límite debe tener formato YYYY-MM-DD" } };
    } else data.fecha_limite = fecha_limite;
  } else if (!esEdicion) {
    data.fecha_limite = null;
  }

  if (hora_limite !== undefined) {
    if (hora_limite === null || hora_limite === "") data.hora_limite = null;
    else if (typeof hora_limite !== "string" || !TIME_RE.test(String(hora_limite))) {
      return { error: { status: 400, message: "La hora límite de inscripción debe tener formato HH:MM" } };
    } else data.hora_limite = String(hora_limite);
  } else if (!esEdicion) {
    data.hora_limite = null;
  }

  if (lugar_encuentro !== undefined) {
    if (lugar_encuentro === null || lugar_encuentro === "") data.lugar_encuentro = null;
    else {
      const l = sanitizeString(lugar_encuentro).slice(0, 255);
      if (!l) return { error: { status: 400, message: "El lugar de encuentro no puede quedar vacío" } };
      data.lugar_encuentro = l;
    }
  } else if (!esEdicion) {
    data.lugar_encuentro = null;
  }

  if (data.fecha && data.fecha_limite && data.fecha_limite > data.fecha) {
    return { error: { status: 400, message: "La fecha límite de inscripción no puede ser posterior a la salida" } };
  }
  if (data.hora_limite && !data.fecha_limite) {
    return { error: { status: 400, message: "La hora límite requiere una fecha límite de inscripción" } };
  }

  return { data };
}

module.exports.isValidDateString = isValidDateString;
module.exports.parseNumber = parseNumber;
module.exports.URL_RE = URL_RE;