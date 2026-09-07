const h = require("./helpers");

const ADMIN_PASS = h.ADMIN_PASSWORD;

h.test("REV: setup y lectura pública de reseñas", async () => {
  await h.clearSession(h.ADMIN_EMAIL);
  const admin = await h.login(h.ADMIN_EMAIL, ADMIN_PASS);
  h.assertStatus(admin.status, 200, "login admin");
  h.test.adminToken = admin.token;

  const pass = "Test1234x!";
  const emailNeg = h.repo("f21test.rev.neg");
  const emailNeg2 = h.repo("f21test.rev.neg2");
  const emailT1 = h.repo("f21test.rev.t1");
  const emailT2 = h.repo("f21test.rev.t2");

  for (const [n, e, r] of [
    ["Review Negociante", emailNeg, 2],
    ["Review Negociante 2", emailNeg2, 2],
    ["Review Turista 1", emailT1, 1],
    ["Review Turista 2", emailT2, 1],
  ]) {
    h.assertStatus((await h.createUser(admin.token, { nombre: n, email: e, password: pass, rol_id: r })).status, 201, `crear ${e}`);
  }

  const neg = await h.login(emailNeg, pass);
  const neg2 = await h.login(emailNeg2, pass);
  const t1 = await h.login(emailT1, pass);
  const t2 = await h.login(emailT2, pass);

  const creado = await h.api("/api/businesses", {
    method: "POST", token: neg.token,
    body: { nombre: "Restaurante Reseñable", category_id: 1, destination_id: 1, descripcion: "Para reseñas" },
  });
  h.assertStatus(creado.status, 201, "crear negocio");
  const aprobado = await h.api(`/api/businesses/${creado.json.data.id}/estado`, {
    method: "PUT", token: admin.token, body: { estado: "approved" },
  });
  h.assertStatus(aprobado.status, 200, "aprobar negocio");

  const pendiente = await h.api("/api/businesses", {
    method: "POST", token: neg2.token, body: { nombre: "Restaurante Sin Publicar", category_id: 1 },
  });
  h.assertStatus(pendiente.status, 201, "crear negocio pending");

  const vacio = await h.api(`/api/reviews/business/${creado.json.data.id}`);
  h.assertStatus(vacio.status, 200, "reseñas públicas (vacío)");
  h.assert(vacio.json.data.cantidad === 0 && vacio.json.data.promedio === 0 && vacio.json.data.resenas.length === 0, "0 reseñas");

  const oculto = await h.api(`/api/reviews/business/${pendiente.json.data.id}`);
  h.assertStatus(oculto.status, 404, "negocio no visible sin sesión → 404");

  h.test.neg = neg;
  h.test.neg2 = neg2;
  h.test.t1 = t1;
  h.test.t2 = t2;
  h.test.aprobado = creado.json.data;
  h.test.pendiente = pendiente.json.data;
});

h.test("REV: crear reseña, puntuación escalar y duplicado 409", async () => {
  const biz = h.test.aprobado.id;
  const t1 = h.test.t1.token;

  const sinToken = await h.api(`/api/reviews/business/${biz}`, { method: "POST", body: { rating: 5, comment: "x" } });
  h.assertStatus(sinToken.status, 401, "crear sin token 401");

  for (const [bad, label] of [[0, "0"], [6, "6"], [-1, "-1"], [999, "999"], ["abc", "texto"]]) {
    const r = await h.api(`/api/reviews/business/${biz}`, {
      method: "POST", token: t1, body: { rating: bad, comment: "mal" },
    });
    h.assertStatus(r.status, 400, `puntuación ${label} rechazada`);
    h.assertMsg(r.json, "entre 1 y 5");
  }

  const creada = await h.api(`/api/reviews/business/${biz}`, {
    method: "POST", token: t1,
    body: { rating: 5, comment: "Excelente atención y vistas." },
  });
  h.assertStatus(creada.status, 201, "crear reseña t1");
  h.assert(creada.json.data.review.rating === 5, "rating 5");
  h.assert(creada.json.data.review.user_id === h.test.t1.usuario.id, "user_id de la sesión");
  h.test.reviewT1 = creada.json.data.review;

  const sinComentario = await h.api(`/api/reviews/business/${biz}`, {
    method: "POST", token: h.test.t2.token, body: { rating: 3 },
  });
  h.assertStatus(sinComentario.status, 201, "reseña sin comentario válida");
  h.assert(sinComentario.json.data.review.comment === null, "comentario null");
  h.test.reviewT2 = sinComentario.json.data.review;

  const dup = await h.api(`/api/reviews/business/${biz}`, {
    method: "POST", token: t1, body: { rating: 4, comment: "otra" },
  });
  h.assertStatus(dup.status, 409, "duplicado por usuario 409");
});

h.test("REV: promedio correcto por backend", async () => {
  const lista = await h.api(`/api/reviews/business/${h.test.aprobado.id}`);
  h.assertStatus(lista.status, 200, "listar reseñas públicas");
  h.assert(lista.json.data.cantidad === 2, "cantidad 2");
  h.assert(Number(lista.json.data.promedio) === 4, `promedio 4 (5+3)/2 → ${lista.json.data.promedio}`);
  h.assert(lista.json.data.resenas.length === 2, "2 reseñas visibles");
  const r1 = lista.json.data.resenas.find((r) => r.id === h.test.reviewT1.id);
  const r2 = lista.json.data.resenas.find((r) => r.id === h.test.reviewT2.id);
  h.assert(r1.autor_nombre, "autor con nombre público");
  h.assert(r1.autor_email === undefined, "no se expone el email");
  h.assert(r1.autor_id === h.test.t1.usuario.id, "autor_id disponible para edición propia");
  h.assert(r1.puedo_editar === false && r2.puedo_editar === false,
    "anónimo no puede editar ninguna");

  const conSesion = await h.api(`/api/reviews/business/${h.test.aprobado.id}`, { token: h.test.t1.token });
  const m1 = conSesion.json.data.resenas.find((r) => r.id === h.test.reviewT1.id);
  const m2 = conSesion.json.data.resenas.find((r) => r.id === h.test.reviewT2.id);
  h.assert(m1.puedo_editar === true, "t1 ve su reseña como editable");
  h.assert(m2.puedo_editar === false, "t1 no puede editar la de t2");
});

h.test("REV: editar propia sí, ajena no, ADMIN puede", async () => {
  const edicion = await h.api(`/api/reviews/${h.test.reviewT1.id}`, {
    method: "PUT", token: h.test.t1.token, body: { rating: 4, comment: "Atención excelente (editada)" },
  });
  h.assertStatus(edicion.status, 200, "editar propia");
  h.assert(edicion.json.data.review.rating === 4, "rating actualizado");

  const ajeno = await h.api(`/api/reviews/${h.test.reviewT1.id}`, {
    method: "PUT", token: h.test.t2.token, body: { rating: 1 },
  });
  h.assertStatus(ajeno.status, 403, "editar ajena 403");

  const invalido = await h.api(`/api/reviews/${h.test.reviewT1.id}`, {
    method: "PUT", token: h.test.t1.token, body: { rating: 9 },
  });
  h.assertStatus(invalido.status, 400, "rating inválido en edición 400");

  const adminEdita = await h.api(`/api/reviews/${h.test.reviewT1.id}`, {
    method: "PUT", token: h.test.adminToken, body: { comment: "Moderado por admin" },
  });
  h.assertStatus(adminEdita.status, 200, "admin edita reseña");
});

h.test("REV: respuestas del negocio (ownership)", async () => {
  const revId = h.test.reviewT2.id;

  const resp = await h.api(`/api/reviews/${revId}/reply`, {
    method: "POST", token: h.test.neg.token, body: { reply: "¡Gracias por tu visita!" },
  });
  h.assertStatus(resp.status, 201, "el dueño responde");
  h.assert(resp.json.data.user_id === h.test.neg.usuario.id, "respuesta del dueño");

  const ajeno = await h.api(`/api/reviews/${revId}/reply`, {
    method: "POST", token: h.test.neg2.token, body: { reply: "intrusión" },
  });
  h.assertStatus(ajeno.status, 403, "otro negocio no responde");

  const turista = await h.api(`/api/reviews/${revId}/reply`, {
    method: "POST", token: h.test.t1.token, body: { reply: "no" },
  });
  h.assertStatus(turista.status, 403, "turista no responde");

  const duplicada = await h.api(`/api/reviews/${revId}/reply`, {
    method: "POST", token: h.test.neg.token, body: { reply: "repetida" },
  });
  h.assertStatus(duplicada.status, 409, "una sola respuesta por reseña");

  const vacia = await h.api(`/api/reviews/${h.test.reviewT1.id}/reply`, {
    method: "POST", token: h.test.neg.token, body: { reply: "   " },
  });
  h.assertStatus(vacia.status, 400, "respuesta vacía 400");

  const lista = await h.api(`/api/reviews/business/${h.test.aprobado.id}`);
  const conResp = lista.json.data.resenas.find((r) => r.id === revId);
  h.assert(conResp.respuestas.length === 1 && conResp.respuestas[0].reply === "¡Gracias por tu visita!", "respuesta visible en listado");

  h.assertStatus((await h.api(`/api/reviews/${revId}/reply`, {
    method: "DELETE", token: h.test.neg.token,
  })).status, 200, "dueño elimina respuesta");
});

h.test("REV: moderación ADMIN (ocultar/activar) y listado admin", async () => {
  const admin = h.test.adminToken;
  const lista = await h.api("/api/reviews", { token: admin });
  h.assertStatus(lista.status, 200, "admin lista todas las reseñas");
  h.assert(Array.isArray(lista.json.data) && lista.json.data.length >= 2, "admin ve reseñas");

  h.assertStatus((await h.api("/api/reviews", { token: h.test.t1.token })).status, 403, "turista no lista reseñas");

  const ocultar = await h.api(`/api/reviews/${h.test.reviewT1.id}/moderar`, {
    method: "PUT", token: admin, body: { estado: "hidden" },
  });
  h.assertStatus(ocultar.status, 200, "ocultar reseña");

  const pub = await h.api(`/api/reviews/business/${h.test.aprobado.id}`);
  h.assert(pub.json.data.cantidad === 1, "cantidad baja al ocultar");
  h.assert(pub.json.data.promedio === 3, "promedio recalcula (solo la visible)");

  const malo = await h.api(`/api/reviews/${h.test.reviewT1.id}/moderar`, {
    method: "PUT", token: admin, body: { estado: "spam" },
  });
  h.assertStatus(malo.status, 400, "estado moderación inválido 400");

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT1.id}/moderar`, {
    method: "PUT", token: admin, body: { estado: "active" },
  })).status, 200, "reactivar reseña");
});

h.test("REV: eliminar propia, ajena 403, admin modera eliminando", async () => {
  const t2 = h.test.t2.token;
  const admin = h.test.adminToken;

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT2.id}`, {
    method: "DELETE", token: h.test.t1.token,
  })).status, 403, "t1 no elimina reseña de t2");

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT2.id}`, {
    method: "DELETE", token: h.test.neg.token,
  })).status, 403, "el negocio no elimina reseña de cliente");

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT2.id}`, {
    method: "DELETE", token: t2,
  })).status, 200, "t2 elimina su propia reseña");

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT2.id}`, {
    method: "DELETE", token: t2,
  })).status, 404, "reseña ya no existe 404");

  h.assertStatus((await h.api(`/api/reviews/${h.test.reviewT1.id}`, {
    method: "DELETE", token: admin,
  })).status, 200, "admin elimina reseña (moderación)");
});

h.test("REV: limpieza administrada", async () => {
  for (const n of [h.test.aprobado, h.test.pendiente]) {
    h.assertStatus((await h.api("/api/businesses/" + n.id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar negocio ${n.id}`);
  }
  for (const u of [h.test.neg.usuario, h.test.neg2.usuario, h.test.t1.usuario, h.test.t2.usuario]) {
    const { rows } = await h.q("SELECT id FROM usuarios WHERE email = $1", [u.email]);
    h.assertStatus((await h.api("/api/usuarios/" + rows[0].id, {
      method: "DELETE", token: h.test.adminToken,
    })).status, 200, `borrar usuario ${u.email}`);
  }
  const admins = await h.countAdmins();
  h.assert(admins >= 1, `sigue habiendo al menos 1 admin (${admins})`);
});