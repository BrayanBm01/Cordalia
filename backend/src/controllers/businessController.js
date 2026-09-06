const BusinessModel = require("../models/businessModel");
const LugarModel = require("../models/lugarModel");
const { slugify } = require("../utils/slug");
const { isEmail, isNonEmptyString, sanitizeString } = require("../utils/validators");

const ESTADOS = ["draft", "pending", "approved", "rejected", "suspended", "inactive"];
const URL_RE = /^https?:\/\/.+/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parseNumber(val) {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : NaN;
}

async function uniqueSlugFor(nombre, excludeId = null) {
  const base = slugify(nombre);
  if (!base) throw { status: 400, message: "No se pudo generar un slug válido desde el nombre" };
  let candidate = base;
  let suffix = 2;
  while (await BusinessModel.existsBySlug(candidate, excludeId)) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

function validarBusiness(body, esCreacion = false) {
  let {
    nombre, category_id, destination_id, descripcion, direccion, telefono, whatsapp,
    email_contacto, website, precio_min, precio_max, moneda, lat, lng, portada_url,
  } = body || {};

  const data = {};

  if (nombre !== undefined) {
    nombre = sanitizeString(nombre);
    if (!isNonEmptyString(nombre, 2, 200)) {
      return { error: { status: 400, message: "El nombre debe tener entre 2 y 200 caracteres" } };
    }
    data.nombre = nombre;
  } else if (esCreacion) {
    return { error: { status: 400, message: "El nombre del negocio es obligatorio" } };
  }

  if (category_id !== undefined && category_id !== null && category_id !== "") {
    const cid = Number(category_id);
    if (!Number.isInteger(cid) || cid <= 0) {
      return { error: { status: 400, message: "Categoría inválida" } };
    }
    data.category_id = cid;
  } else if (esCreacion) {
    data.category_id = null;
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

  if (descripcion !== undefined) data.descripcion = sanitizeString(descripcion).slice(0, 5000);
  if (direccion !== undefined) data.direccion = sanitizeString(direccion).slice(0, 300);
  if (telefono !== undefined) data.telefono = sanitizeString(telefono).slice(0, 30);
  if (whatsapp !== undefined) data.whatsapp = sanitizeString(whatsapp).slice(0, 30);

  if (email_contacto !== undefined) {
    const em = sanitizeString(email_contacto).toLowerCase();
    data.email_contacto = em === "" ? null : em;
    if (data.email_contacto && !isEmail(data.email_contacto)) {
      return { error: { status: 400, message: "Email de contacto inválido" } };
    }
  }

  if (website !== undefined) {
    const w = sanitizeString(website);
    data.website = w === "" ? null : w.slice(0, 300);
    if (data.website && !URL_RE.test(data.website)) {
      return { error: { status: 400, message: "URL del sitio web inválida" } };
    }
  }

  if (portada_url !== undefined) {
    const p = sanitizeString(portada_url);
    data.portada_url = p === "" ? null : p;
    if (data.portada_url && !URL_RE.test(data.portada_url)) {
      return { error: { status: 400, message: "URL de la portada inválida" } };
    }
  }

  if (moneda !== undefined) {
    const m = sanitizeString(moneda).toUpperCase();
    data.moneda = m === "" ? null : m;
    if (data.moneda && !/^[A-Z]{3}$/.test(data.moneda)) {
      return { error: { status: 400, message: "Moneda inválida (3 letras)" } };
    }
  }

  if (precio_min !== undefined) {
    const p = parseNumber(precio_min);
    if (Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "Precio mínimo inválido" } };
    }
    data.precio_min = p;
  }

  if (precio_max !== undefined) {
    const p = parseNumber(precio_max);
    if (Number.isNaN(p) || p < 0) {
      return { error: { status: 400, message: "Precio máximo inválido" } };
    }
    data.precio_max = p;
  }

  if (data.precio_min != null && data.precio_max != null && data.precio_max < data.precio_min) {
    return { error: { status: 400, message: "El precio máximo no puede ser menor que el mínimo" } };
  }

  if (lat !== undefined) {
    const n = parseNumber(lat);
    if (Number.isNaN(n) || n < -90 || n > 90) {
      return { error: { status: 400, message: "Latitud inválida" } };
    }
    data.lat = n;
  }

  if (lng !== undefined) {
    const n = parseNumber(lng);
    if (Number.isNaN(n) || n < -180 || n > 180) {
      return { error: { status: 400, message: "Longitud inválida" } };
    }
    data.lng = n;
  }

  return { data };
}

function serverError(res, error, context) {
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ success: false, message: "Error interno del servidor" });
}

// ---------- Categorías ----------
exports.getCategories = async (_req, res) => {
  try {
    const categorias = await BusinessModel.listCategories();
    return res.json({ success: true, data: categorias });
  } catch (error) {
    return serverError(res, error, "getCategories");
  }
};

// ---------- Negocios ----------
exports.list = async (req, res) => {
  try {
    const negocios = await BusinessModel.listByRol(req.usuario.rol, req.usuario.id);
    return res.json({ success: true, data: negocios });
  } catch (error) {
    return serverError(res, error, "list negocios");
  }
};

exports.getById = async (req, res) => {
  return res.json({ success: true, data: req.business });
};

exports.create = async (req, res) => {
  try {
    const { error, data } = validarBusiness(req.body, true);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (data.category_id) {
      const categoria = await BusinessModel.findCategoryById(data.category_id);
      if (!categoria) {
        return res.status(400).json({ success: false, message: "La categoría seleccionada no existe" });
      }
    }

    if (data.destination_id) {
      const destino = await LugarModel.findById(data.destination_id);
      if (!destino) {
        return res.status(400).json({ success: false, message: "El destino seleccionado no existe" });
      }
    }

    const slug = await uniqueSlugFor(data.nombre);
    const negocio = await BusinessModel.create({
      ...data,
      owner_id: req.usuario.id,
      slug,
      estado: "pending",
      moneda: data.moneda || "COP",
      descripcion: data.descripcion || "",
      direccion: data.direccion || "",
      telefono: data.telefono || "",
      whatsapp: data.whatsapp || "",
      email_contacto: data.email_contacto || "",
      website: data.website || "",
      portada_url: data.portada_url || "",
      destination_id: data.destination_id ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      precio_min: data.precio_min ?? null,
      precio_max: data.precio_max ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Negocio creado correctamente. Quedó pendiente de aprobación",
      data: negocio,
    });
  } catch (error) {
    return serverError(res, error, "create negocio");
  }
};

exports.update = async (req, res) => {
  try {
    const { error, data } = validarBusiness(req.body);
    if (error) return res.status(error.status).json({ success: false, message: error.message });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }

    if (data.nombre && data.nombre !== req.business.nombre) {
      data.slug = await uniqueSlugFor(data.nombre, req.business.id);
    }

    if (data.category_id) {
      const categoria = await BusinessModel.findCategoryById(data.category_id);
      if (!categoria) {
        return res.status(400).json({ success: false, message: "La categoría seleccionada no existe" });
      }
    }

    if (data.destination_id) {
      const destino = await LugarModel.findById(data.destination_id);
      if (!destino) {
        return res.status(400).json({ success: false, message: "El destino seleccionado no existe" });
      }
    }

    const updated = await BusinessModel.update(req.params.id, data);
    return res.json({ success: true, message: "Negocio actualizado correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "update negocio");
  }
};

exports.setEstado = async (req, res) => {
  try {
    const { estado } = req.body || {};
    if (!ESTADOS.includes(estado)) {
      return res.status(400).json({ success: false, message: "Estado inválido" });
    }
    const updated = await BusinessModel.setEstado(req.params.id, estado);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    return res.json({ success: true, message: "Estado actualizado correctamente", data: updated });
  } catch (error) {
    return serverError(res, error, "setEstado negocio");
  }
};

exports.remove = async (req, res) => {
  try {
    const deleted = await BusinessModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Negocio no encontrado" });
    }
    return res.json({ success: true, message: "Negocio eliminado correctamente" });
  } catch (error) {
    return serverError(res, error, "remove negocio");
  }
};

// ---------- Destinos del negocio (1:N) ----------
exports.getDestinos = async (req, res) => {
  try {
    const business = req.business;
    if (!business.destination_id) {
      return res.json({ success: true, data: [] });
    }
    const destino = await LugarModel.findById(business.destination_id);
    if (!destino) {
      return res.json({ success: true, data: [] });
    }
    return res.json({ success: true, data: [destino] });
  } catch (error) {
    return serverError(res, error, "getDestinos");
  }
};

exports.setDestino = async (req, res) => {
  try {
    const { destination_id } = req.body || {};
    let value;
    if (destination_id === undefined || destination_id === null || destination_id === "") {
      value = null;
    } else {
      const did = Number(destination_id);
      if (!Number.isInteger(did) || did <= 0) {
        return res.status(400).json({ success: false, message: "Destino inválido" });
      }
      const destino = await LugarModel.findById(did);
      if (!destino) {
        return res.status(400).json({ success: false, message: "El destino seleccionado no existe" });
      }
      value = did;
    }

    const updated = await BusinessModel.update(req.params.id, { destination_id: value });
    return res.json({
      success: true,
      message: value ? "Destino asociado al negocio" : "Destino retirado del negocio",
      data: updated,
    });
  } catch (error) {
    return serverError(res, error, "setDestino");
  }
};

// ---------- Imágenes ----------
exports.listImages = async (req, res) => {
  try {
    const imagenes = await BusinessModel.listImages(req.params.id);
    return res.json({ success: true, data: imagenes });
  } catch (error) {
    return serverError(res, error, "listImages");
  }
};

exports.addImage = async (req, res) => {
  try {
    const { url, alt_text, is_primary, orden } = req.body || {};
    if (!isNonEmptyString(url, 1, 2000) || !URL_RE.test(url)) {
      return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
    }
    const imagen = await BusinessModel.addImage(
      req.params.id,
      url.trim(),
      sanitizeString(alt_text).slice(0, 250) || null,
      Boolean(is_primary),
      Number.isInteger(Number(orden)) ? Number(orden) : 0
    );
    return res.status(201).json({ success: true, message: "Imagen agregada", data: imagen });
  } catch (error) {
    return serverError(res, error, "addImage");
  }
};

exports.updateImage = async (req, res) => {
  try {
    const { url, alt_text, orden } = req.body || {};
    const fields = {};
    if (url !== undefined) {
      if (!isNonEmptyString(url, 1, 2000) || !URL_RE.test(url)) {
        return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
      }
      fields.url = url.trim();
    }
    if (alt_text !== undefined) fields.alt_text = sanitizeString(alt_text).slice(0, 250) || null;
    if (orden !== undefined) fields.orden = Number.isInteger(Number(orden)) ? Number(orden) : 0;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    const imagen = await BusinessModel.updateImage(req.params.imageId, req.params.id, fields);
    if (!imagen) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    }
    return res.json({ success: true, message: "Imagen actualizada", data: imagen });
  } catch (error) {
    return serverError(res, error, "updateImage");
  }
};

exports.setPrimaryImage = async (req, res) => {
  try {
    const ok = await BusinessModel.setPrimaryImage(req.params.imageId, req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    }
    return res.json({ success: true, message: "Imagen principal actualizada" });
  } catch (error) {
    return serverError(res, error, "setPrimaryImage");
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteImage(req.params.imageId, req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    }
    return res.json({ success: true, message: "Imagen eliminada" });
  } catch (error) {
    return serverError(res, error, "deleteImage");
  }
};

// ---------- Servicios ----------
exports.listServices = async (req, res) => {
  try {
    const servicios = await BusinessModel.listServices(req.params.id);
    return res.json({ success: true, data: servicios });
  } catch (error) {
    return serverError(res, error, "listServices");
  }
};

exports.addService = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    if (!isNonEmptyString(nombre, 2, 150)) {
      return res.status(400).json({ success: false, message: "El nombre del servicio debe tener entre 2 y 150 caracteres" });
    }
    const servicio = await BusinessModel.addService(req.params.id, sanitizeString(nombre), sanitizeString(descripcion).slice(0, 1000) || null);
    return res.status(201).json({ success: true, message: "Servicio agregado", data: servicio });
  } catch (error) {
    return serverError(res, error, "addService");
  }
};

exports.updateService = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body || {};
    const fields = {};
    if (nombre !== undefined) {
      if (!isNonEmptyString(nombre, 2, 150)) {
        return res.status(400).json({ success: false, message: "El nombre del servicio debe tener entre 2 y 150 caracteres" });
      }
      fields.nombre = sanitizeString(nombre);
    }
    if (descripcion !== undefined) fields.descripcion = sanitizeString(descripcion).slice(0, 1000) || null;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    const servicio = await BusinessModel.updateService(req.params.serviceId, req.params.id, fields);
    if (!servicio) {
      return res.status(404).json({ success: false, message: "Servicio no encontrado" });
    }
    return res.json({ success: true, message: "Servicio actualizado", data: servicio });
  } catch (error) {
    return serverError(res, error, "updateService");
  }
};

exports.deleteService = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteService(req.params.serviceId, req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Servicio no encontrado" });
    }
    return res.json({ success: true, message: "Servicio eliminado" });
  } catch (error) {
    return serverError(res, error, "deleteService");
  }
};

// ---------- Horarios ----------
function validarHorario(body, esEdicion = false) {
  let { day_of_week, open_time, close_time, is_closed, orden } = body || {};
  const data = {};

  if (day_of_week !== undefined) {
    const d = Number(day_of_week);
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      return { error: { status: 400, message: "Día de la semana inválido (0-6)" } };
    }
    data.day_of_week = d;
  } else if (!esEdicion) {
    return { error: { status: 400, message: "day_of_week es obligatorio" } };
  }

  if (is_closed !== undefined) data.is_closed = Boolean(is_closed);

  for (const key of ["open_time", "close_time"]) {
    const val = body[key];
    if (val !== undefined) {
      if (val === null || val === "") data[key] = null;
      else if (!TIME_RE.test(String(val))) {
        return { error: { status: 400, message: `Hora ${key} inválida (HH:MM)` } };
      } else data[key] = String(val);
    }
  }

  if (orden !== undefined) {
    const o = Number(orden);
    data.orden = Number.isInteger(o) ? o : 0;
  }

  return { data };
}

exports.listHours = async (req, res) => {
  try {
    const horarios = await BusinessModel.listHours(req.params.id);
    return res.json({ success: true, data: horarios });
  } catch (error) {
    return serverError(res, error, "listHours");
  }
};

exports.addHour = async (req, res) => {
  try {
    const { error, data } = validarHorario(req.body);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (data.open_time && data.close_time && String(data.open_time) >= String(data.close_time)) {
      return res.status(400).json({ success: false, message: "La hora de apertura debe ser anterior al cierre" });
    }
    if (!data.is_closed) {
      data.open_time = data.open_time || null;
      data.close_time = data.close_time || null;
    } else {
      data.is_closed = true;
      data.open_time = null;
      data.close_time = null;
    }
    const horario = await BusinessModel.addHour(req.params.id, data);
    return res.status(201).json({ success: true, message: "Horario agregado", data: horario, dia: DIAS[horario.day_of_week] });
  } catch (error) {
    return serverError(res, error, "addHour");
  }
};

exports.updateHour = async (req, res) => {
  try {
    const { error, data } = validarHorario(req.body, true);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    if (data.open_time && data.close_time && String(data.open_time) >= String(data.close_time)) {
      return res.status(400).json({ success: false, message: "La hora de apertura debe ser anterior al cierre" });
    }
    if (data.is_closed === true) {
      data.open_time = null;
      data.close_time = null;
    }
    const horario = await BusinessModel.updateHour(req.params.hourId, req.params.id, data);
    if (!horario) {
      return res.status(404).json({ success: false, message: "Horario no encontrado" });
    }
    return res.json({ success: true, message: "Horario actualizado", data: horario });
  } catch (error) {
    return serverError(res, error, "updateHour");
  }
};

exports.deleteHour = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteHour(req.params.hourId, req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Horario no encontrado" });
    }
    return res.json({ success: true, message: "Horario eliminado" });
  } catch (error) {
    return serverError(res, error, "deleteHour");
  }
};

// ---------- Redes sociales ----------
async function validarRed(body) {
  const { plataforma, url } = body || {};
  if (!isNonEmptyString(plataforma, 2, 50)) {
    return { error: { status: 400, message: "Plataforma inválida" } };
  }
  if (!isNonEmptyString(url, 1, 2000) || !URL_RE.test(url)) {
    return { error: { status: 400, message: "URL de la red social inválida" } };
  }
  return { data: { plataforma: sanitizeString(plataforma).toLowerCase(), url: sanitizeString(url) } };
}

function esErrorUnico(error) {
  return error && error.code === "23505";
}

exports.listSocialLinks = async (req, res) => {
  try {
    const redes = await BusinessModel.listSocialLinks(req.params.id);
    return res.json({ success: true, data: redes });
  } catch (error) {
    return serverError(res, error, "listSocialLinks");
  }
};

exports.addSocialLink = async (req, res) => {
  try {
    const { error, data } = await validarRed(req.body);
    if (error) return res.status(error.status).json({ success: false, message: error.message });
    const red = await BusinessModel.addSocialLink(req.params.id, data.plataforma, data.url);
    return res.status(201).json({ success: true, message: "Red social agregada", data: red });
  } catch (error) {
    if (esErrorUnico(error)) {
      return res.status(409).json({ success: false, message: "Ya tienes enlazada esa plataforma" });
    }
    return serverError(res, error, "addSocialLink");
  }
};

exports.updateSocialLink = async (req, res) => {
  try {
    const { plataforma, url } = req.body || {};
    const fields = {};
    if (plataforma !== undefined) {
      if (!isNonEmptyString(plataforma, 2, 50)) {
        return res.status(400).json({ success: false, message: "Plataforma inválida" });
      }
      fields.plataforma = sanitizeString(plataforma).toLowerCase();
    }
    if (url !== undefined) {
      if (!isNonEmptyString(url, 1, 2000) || !URL_RE.test(url)) {
        return res.status(400).json({ success: false, message: "URL de la red social inválida" });
      }
      fields.url = sanitizeString(url);
    }
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    const red = await BusinessModel.updateSocialLink(req.params.linkId, req.params.id, fields);
    if (!red) {
      return res.status(404).json({ success: false, message: "Red social no encontrada" });
    }
    return res.json({ success: true, message: "Red social actualizada", data: red });
  } catch (error) {
    if (esErrorUnico(error)) {
      return res.status(409).json({ success: false, message: "Ya tienes enlazada esa plataforma" });
    }
    return serverError(res, error, "updateSocialLink");
  }
};

exports.deleteSocialLink = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteSocialLink(req.params.linkId, req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: "Red social no encontrada" });
    }
    return res.json({ success: true, message: "Red social eliminada" });
  } catch (error) {
    return serverError(res, error, "deleteSocialLink");
  }
};