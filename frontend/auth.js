const AUTH_API = "http://127.0.0.1:8000/auth";

/* =========================
   1. AUTH GUARD
   Redirects logged-in users to Index
========================= */
(function () {
  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest");

  // Only run this check if we are actually ON the auth page
  if (window.location.pathname.includes("auth.html")) {
    // If logged in (and didn't just click 'Back'), go to app
    if (token || isGuest) {
      const navEntry = performance.getEntriesByType("navigation")[0];
      if (navEntry && navEntry.type !== "back_forward") {
         window.location.replace("index.html");
      }
    }
  }
})();

/* =========================
   2. LOGIN (Fixed Error Handling)
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

    // CRITICAL FIX: Check for server errors (HTML responses) before parsing JSON
    if (!res.ok) {
      const text = await res.text(); // Read as text first
      try {
        const json = JSON.parse(text); // Try to parse as JSON
        throw new Error(json.detail || "Login failed");
      } catch (e) {
        // If it wasn't JSON, it was likely an HTML error page (500/404)
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
   4. GUEST MODE
========================= */
function continueAsGuest() {
  localStorage.setItem("isGuest", "true");
  localStorage.removeItem("token");
  window.location.href = "index.html";
}