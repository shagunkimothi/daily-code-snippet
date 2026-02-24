document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     1. THEME LOGIC
  ========================= */
  const toggleBtn = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("theme");

  if (storedTheme === "light") {
    document.body.classList.add("light");
    if (toggleBtn) toggleBtn.innerText = "☀️";
  } else {
    if (toggleBtn) toggleBtn.innerText = "🌙";
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light");
      const isLight = document.body.classList.contains("light");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      toggleBtn.innerText = isLight ? "☀️" : "🌙";
    });
  }


  /* =========================
     2. LOGOUT
  ========================= */
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      window.location.href = "auth.html";
    });
  }


  /* =========================
     3. TODAY'S DATE DISPLAY
  ========================= */
  const dateElement = document.getElementById("todayDate");

  if (dateElement) {
    const today = new Date();

    dateElement.innerText = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

});