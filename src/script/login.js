const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

let verifying = false;

// VERIFICAR SESIÓN SOLO EN LOGIN
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
      console.log("VERIFY DATA:", data);

      if (data.ok) {
        const usuario = data.usuario || {};
        const rol = usuario.rol;

        localStorage.setItem("rol", rol);
        localStorage.setItem("usuario", JSON.stringify(usuario));

        if (rol === 0 || rol === "ADMIN") {
          window.location.replace("/admin");
        } else if (rol === 1 || rol === "USER") {
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

// SWITCH FORM
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

// LOGIN
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

    console.log("LOGIN DATA:", data);

    // BLOQUEO POR SESIÓN ACTIVA
    if (res.status === 403) {
      alert("Ya hay una sesión iniciada en otro dispositivo");
      return;
    }

    if (data.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.rol);
      localStorage.setItem("usuario", JSON.stringify(data.usuario || {}));

      if (data.rol === "ADMIN") {
        window.location.replace("/admin");
      } else if (data.rol === "USER") {
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

// LOGOUT
async function logoutUser() {
  const token = localStorage.getItem("token");

  try {
    await fetch("/login/logout", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token
      }
    });
  } catch (error) {
    console.error(error);
  }

  localStorage.clear();
  window.location.href = "/";
}

// REGISTER
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