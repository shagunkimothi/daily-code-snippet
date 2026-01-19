// script.js
const AUTH_API = "http://127.0.0.1:8000/auth";

/* =========================
   THEME (PERSISTENT)
========================= */
const toggleBtn = document.getElementById("themeToggle");

// Apply saved theme
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  toggleBtn.textContent = "🌞";
}

// Toggle theme
toggleBtn.onclick = () => {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  toggleBtn.textContent = isLight ? "🌞" : "🌙";

  localStorage.setItem("theme", isLight ? "light" : "dark");
};

/* =========================
   AUTH HELPERS
========================= */
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("isGuest");
  window.location.href = "auth.html";
}

/* =========================
   GOOGLE CALLBACK HANDLING
========================= */
function handleGoogleTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem("token", token);
    localStorage.removeItem("isGuest");

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/* =========================
   INIT (INDEX.HTML ONLY)
========================= */
window.onload = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.innerText = new Date().getFullYear();

  handleGoogleTokenFromUrl();

  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest");

  // 🚫 Not logged in → go to auth page
  if (!token && isGuest !== "true") {
    window.location.replace("auth.html");
    return;
  }

  // ✅ Logged in OR guest → load app data
  if (typeof loadSnippets === "function") {
    loadSnippets();
  }
};
