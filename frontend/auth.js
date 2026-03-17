// frontend/auth.js
import CONFIG from './config.js';

const AUTH_API = `${CONFIG.API_BASE_URL}/auth`;

/* =========================
   1. AUTH GUARD
========================= */
(function () {
  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest");

  if (window.location.pathname.includes("auth.html")) {
    if ((token || isGuest) && !window.location.search.includes("force=true")) {
      window.location.replace("index.html");
    }
  }

  // ✅ Handle token from Google OAuth redirect (?token=...)
  const params = new URLSearchParams(window.location.search);
  const googleToken = params.get("token");
  if (googleToken) {
    localStorage.setItem("token", googleToken);
    localStorage.removeItem("isGuest");
    // Clean URL and redirect to dashboard
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.replace("index.html");
  }
})();


/* =========================
   2. LOGIN
========================= */
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) return alert("Please fill in all fields");

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password })
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.detail || "Login failed");
      } catch (e) {
        console.error("Server Error HTML:", text);
        throw new Error(`Server Error (${res.status}). Check console.`);
      }
    }

    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    localStorage.removeItem("isGuest");
    window.location.href = "index.html";

  } catch (err) {
    alert(err.message);
  }
}

/* =========================
   3. SIGNUP
========================= */
async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) return alert("Please fill in all fields");

  try {
    const res = await fetch(`${AUTH_API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.detail || "Signup failed");
      } catch {
        throw new Error(`Server Error (${res.status})`);
      }
    }

    alert("Signup successful! Please log in.");

  } catch (err) {
    alert(err.message);
  }
}

/* =========================
   4. GOOGLE LOGIN  ✅ Fixed: was missing entirely
========================= */
function googleLogin() {
  window.location.href = `${CONFIG.API_BASE_URL}/auth/google/login`;
}

/* =========================
   5. GUEST MODE
========================= */
function continueAsGuest() {
  localStorage.setItem("isGuest", "true");
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

/* =========================
   6. EXPOSE FUNCTIONS GLOBALLY
   (so onclick="" in HTML works)
========================= */
window.login = login;
window.signup = signup;
window.googleLogin = googleLogin;
window.continueAsGuest = continueAsGuest;