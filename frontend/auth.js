const AUTH_API = "http://127.0.0.1:8000/auth";

/* =========================
   LOGIN
========================= */
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Login failed");
      return;
    }

    // ✅ clear guest mode
    localStorage.removeItem("isGuest");

    localStorage.setItem("token", data.access_token);
    window.location.href = "index.html";
  } catch (err) {
    alert("Backend not reachable");
    console.error(err);
  }
}

/* =========================
   SIGNUP
========================= */
async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  try {
    const res = await fetch(`${AUTH_API}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Signup failed");
      return;
    }

    alert("Signup successful. Please login.");
  } catch (err) {
    alert("Backend not reachable");
    console.error(err);
  }
}

/* =========================
   GUEST MODE
========================= */
function continueAsGuest() {
  localStorage.removeItem("token");
  localStorage.setItem("isGuest", "true");
  window.location.href = "index.html";
}
