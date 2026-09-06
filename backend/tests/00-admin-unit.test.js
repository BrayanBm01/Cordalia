const h = require("./helpers");
const UsuarioModel = require("../src/models/usuarioModel");
const usuarioController = require("../src/controllers/usuarioController");

function mockResponse() {
  const res = { statusCode: 200 };
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    res.body = obj;
    return res;
  };
  return res;
}

const original = {
  findById: UsuarioModel.findById,
  countAdmins: UsuarioModel.countAdmins,
  delete: UsuarioModel.delete,
  update: UsuarioModel.update,
};

function restore() {
  Object.assign(UsuarioModel, original);
}

h.test("UNIT: ADMIN no puede eliminarse a sí mismo (403)", async () => {
  UsuarioModel.findById = async (id) => ({ id: Number(id), rol_id: 0 });
  let deleteCalls = 0;
  UsuarioModel.delete = async () => {
    deleteCalls++;
    return true;
  };
  const res = mockResponse();
  await usuarioController.remove({ params: { id: 42 }, usuario: { id: 42 } }, res);
  h.assertStatus(res.statusCode, 403, "self-delete");
  h.assertMsg(res.body, "Un administrador no puede eliminarse a sí mismo");
  h.assert(deleteCalls === 0, "delete no debe ejecutarse");
  restore();
});

h.test("UNIT: no se puede eliminar al último administrador (403)", async () => {
  UsuarioModel.findById = async (id) => ({ id: Number(id), rol_id: 0 });
  UsuarioModel.countAdmins = async () => 1;
  let deleteCalls = 0;
  UsuarioModel.delete = async () => {
    deleteCalls++;
    return true;
  };
  const res = mockResponse();
  await usuarioController.remove({ params: { id: 43 }, usuario: { id: 1 } }, res);
  h.assertStatus(res.statusCode, 403, "last-admin delete");
  h.assertMsg(res.body, "No se puede eliminar al último administrador");
  h.assert(deleteCalls === 0, "delete no debe ejecutarse");
  restore();
});

h.test("UNIT: con más de un admin, se permite eliminar a otro admin", async () => {
  UsuarioModel.findById = async (id) => ({ id: Number(id), rol_id: 0 });
  UsuarioModel.countAdmins = async () => 2;
  let deleteCalls = 0;
  UsuarioModel.delete = async () => {
    deleteCalls++;
    return true;
  };
  const res = mockResponse();
  await usuarioController.remove({ params: { id: 43 }, usuario: { id: 1 } }, res);
  h.assertStatus(res.statusCode, 200, "delete another admin");
  h.assert(deleteCalls === 1, "delete debe ejecutarse una vez");
  restore();
});

h.test("UNIT: no se puede demotar al último administrador (403)", async () => {
  UsuarioModel.findById = async (id) => ({ id: Number(id), rol_id: 0 });
  UsuarioModel.countAdmins = async () => 1;
  let updateCalls = 0;
  UsuarioModel.update = async () => {
    updateCalls++;
    return {};
  };
  const res = mockResponse();
  await usuarioController.update(
    { params: { id: 43 }, usuario: { rol: "ADMIN" }, body: { rol_id: 1 } },
    res
  );
  h.assertStatus(res.statusCode, 403, "last-admin demote");
  h.assertMsg(res.body, "No se puede quitar el rol de administrador");
  h.assert(updateCalls === 0, "update no debe ejecutarse");
  restore();
});