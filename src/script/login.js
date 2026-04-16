const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

let verifying = false;

// 🔒 VERIFICAR SESIÓN SOLO EN LOGIN
const token = localStorage.getItem("token");

if (token && !verifying && window.location.pathname === "/") {
  verifying = true;

  fetch("/login/verify", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token
    }
  })
    .then(res => res.json())
    .then(data => {
      console.log("VERIFY DATA:", data); // 👈 DEBUG

      if (data.ok) {
        const usuario = data.usuario || {};
        const rol = usuario.rol;

        // 🔥 guardar TODO (no solo rol)
        localStorage.setItem("rol", rol);
        localStorage.setItem("usuario", JSON.stringify(usuario));

        if (rol == 0) {
          window.location.replace("/admin");
        } else {
          window.location.replace("/usuario");
        }
      } else {
        localStorage.clear();
        verifying = false;
      }
    })
    .catch(() => {
      localStorage.clear();
      verifying = false;
    });
}

// 🔁 SWITCH FORM
function switchForm(show, hide) {
  hide.classList.remove("show");

  setTimeout(() => {
    hide.classList.add("hidden");
    show.classList.remove("hidden");
    show.classList.remove("show");
    void show.offsetWidth;
    show.classList.add("show");
  }, 200);
}

function showRegister() {
  switchForm(registerForm, loginForm);
}

function showLogin() {
  switchForm(loginForm, registerForm);
}

// 🔑 LOGIN
async function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Completa todos los campos");
    return;
  }

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    console.log("LOGIN DATA:", data); // 👈 DEBUG

    if (data.ok) {
      // 🔥 guardar TODO correctamente
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol);

      // 👇 IMPORTANTE: guardar usuario completo
      localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));

      if (data.rol == 0) {
        window.location.replace("/admin");
      } else {
        window.location.replace("/usuario");
      }

    } else {
      alert(data.mensaje || "Credenciales incorrectas");
    }

  } catch (error) {
    console.error(error);
    alert("Error al conectar con el servidor");
  }
}

// 🧾 REGISTER
async function registerUser() {
  const nombre = document.getElementById("registerNombre").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  if (!nombre || !email || !password) {
    alert("Completa todos los campos");
    return;
  }

  try {
    const res = await fetch("/api/usuarios/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nombre,
        email,
        password,
        rol_id: 1
      })
    });

    const data = await res.json();

    alert(data.mensaje || "Usuario registrado");

    if (res.ok) {
      showLogin();
    }

  } catch (error) {
    console.error(error);
    alert("Error al registrar");
  }
}