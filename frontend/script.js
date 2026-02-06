/* =========================
   1. THEME LOGIC
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("themeToggle");
  const storedTheme = localStorage.getItem("theme");
  
  // Set initial theme
  if (storedTheme === "light") {
    document.body.classList.add("light");
    toggleBtn.innerText = "☀️";
  } else {
    toggleBtn.innerText = "🌙";
  }

  // Toggle on click
  toggleBtn.onclick = () => {
    document.body.classList.toggle("light");
    const isLight = document.body.classList.contains("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    toggleBtn.innerText = isLight ? "☀️" : "🌙";
  };
});

/* =========================
   2. MODAL LOGIC (Open/Close)
========================= */
const modal = document.getElementById("addModal");
const openBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementById("closeModalBtn");

if (openBtn) {
  openBtn.onclick = () => modal.classList.add("active");
}

if (closeBtn) {
  closeBtn.onclick = () => modal.classList.remove("active");
}

// Close if clicked outside
window.onclick = (e) => {
  if (e.target === modal) modal.classList.remove("active");
};

/* =========================
   3. LOGOUT
========================= */
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    localStorage.clear();
    window.location.href = "auth.html";
  };
}