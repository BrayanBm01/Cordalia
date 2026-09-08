const h = require("./helpers");

// Avatar base64 valido (1px PNG ~ bajo 100 bytes)
const AVATAR_SMALL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

h.test("PER: setup (crear y loguear un turista)", async () => {
  const pass = "Test1234x!";
  const email = h.repo("f21test.perfil");
  const created = await h.createUser(h.test.adminToken, {
    nombre: "Perfil Test", email, password: pass, rol_id: 1,
  });
  h.assertStatus(created.status, 201, "crear turista para perfil");

  const login = await h.login(email, pass);
  h.assertStatus(login.status, 200, "login del turista");

  h.test.perfil = { email, pass, token: login.token, id: created.json.data.id };
});

h.test("PER: actualizar nombre", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: { nombre: "Perfil Renombrado" },
  });
  h.assertStatus(r.status, 200, "actualizar nombre");
  h.assert(r.json.data.nombre === "Perfil Renombrado", "nombre actualizado");
  h.assert(r.json.data.rol === "TOURIST", "respuesta con rol");
});

h.test("PER: actualizar información completa", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: {
      apellido: "Apellido",
      telefono: "3001234567",
      ciudad: "Bogotá",
      pais: "Colombia",
      bio: "Me encanta viajar",
      intereses_turisticos: "Naturaleza, Playa",
      preferencias_viaje: "Solo, Aventura",
    },
  });
  h.assertStatus(r.status, 200, "actualizar info completa");
  h.assert(r.json.data.apellido === "Apellido", "apellido");
  h.assert(r.json.data.telefono === "3001234567", "telefono");
  h.assert(r.json.data.ciudad === "Bogotá", "ciudad");
  h.assert(r.json.data.pais === "Colombia", "pais");
  h.assert(r.json.data.bio === "Me encanta viajar", "bio");
  h.assert(
    r.json.data.intereses_turisticos === "Naturaleza, Playa",
    "intereses"
  );
  h.assert(
    r.json.data.preferencias_viaje === "Solo, Aventura",
    "preferencias"
  );
});

h.test("PER: actualizar avatar (data-URL base64)", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: { avatar_url: AVATAR_SMALL },
  });
  h.assertStatus(r.status, 200, "actualizar avatar");
  h.assert(r.json.data.avatar_url === AVATAR_SMALL, "avatar guardado");
});

h.test("PER: actualizar información + avatar juntos", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: {
      ciudad: "Medellín",
      bio: "Bio de prueba con avatar",
      avatar_url: AVATAR_SMALL,
    },
  });
  h.assertStatus(r.status, 200, "actualizar info+avatar");
  h.assert(r.json.data.ciudad === "Medellín", "ciudad actualizada");
  h.assert(r.json.data.bio === "Bio de prueba con avatar", "bio actualizada");
  h.assert(r.json.data.avatar_url === AVATAR_SMALL, "avatar conservado");
});

h.test("PER: actualizar parcialmente conserva los demás campos", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: { bio: "Solo toco la bio" },
  });
  h.assertStatus(r.status, 200, "update parcial de bio");
  h.assert(r.json.data.bio === "Solo toco la bio", "bio parcial");
  h.assert(r.json.data.ciudad === "Medellín", "ciudad NO se borra");
  h.assert(r.json.data.apellido === "Apellido", "apellido NO se borra");
  h.assert(r.json.data.avatar_url === AVATAR_SMALL, "avatar NO se borra");
});

h.test("PER: avatar demasiado grande -> 400 (no 500)", async () => {
  const grande = "data:image/png;base64," + "A".repeat(1024 * 1024 * 3);
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: { avatar_url: grande },
  });
  h.assertStatus(r.status, 400, "avatar > 2MB rechazado");
});

h.test("PER: tipo de avatar inválido -> 400", async () => {
  const x = "data:application/pdf;base64," + "B".repeat(200);
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    token: h.test.perfil.token,
    body: { avatar_url: x },
  });
  h.assertStatus(r.status, 400, "tipo no-imagen rechazado");
});

h.test("PER: usuario no autenticado -> 401", async () => {
  const r = await h.api("/api/auth/me", {
    method: "PUT",
    body: { nombre: "Sin token" },
  });
  h.assertStatus(r.status, 401, "sin token 401");
});

h.test("PER: persistencia tras volver a consultar /me", async () => {
  const r = await h.api("/api/auth/me", { token: h.test.perfil.token });
  h.assertStatus(r.status, 200, "/me");
  h.assert(r.json.data.nombre === "Perfil Renombrado", "nombre persistido");
  h.assert(r.json.data.ciudad === "Medellín", "ciudad persistida");
  h.assert(r.json.data.bio === "Solo toco la bio", "bio persistida");
  h.assert(r.json.data.avatar_url === AVATAR_SMALL, "avatar persistido");
});
