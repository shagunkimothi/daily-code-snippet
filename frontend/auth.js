const AUTH_API = "http://127.0.0.1:8000/auth";



  async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Email and password required");
    return;
  }

  // ⬅️ MUST be form-urlencoded
  const formData = new URLSearchParams();
  formData.append("username", email); // backend expects "username"
  formData.append("password", password);

  try {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Invalid email or password");
      return;
    }

    // ✅ SUCCESS
    localStorage.setItem("token", data.access_token);
    localStorage.removeItem("isGuest");

    window.location.href = "index.html";
  } catch (err) {
    console.error("Login error:", err);
    alert("Login failed");
  }
}


async function signup() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  const res = await fetch(`${AUTH_API}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (res.ok) alert("Signup successful. Please login.");
  else alert("Signup failed");
}

function continueAsGuest() {
  localStorage.removeItem("token");
  localStorage.setItem("isGuest", "true");
  window.location.replace("index.html");
}
