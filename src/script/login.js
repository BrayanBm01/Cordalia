    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // 🔥 REDIRIGIR SI YA ESTÁ LOGUEADO
    const token = localStorage.getItem("token");
    if (token) {
      window.location.href = "/index.html";
    }

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

    // ✅ LOGIN
    async function loginUser() {
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        alert("Completa todos los campos");
        return;
      }

      try {
        const res = await fetch("/login", { // 🔥 CORREGIDO AQUÍ
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (data.ok) { // 🔥 usamos lo que devuelve el backend corregido
          localStorage.setItem("token", data.token);
          alert(data.mensaje);

          // 🚀 REDIRECCIÓN
          window.location.href = "/index.html";
        } else {
          alert(data.mensaje);
        }

      } catch (error) {
        console.error(error);
        alert("Error al conectar con el servidor");
      }
    }

    // ✅ REGISTRO
    async function registerUser() {
      const nombre = document.getElementById("registerNombre").value;
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      const error = document.getElementById("emailError");

      if (!nombre || !email || !password) {
        alert("Completa todos los campos");
        return;
      }

      if (!email.endsWith("@gmail.com")) {
        error.classList.remove("hidden");
        return;
      }

      error.classList.add("hidden");

      try {
        const res = await fetch("/api/usuarios/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ nombre, email, password })
        });

        const data = await res.json();

        if (data.ok || res.ok) { // 🔥 más flexible por si backend no usa "ok"
          alert(data.mensaje);
          showLogin();
        } else {
          alert(data.mensaje);
        }

      } catch (error) {
        console.error(error);
        alert("Error al conectar con el servidor");
      }
    }
