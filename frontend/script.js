/* =========================
   INITIAL SETUP
========================= */
// Auto redirect logic


// script.js
const AUTH_API = "http://127.0.0.1:8000/auth";

/* =========================
   DOM ELEMENTS
========================= */
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const toggleBtn = document.getElementById("themeToggle");

/* =========================
   UI HELPERS
========================= */
function showAuth() {
  authScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
}

function showApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

/* =========================
   AUTH ACTIONS
========================= */
async function login() {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  // FIX 1: Use URLSearchParams instead of JSON
  const formData = new URLSearchParams();
  formData.append("username", email); // Backend expects 'username', so we map email to it
  formData.append("password", password);

  try {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: {
        // FIX 2: Correct Content-Type for FastAPI Login
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData, // Send form data object directly
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Login failed");
      return;
    }

    // ✅ LOGIN SUCCESS
    localStorage.setItem("token", data.access_token);
    
    // Clear guest mode if it was active
    localStorage.removeItem("isGuest"); 
    
    showApp();
    loadSnippets();
    
  } catch (error) {
    console.error("Login Error:", error);
    alert("An error occurred during login.");
  }
}

async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password are required");
    return;
  }

  const res = await fetch(`${AUTH_API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (res.ok) {
    alert("Signup successful. Please login.");
  } else {
    const err = await res.json();
    alert(err.detail || "Signup failed");
  }
}

function continueAsGuest() {
  localStorage.removeItem("token");
  localStorage.setItem("isGuest", "true"); // <--- ADD THIS LINE
  showApp();
  loadSnippets(); 
}

function logout() {
  localStorage.removeItem("token");
  // ADD THIS LINE:
  localStorage.removeItem("isGuest");
  showAuth();
}

/* =========================
   THEME (PERSISTENT)
========================= */
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light");
  toggleBtn.textContent = "🌞";
}

toggleBtn.onclick = () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  toggleBtn.textContent = isLight ? "🌞" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");
};

/* =========================
   INIT
========================= */
/* =========================
   INIT
========================= */
/* =========================
   INIT
========================= */
window.onload = () => {
  document.getElementById("year").innerText = new Date().getFullYear();

  const token = localStorage.getItem("token");
  // ADD THIS LINE:
  const isGuest = localStorage.getItem("isGuest");

  // CHECK BOTH CONDITIONS:
  if (token || isGuest === "true") {
    showApp();
    // Load snippets (logic handles public/private inside loadSnippets)
    loadSnippets(); 
  } else {
    showAuth();
  }
};