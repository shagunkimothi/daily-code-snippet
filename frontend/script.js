let currentSnippetId = null;

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  const toggleBtn = document.getElementById("themeToggle");
  const logoutBtn = document.getElementById("logoutBtn");
  const dateElement = document.getElementById("todayDate");
  const randomBtn = document.getElementById("randomBtn");
  const copyBtn = document.getElementById("copyBtn");
  const favBtn = document.getElementById("favBtn");

  const titleEl = document.getElementById("snippetTitle");
  const codeEl = document.getElementById("snippetCode");
  const explanationEl = document.getElementById("snippetExplanation");
  const langEl = document.getElementById("snippetLang");

  /* =========================
     THEME
  ========================= */

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
     LOGOUT
  ========================= */

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      window.location.href = "auth.html";
    });
  }

  /* =========================
     DATE DISPLAY
  ========================= */

  if (dateElement) {
    const today = new Date();
    dateElement.innerText = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  /* =========================
     LOAD DAILY SNIPPET
  ========================= */

  async function loadDailySnippet() {
    try {
      const res = await fetch("http://127.0.0.1:8000/snippets/daily");
      const data = await res.json();

      currentSnippetId = data.id;

      titleEl.innerText = data.title;
      codeEl.textContent = data.code;
      explanationEl.innerText = data.explanation || "";
      langEl.innerText = `${data.language} • ${data.is_public ? "Public" : "Private"}`;

      if (window.Prism) Prism.highlightAll();

      if (token) checkIfFavorited();

    } catch (err) {
      console.error("Daily snippet error:", err);
    }
  }

  /* =========================
     LOAD RANDOM SNIPPET
  ========================= */

  async function loadRandomSnippet() {
    try {
      const res = await fetch("http://127.0.0.1:8000/snippets/random");
      const data = await res.json();

      currentSnippetId = data.id;

      titleEl.innerText = data.title;
      codeEl.textContent = data.code;
      explanationEl.innerText = data.explanation || "";
      langEl.innerText = `${data.language} • ${data.is_public ? "Public" : "Private"}`;

      if (window.Prism) Prism.highlightAll();

      if (token) checkIfFavorited();

    } catch (err) {
      console.error("Random snippet error:", err);
    }
  }

  /* =========================
     FAVORITE LOGIC
  ========================= */

  async function checkIfFavorited() {
    const res = await fetch("http://127.0.0.1:8000/favorites/me", {
      headers: { "Authorization": `Bearer ${token}` }
    });

    const favorites = await res.json();
    const isFav = favorites.some(f => f.id === currentSnippetId);

    if (isFav) {
      favBtn.classList.add("active");
      favBtn.innerText = "⭐";
    } else {
      favBtn.classList.remove("active");
      favBtn.innerText = "☆";
    }
  }

  if (favBtn && token) {
    favBtn.addEventListener("click", async () => {

      if (!currentSnippetId) return;

      const isFavorited = favBtn.classList.contains("active");
      const method = isFavorited ? "DELETE" : "POST";

      const res = await fetch(
        `http://127.0.0.1:8000/favorites/${currentSnippetId}`,
        {
          method,
          headers: { "Authorization": `Bearer ${token}` }
        }
      );

      if (res.ok) {
        favBtn.classList.toggle("active");
        favBtn.innerText = favBtn.classList.contains("active") ? "⭐" : "☆";
      }
    });
  }

  /* =========================
     COPY BUTTON
  ========================= */

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(codeEl.textContent);
      copyBtn.innerText = "✅ Copied";
      setTimeout(() => {
        copyBtn.innerText = "📋 Copy";
      }, 1500);
    });
  }

  /* =========================
     RANDOM BUTTON
  ========================= */

  if (randomBtn) {
    randomBtn.addEventListener("click", loadRandomSnippet);
  }

  /* =========================
     INIT
  ========================= */

  loadDailySnippet();

});