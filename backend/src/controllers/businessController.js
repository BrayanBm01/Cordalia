const BusinessModel = require("../models/businessModel");
const LugarModel = require("../models/lugarModel");
const { slugify } = require("../utils/slug");
const { responderErrorServidor } = require("../utils/serverError");
const {
  isEmail,
  isNonEmptyString,
  isValidBusinessName,
  isValidPersonName,
  isValidPhone,
  isValidHttpUrl,
  isValidDateOnly,
  parseInteger,
  parseDecimal,
  sanitizeString,
  validarTexto,
} = require("../utils/validators");

const ESTADOS = ["draft", "pending", "approved", "rejected", "suspended", "inactive"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const IMAGEN_MAX_BYTES = 1500 * 1024; // 1.5 MB por imagen
const IMAGENES_PERMITIDAS = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const PRECIO_MAX = 99999999.99; // DECIMAL(10,2) en PostgreSQL

// Monedas disponibles en los catálogos de la plataforma.
const MONEDAS_PERMITIDAS = ["COP", "USD", "EUR", "MXN", "PEN"];

// Categorías que trabajan con rango de precios (min/max) en su ficha.
const CATEGORIAS_CON_PRECIO = new Set([
  "Restaurante", "Hotel", "Hostal", "Tour", "Agencia de viajes",
  "Experiencia turistica", "Atraccion turistica",
]);

// Categorías que NO manejan rango de precios en su ficha.
const CATEGORIAS_SIN_PRECIO = new Set([
  "Bar", "Cafe", "Tienda", "Transporte", "Otro",
]);

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
  const input = body && typeof body === "object" ? body : {};
  const {
    nombre, category_id, destination_id, descripcion, direccion, telefono, whatsapp,
    email_contacto, website, precio_min, precio_max, moneda, lat, lng, portada_url,
  } = input;

  const data = {};

  if (nombre !== undefined) {
    if (typeof nombre !== "string" || !isValidBusinessName(nombre)) {
      return {
        error: {
          status: 400,
          message:
            "El nombre del negocio debe tener entre 2 y 200 caracteres y contener letras o números",
        },
      };
    }
    data.nombre = sanitizeString(nombre);
  } else if (esCreacion) {
    return { error: { status: 400, message: "El nombre del negocio es obligatorio" } };
  }

  if (category_id !== undefined && category_id !== null && category_id !== "") {
    const cid = parseInteger(category_id, { min: 1 });
    if (cid === null) {
      return { error: { status: 400, message: "Categoría inválida" } };
    }
    data.category_id = cid;
  } else if (esCreacion) {
    data.category_id = null;
  } else if (category_id === null || category_id === "") {
    data.category_id = null;
  }

  if (destination_id !== undefined) {
    if (destination_id === null || destination_id === "") {
      data.destination_id = null;
    } else {
      const did = parseInteger(destination_id, { min: 1 });
      if (did === null) {
        return { error: { status: 400, message: "Destino inválido" } };
      }
      data.destination_id = did;
    }
  } else if (esCreacion) {
    data.destination_id = null;
  }

  const textos = [
    { key: "descripcion", max: 5000, label: "La descripción", multiline: true },
    { key: "direccion", max: 300, label: "La dirección" },
  ];
  for (const campo of textos) {
    if (input[campo.key] === undefined) continue;
    const resultado = validarTexto(input[campo.key], {
      max: campo.max,
      label: campo.label,
      multiline: Boolean(campo.multiline),
    });
    if (resultado.error) {
      return { error: { status: 400, message: resultado.error } };
    }
    data[campo.key] = resultado.value || "";
  }

  for (const campo of [
    { key: "telefono", label: "El teléfono" },
    { key: "whatsapp", label: "El WhatsApp" },
  ]) {
    if (input[campo.key] === undefined) continue;
    if (input[campo.key] === null || input[campo.key] === "") {
      data[campo.key] = "";
      continue;
    }
    if (typeof input[campo.key] !== "string" || !isValidPhone(input[campo.key])) {
      return {
        error: {
          status: 400,
          message: `${campo.label} es inválido: usa entre 7 y 15 dígitos, con +, espacios, guiones o paréntesis`,
        },
      };
    }
    data[campo.key] = sanitizeString(input[campo.key]);
  }

  if (email_contacto !== undefined) {
    if (email_contacto !== null && typeof email_contacto !== "string") {
      return { error: { status: 400, message: "Email de contacto inválido" } };
    }
    const em = sanitizeString(email_contacto || "").toLowerCase();
    if (em && !isEmail(em)) {
      return { error: { status: 400, message: "Email de contacto inválido" } };
    }
    data.email_contacto = em || "";
  }

  if (website !== undefined) {
    if (website !== null && typeof website !== "string") {
      return { error: { status: 400, message: "URL del sitio web inválida" } };
    }
    const w = sanitizeString(website || "");
    if (w && !isValidHttpUrl(w)) {
      return { error: { status: 400, message: "URL del sitio web inválida (debe iniciar con http:// o https://)" } };
    }
    data.website = w || "";
  }

  if (portada_url !== undefined) {
    if (portada_url !== null && typeof portada_url !== "string") {
      return { error: { status: 400, message: "URL de la portada inválida" } };
    }
    const p = sanitizeString(portada_url || "");
    if (p) {
      const esDataUrl = /^data:image\//i.test(p);
      if (esDataUrl) {
        const errorImg = validarImagenDataUrl(p);
        if (errorImg) return { error: { status: 400, message: errorImg } };
      } else if (!isValidHttpUrl(p)) {
        return { error: { status: 400, message: "URL de la portada inválida" } };
      }
    }
    data.portada_url = p || "";
  }

  if (moneda !== undefined) {
    if (moneda !== null && typeof moneda !== "string") {
      return { error: { status: 400, message: "Moneda inválida" } };
    }
    const m = sanitizeString(moneda || "").toUpperCase();
    if (m && !MONEDAS_PERMITIDAS.includes(m)) {
      return {
        error: {
          status: 400,
          message: `Moneda inválida: selecciona una moneda permitida (${MONEDAS_PERMITIDAS.join(", ")})`,
        },
      };
    }
    data.moneda = m || null;
  }

  if (precio_min !== undefined) {
    const p = parseDecimal(precio_min, { min: 0, max: PRECIO_MAX, decimals: 2 });
    if (p === null && precio_min !== null && precio_min !== "") {
      return { error: { status: 400, message: "Precio mínimo inválido" } };
    }
    if (Number.isNaN(p)) {
      return { error: { status: 400, message: "Precio mínimo inválido" } };
    }
    data.precio_min = p;
  }

  if (precio_max !== undefined) {
    const p = parseDecimal(precio_max, { min: 0, max: PRECIO_MAX, decimals: 2 });
    if (p === null && precio_max !== null && precio_max !== "") {
      return { error: { status: 400, message: "Precio máximo inválido" } };
    }
    if (Number.isNaN(p)) {
      return { error: { status: 400, message: "Precio máximo inválido" } };
    }
    data.precio_max = p;
  }

  if (data.precio_min != null && data.precio_max != null && data.precio_max < data.precio_min) {
    return { error: { status: 400, message: "El precio máximo no puede ser menor que el mínimo" } };
  }

  if (lat !== undefined) {
    const n = parseDecimal(lat, { min: -90, max: 90, decimals: 7 });
    if (Number.isNaN(n) || (n === null && lat !== null && lat !== "")) {
      return { error: { status: 400, message: "Latitud inválida" } };
    }
    data.lat = n;
  }

  if (lng !== undefined) {
    const n = parseDecimal(lng, { min: -180, max: 180, decimals: 7 });
    if (Number.isNaN(n) || (n === null && lng !== null && lng !== "")) {
      return { error: { status: 400, message: "Longitud inválida" } };
    }
    data.lng = n;
  }

  return { data };
}

function serverError(res, error, context) {
  return responderErrorServidor(res, error, context);
}

// Valida el rango de precios según la categoría del negocio:
// - categorías CON_PRECIO: precio min/max obligatorios al crear.
// - categorías SIN_PRECIO: no se aceptan precios en la ficha.
function validarPreciosPorCategoria(categoriaNombre, data) {
  if (!categoriaNombre) return null;
  const conPrecio = CATEGORIAS_CON_PRECIO.has(categoriaNombre);
  const sinPrecio = CATEGORIAS_SIN_PRECIO.has(categoriaNombre);
  if (!conPrecio && !sinPrecio) return null; // categoría sin regla específica

  const tienePrecio = data.precio_min != null || data.precio_max != null;

  if (sinPrecio && tienePrecio) {
    return { status: 400, message: `La categoría "${categoriaNombre}" no maneja rango de precios` };
  }

  return null;
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
    const rol = req.usuario?.rol || "TOURIST";
    const userId = req.usuario?.id || null;
    const negocios = await BusinessModel.listByRol(rol, userId);
    return res.json({ success: true, data: negocios });
  } catch (error) {
    return serverError(res, error, "list negocios");
  }
};

exports.getById = async (req, res) => {
  const data = { ...req.business };
  // El correo del propietario es dato administrativo: solo un ADMIN
  // autenticado puede verlo. La ficha publica no lo expone.
  if (!req.usuario || req.usuario.rol !== "ADMIN") {
    delete data.owner_email;
  }
  return res.json({ success: true, data });
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
      const precioError = validarPreciosPorCategoria(categoria.nombre, data, true);
      if (precioError) {
        return res.status(precioError.status).json({ success: false, message: precioError.message });
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

    // En una edicion parcial hay que comparar los precios EFECTIVOS
    // (los nuevos y los que ya tenia el negocio). Si no, cambiar solo
    // precio_min podria dejar un rango invalido en la base de datos.
    const preciosEfectivos = {
      precio_min:
        data.precio_min !== undefined ? data.precio_min : req.business.precio_min,
      precio_max:
        data.precio_max !== undefined ? data.precio_max : req.business.precio_max,
    };
    if (
      preciosEfectivos.precio_min != null &&
      preciosEfectivos.precio_max != null &&
      Number(preciosEfectivos.precio_max) < Number(preciosEfectivos.precio_min)
    ) {
      return res.status(400).json({
        success: false,
        message: "El precio máximo no puede ser menor que el mínimo",
      });
    }

    if (data.nombre && data.nombre !== req.business.nombre) {
      data.slug = await uniqueSlugFor(data.nombre, req.business.id);
    }

    if (data.category_id || req.business.category_id) {
      const catId = data.category_id || req.business.category_id;
      const categoria = await BusinessModel.findCategoryById(catId);
      if (!categoria) {
        return res.status(400).json({ success: false, message: "La categoría seleccionada no existe" });
      }
      const precioError = validarPreciosPorCategoria(categoria.nombre, preciosEfectivos);
      if (precioError) {
        return res.status(precioError.status).json({ success: false, message: precioError.message });
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
    if (typeof url !== "string") {
      return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
    }
    const img = sanitizeString(url);
    const esDataUrl = /^data:image\//i.test(img);
    if (!img || (!esDataUrl && !isValidHttpUrl(img, 3000000))) {
      return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
    }
    if (esDataUrl) {
      const errorImg = validarImagenDataUrl(img);
      if (errorImg) return res.status(400).json({ success: false, message: errorImg });
    }
    const alt = validarTexto(alt_text, { max: 250, label: "El texto alternativo" });
    if (alt.error) {
      return res.status(400).json({ success: false, message: alt.error });
    }
    let ordenFinal = 0;
    if (orden !== undefined) {
      const o = parseInteger(orden, { min: 0, max: 10000 });
      if (o === null) {
        return res.status(400).json({ success: false, message: "El orden debe ser un entero entre 0 y 10000" });
      }
      ordenFinal = o;
    }
    if (is_primary !== undefined && typeof is_primary !== "boolean") {
      return res.status(400).json({ success: false, message: "is_primary debe ser verdadero o falso" });
    }
    const imagen = await BusinessModel.addImage(
      req.params.id,
      img,
      alt.value || null,
      Boolean(is_primary),
      ordenFinal
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
      if (typeof url !== "string") {
        return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
      }
      const img = sanitizeString(url);
      if (!img || (!/^data:image\//i.test(img) && !isValidHttpUrl(img, 3000000))) {
        return res.status(400).json({ success: false, message: "URL de la imagen inválida" });
      }
      if (/^data:image\//i.test(img)) {
        const errorImg = validarImagenDataUrl(img);
        if (errorImg) return res.status(400).json({ success: false, message: errorImg });
      }
      fields.url = img;
    }
    if (alt_text !== undefined) {
      const alt = validarTexto(alt_text, { max: 250, label: "El texto alternativo" });
      if (alt.error) {
        return res.status(400).json({ success: false, message: alt.error });
      }
      fields.alt_text = alt.value;
    }
    if (orden !== undefined) {
      const o = parseInteger(orden, { min: 0, max: 10000 });
      if (o === null) {
        return res.status(400).json({ success: false, message: "El orden debe ser un entero entre 0 y 10000" });
      }
      fields.orden = o;
    }
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
    if (typeof nombre !== "string" || !isNonEmptyString(nombre, 2, 150)) {
      return res.status(400).json({ success: false, message: "El nombre del servicio debe tener entre 2 y 150 caracteres" });
    }
    const desc = validarTexto(descripcion, {
      max: 1000,
      label: "La descripción del servicio",
      multiline: true,
    });
    if (desc.error) {
      return res.status(400).json({ success: false, message: desc.error });
    }
    const servicio = await BusinessModel.addService(req.params.id, sanitizeString(nombre), desc.value);
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
      if (typeof nombre !== "string" || !isNonEmptyString(nombre, 2, 150)) {
        return res.status(400).json({ success: false, message: "El nombre del servicio debe tener entre 2 y 150 caracteres" });
      }
      fields.nombre = sanitizeString(nombre);
    }
    if (descripcion !== undefined) {
      const desc = validarTexto(descripcion, {
        max: 1000,
        label: "La descripción del servicio",
        multiline: true,
      });
      if (desc.error) {
        return res.status(400).json({ success: false, message: desc.error });
      }
      fields.descripcion = desc.value;
    }
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
  const input = body && typeof body === "object" ? body : {};
  const { day_of_week, open_time, close_time, is_closed, orden } = input;
  const data = {};

  if (day_of_week !== undefined) {
    const d = parseInteger(day_of_week, { min: 0, max: 6 });
    if (d === null) {
      return { error: { status: 400, message: "Día de la semana inválido (0-6)" } };
    }
    data.day_of_week = d;
  } else if (!esEdicion) {
    return { error: { status: 400, message: "day_of_week es obligatorio" } };
  }

  if (is_closed !== undefined) {
    if (typeof is_closed !== "boolean") {
      return { error: { status: 400, message: "is_closed debe ser verdadero o falso" } };
    }
    data.is_closed = is_closed;
  }

  for (const key of ["open_time", "close_time"]) {
    const val = input[key];
    if (val !== undefined) {
      if (val === null || val === "") data[key] = null;
      else if (typeof val !== "string" || !TIME_RE.test(val)) {
        return { error: { status: 400, message: `Hora ${key} inválida (HH:MM)` } };
      } else data[key] = val;
    }
  }

  if (orden !== undefined) {
    const o = parseInteger(orden, { min: 0, max: 10000 });
    if (o === null) {
      return { error: { status: 400, message: "El orden debe ser un entero entre 0 y 10000" } };
    }
    data.orden = o;
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
  if (typeof plataforma !== "string" || !isNonEmptyString(plataforma, 2, 50)) {
    return { error: { status: 400, message: "Plataforma inválida" } };
  }
  if (typeof url !== "string" || !isValidHttpUrl(url, 2000)) {
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
      if (typeof plataforma !== "string" || !isNonEmptyString(plataforma, 2, 50)) {
        return res.status(400).json({ success: false, message: "Plataforma inválida" });
      }
      fields.plataforma = sanitizeString(plataforma).toLowerCase();
    }
    if (url !== undefined) {
      if (typeof url !== "string" || !isValidHttpUrl(url, 2000)) {
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

// ---------- Vehículos (flota) ----------
exports.listVehiculos = async (req, res) => {
  try {
    const vehiculos = await BusinessModel.listVehiculos(req.params.id);
    return res.json({ success: true, data: vehiculos });
  } catch (error) {
    return serverError(res, error, "listVehiculos");
  }
};

const TIPOS_VEHICULO = ["camioneta", "minivan", "bus", "buseta", "colectivo", "auto", "otro"];
const ESTADOS_VEHICULO = ["disponible", "mantenimiento", "inactivo"];

function normalizarTipoVehiculo(tipo) {
  const t = String(tipo || "").trim().toLowerCase();
  if (!t) return null;
  if (TIPOS_VEHICULO.includes(t)) return t;
  const mapa = {
    camioneta: "camioneta", minivan: "minivan", van: "minivan",
    bus: "bus", buseta: "buseta", urbano: "bus", colectivo: "colectivo",
    carro: "auto", auto: "auto", otro: "otro",
  };
  return mapa[t] || null;
}

exports.addVehiculo = async (req, res) => {
  try {
    const { nombre, tipo, marca, modelo, anio, placa, capacidad, estado, descripcion, conductor_id } = req.body || {};
    if (typeof nombre !== "string" || !isNonEmptyString(nombre, 2, 150)) {
      return res.status(400).json({ success: false, message: "El nombre del vehículo debe tener entre 2 y 150 caracteres" });
    }
    const cap = parseInteger(capacidad, { min: 1, max: 200 });
    if (cap === null) {
      return res.status(400).json({ success: false, message: "La capacidad debe ser un entero entre 1 y 200" });
    }
    if (placa !== undefined && placa !== null && typeof placa !== "string") {
      return res.status(400).json({ success: false, message: "Placa inválida: usa letras y números (ej. ABC-123)" });
    }
    const placaNormalizada = sanitizeString(placa || "").toUpperCase() || null;
    if (placaNormalizada && !/^[A-Z0-9]{2,}-?[A-Z0-9]{1,6}$/.test(placaNormalizada.replace(/\s+/g, ""))) {
      return res.status(400).json({ success: false, message: "Placa inválida: usa letras y números (ej. ABC-123)" });
    }
    const tipoNorm = normalizarTipoVehiculo(tipo);
    if (tipo !== undefined && tipo !== null && tipo !== "" && !tipoNorm) {
      return res.status(400).json({ success: false, message: "Tipo de vehículo inválido (Camioneta, Minivan, Bus, ...)" });
    }
    const estadoNorm = estado === undefined || estado === null || estado === "" ? "disponible" : String(estado).toLowerCase();
    if (!ESTADOS_VEHICULO.includes(estadoNorm)) {
      return res.status(400).json({ success: false, message: "Estado inválido (disponible, mantenimiento, inactivo)" });
    }
    let anioNorm = null;
    if (anio !== undefined && anio !== null && anio !== "") {
      anioNorm = parseInteger(anio, { min: 1960, max: 2100 });
      if (anioNorm === null) {
        return res.status(400).json({ success: false, message: "El año debe ser un entero entre 1960 y 2100" });
      }
    }
    let conductorNorm = null;
    if (conductor_id !== undefined && conductor_id !== null && conductor_id !== "") {
      conductorNorm = parseInteger(conductor_id, { min: 1 });
      if (conductorNorm === null) {
        return res.status(400).json({ success: false, message: "Conductor inválido" });
      }
      const existe = await BusinessModel.findConductorById(req.params.id, conductorNorm);
      if (!existe) return res.status(400).json({ success: false, message: "El conductor asignado no pertenece a este negocio" });
    }
    const marcaTexto = validarTexto(marca, { max: 100, label: "La marca" });
    if (marcaTexto.error) return res.status(400).json({ success: false, message: marcaTexto.error });
    const modeloTexto = validarTexto(modelo, { max: 100, label: "El modelo" });
    if (modeloTexto.error) return res.status(400).json({ success: false, message: modeloTexto.error });
    const descripcionTexto = validarTexto(descripcion, {
      max: 1000,
      label: "La descripción",
      multiline: true,
    });
    if (descripcionTexto.error) return res.status(400).json({ success: false, message: descripcionTexto.error });
    const vehiculo = await BusinessModel.addVehiculo(req.params.id, {
      nombre: sanitizeString(nombre),
      tipo: tipoNorm,
      marca: marcaTexto.value,
      modelo: modeloTexto.value,
      anio: anioNorm,
      placa: placaNormalizada,
      capacidad: cap,
      estado: estadoNorm,
      descripcion: descripcionTexto.value,
      conductor_id: conductorNorm,
    });
    return res.status(201).json({ success: true, message: "Vehículo agregado", data: vehiculo });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(400).json({ success: false, message: "Ya existe un vehículo con esa placa en este negocio" });
    }
    return serverError(res, error, "addVehiculo");
  }
};

exports.updateVehiculo = async (req, res) => {
  try {
    const { nombre, tipo, marca, modelo, anio, placa, capacidad, estado, descripcion, conductor_id } = req.body || {};
    const fields = {};
    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !isNonEmptyString(nombre, 2, 150)) {
        return res.status(400).json({ success: false, message: "El nombre del vehículo debe tener entre 2 y 150 caracteres" });
      }
      fields.nombre = sanitizeString(nombre);
    }
    if (tipo !== undefined) {
      const t = normalizarTipoVehiculo(tipo);
      if (!t && String(tipo || "") !== "") {
        return res.status(400).json({ success: false, message: "Tipo de vehículo inválido (Camioneta, Minivan, Bus, ...)" });
      }
      fields.tipo = String(tipo || "") === "" ? null : t;
    }
    if (marca !== undefined) {
      const texto = validarTexto(marca, { max: 100, label: "La marca" });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.marca = texto.value;
    }
    if (modelo !== undefined) {
      const texto = validarTexto(modelo, { max: 100, label: "El modelo" });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.modelo = texto.value;
    }
    if (placa !== undefined) {
      if (placa !== null && typeof placa !== "string") {
        return res.status(400).json({ success: false, message: "Placa inválida: usa letras y números (ej. ABC-123)" });
      }
      const p = sanitizeString(placa || "").toUpperCase() || null;
      if (p && !/^[A-Z0-9]{2,}-?[A-Z0-9]{1,6}$/.test(p.replace(/\s+/g, ""))) {
        return res.status(400).json({ success: false, message: "Placa inválida: usa letras y números (ej. ABC-123)" });
      }
      fields.placa = p;
    }
    if (capacidad !== undefined) {
      const cap = parseInteger(capacidad, { min: 1, max: 200 });
      if (cap === null) {
        return res.status(400).json({ success: false, message: "La capacidad debe ser un entero entre 1 y 200" });
      }
      fields.capacidad = cap;
    }
    if (estado !== undefined) {
      const e = typeof estado === "string" ? estado.toLowerCase() : "";
      if (!ESTADOS_VEHICULO.includes(e)) {
        return res.status(400).json({ success: false, message: "Estado inválido (disponible, mantenimiento, inactivo)" });
      }
      fields.estado = e;
    }
    if (anio !== undefined && anio !== null && anio !== "") {
      const a = parseInteger(anio, { min: 1960, max: 2100 });
      if (a === null) {
        return res.status(400).json({ success: false, message: "El año debe ser un entero entre 1960 y 2100" });
      }
      fields.anio = a;
    } else if (anio === null || anio === "") {
      fields.anio = null;
    }
    if (conductor_id !== undefined) {
      if (conductor_id === null || conductor_id === "") {
        fields.conductor_id = null;
      } else {
        const c = parseInteger(conductor_id, { min: 1 });
        if (c === null) {
          return res.status(400).json({ success: false, message: "Conductor inválido" });
        }
        const existe = await BusinessModel.findConductorById(req.params.id, c);
        if (!existe) return res.status(400).json({ success: false, message: "El conductor asignado no pertenece a este negocio" });
        fields.conductor_id = c;
      }
    }
    if (descripcion !== undefined) {
      const texto = validarTexto(descripcion, {
        max: 1000,
        label: "La descripción",
        multiline: true,
      });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.descripcion = texto.value;
    }
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    const vehiculo = await BusinessModel.updateVehiculo(req.params.vehiculoId, req.params.id, fields);
    if (!vehiculo) return res.status(404).json({ success: false, message: "Vehículo no encontrado" });
    return res.json({ success: true, message: "Vehículo actualizado", data: vehiculo });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(400).json({ success: false, message: "Ya existe un vehículo con esa placa en este negocio" });
    }
    return serverError(res, error, "updateVehiculo");
  }
};

exports.deleteVehiculo = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteVehiculo(req.params.vehiculoId, req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Vehículo no encontrado" });
    return res.json({ success: true, message: "Vehículo eliminado" });
  } catch (error) {
    return serverError(res, error, "deleteVehiculo");
  }
};

// ---------- Conductores ----------
exports.listConductores = async (req, res) => {
  try {
    const conductores = await BusinessModel.listConductores(req.params.id);
    return res.json({ success: true, data: conductores });
  } catch (error) {
    return serverError(res, error, "listConductores");
  }
};

exports.addConductor = async (req, res) => {
  try {
    const { nombre, email, telefono, licencia, licencia_categoria, licencia_vencimiento, experiencia, disponible } = req.body || {};
    if (typeof nombre !== "string" || !isValidPersonName(nombre)) {
      return res.status(400).json({
        success: false,
        message:
          "El nombre del conductor es inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
      });
    }
    let emailNorm = null;
    if (email !== undefined && email !== null && email !== "") {
      if (typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Correo electrónico inválido" });
      }
      emailNorm = sanitizeString(email).toLowerCase() || null;
      if (emailNorm && !isEmail(emailNorm)) {
        return res.status(400).json({ success: false, message: "Correo electrónico inválido" });
      }
    }
    let telefonoNorm = null;
    if (telefono !== undefined && telefono !== null && telefono !== "") {
      if (typeof telefono !== "string" || !isValidPhone(telefono)) {
        return res.status(400).json({ success: false, message: "Teléfono del conductor inválido" });
      }
      telefonoNorm = sanitizeString(telefono);
    }
    let vencimiento = null;
    if (licencia_vencimiento !== undefined && licencia_vencimiento !== null && licencia_vencimiento !== "") {
      if (!isValidDateOnly(licencia_vencimiento)) {
        return res.status(400).json({ success: false, message: "La fecha de vencimiento de licencia debe ser una fecha real YYYY-MM-DD" });
      }
      vencimiento = licencia_vencimiento;
    }
    if (disponible !== undefined && typeof disponible !== "boolean") {
      return res.status(400).json({ success: false, message: "disponible debe ser verdadero o falso" });
    }
    const licenciaTexto = validarTexto(licencia, { max: 50, label: "La licencia" });
    if (licenciaTexto.error) return res.status(400).json({ success: false, message: licenciaTexto.error });
    const categoriaTexto = validarTexto(licencia_categoria, { max: 20, label: "La categoría de licencia" });
    if (categoriaTexto.error) return res.status(400).json({ success: false, message: categoriaTexto.error });
    const experienciaTexto = validarTexto(experiencia, {
      max: 1000,
      label: "La experiencia",
      multiline: true,
    });
    if (experienciaTexto.error) return res.status(400).json({ success: false, message: experienciaTexto.error });
    const conductor = await BusinessModel.addConductor(req.params.id, {
      nombre: sanitizeString(nombre),
      email: emailNorm,
      telefono: telefonoNorm,
      licencia: licenciaTexto.value,
      licencia_categoria: categoriaTexto.value,
      licencia_vencimiento: vencimiento,
      experiencia: experienciaTexto.value,
      disponible: disponible !== false,
    });
    return res.status(201).json({ success: true, message: "Conductor agregado", data: conductor });
  } catch (error) {
    return serverError(res, error, "addConductor");
  }
};

exports.updateConductor = async (req, res) => {
  try {
    const { nombre, email, telefono, licencia, licencia_categoria, licencia_vencimiento, experiencia, disponible } = req.body || {};
    const fields = {};
    if (nombre !== undefined) {
      if (typeof nombre !== "string" || !isValidPersonName(nombre)) {
        return res.status(400).json({
          success: false,
          message:
            "El nombre del conductor es inválido: usa solo letras, tildes, ñ, espacios, guiones o apóstrofos (2 a 100 caracteres)",
        });
      }
      fields.nombre = sanitizeString(nombre);
    }
    if (email !== undefined) {
      if (email === null || email === "") {
        fields.email = null;
      } else {
        if (typeof email !== "string") {
          return res.status(400).json({ success: false, message: "Correo electrónico inválido" });
        }
        const e = sanitizeString(email).toLowerCase();
        if (!isEmail(e)) {
          return res.status(400).json({ success: false, message: "Correo electrónico inválido" });
        }
        fields.email = e;
      }
    }
    if (telefono !== undefined) {
      if (telefono === null || telefono === "") {
        fields.telefono = null;
      } else if (typeof telefono !== "string" || !isValidPhone(telefono)) {
        return res.status(400).json({ success: false, message: "Teléfono del conductor inválido" });
      } else {
        fields.telefono = sanitizeString(telefono);
      }
    }
    if (licencia !== undefined) {
      const texto = validarTexto(licencia, { max: 50, label: "La licencia" });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.licencia = texto.value;
    }
    if (licencia_categoria !== undefined) {
      const texto = validarTexto(licencia_categoria, { max: 20, label: "La categoría de licencia" });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.licencia_categoria = texto.value;
    }
    if (licencia_vencimiento !== undefined) {
      if (licencia_vencimiento === null || licencia_vencimiento === "") {
        fields.licencia_vencimiento = null;
      } else {
        if (!isValidDateOnly(licencia_vencimiento)) {
          return res.status(400).json({ success: false, message: "La fecha de vencimiento de licencia debe ser una fecha real YYYY-MM-DD" });
        }
        fields.licencia_vencimiento = licencia_vencimiento;
      }
    }
    if (experiencia !== undefined) {
      const texto = validarTexto(experiencia, {
        max: 1000,
        label: "La experiencia",
        multiline: true,
      });
      if (texto.error) return res.status(400).json({ success: false, message: texto.error });
      fields.experiencia = texto.value;
    }
    if (disponible !== undefined) {
      if (typeof disponible !== "boolean") {
        return res.status(400).json({ success: false, message: "disponible debe ser verdadero o falso" });
      }
      fields.disponible = disponible;
    }
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ success: false, message: "No hay datos para actualizar" });
    }
    const conductor = await BusinessModel.updateConductor(req.params.conductorId, req.params.id, fields);
    if (!conductor) return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    return res.json({ success: true, message: "Conductor actualizado", data: conductor });
  } catch (error) {
    return serverError(res, error, "updateConductor");
  }
};

exports.deleteConductor = async (req, res) => {
  try {
    const ok = await BusinessModel.deleteConductor(req.params.conductorId, req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "Conductor no encontrado" });
    return res.json({ success: true, message: "Conductor eliminado" });
  } catch (error) {
    return serverError(res, error, "deleteConductor");
  }
};