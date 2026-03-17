import CONFIG from './config.js';

const API = CONFIG.API_BASE_URL;  // ✅ Fixed: was hardcoded to http://127.0.0.1:8000
let currentSnippetId = null;
let isRandomMode = false;
let activeTag = "";
let searchPage = 1;
let searchTotal = 0;
let searchDebounce = null;

document.addEventListener("DOMContentLoaded", async () => {
  const token     = localStorage.getItem("token");
  const toggleBtn = document.getElementById("themeToggle");
  const logoutBtn = document.getElementById("logoutBtn");
  const dateEl    = document.getElementById("todayDate");
  const randomBtn = document.getElementById("randomBtn");
  const copyBtn   = document.getElementById("copyBtn");
  const favBtn    = document.getElementById("favBtn");
  const searchInput      = document.getElementById("searchInput");
  const languageFilter   = document.getElementById("languageFilter");
  const difficultyFilter = document.getElementById("difficultyFilter");
  const backToDaily      = document.getElementById("backToDaily");
   
  const isGuest = localStorage.getItem("isGuest") === "true";

  // If no token exists and they aren't a guest, kick them to the login page
  if (!token && !isGuest) {
    window.location.href = "auth.html";
    return;
  }

  /* ── THEME ── */
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
    if (toggleBtn) toggleBtn.innerText = "☀️";
  }
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      document.body.classList.toggle("light");
      const isLight = document.body.classList.contains("light");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      toggleBtn.innerText = isLight ? "☀️" : "🌙";
    });
  }

  /* ── LOGOUT ── */
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      window.location.href = "auth.html";
    });
  }

  /* ── DATE ── */
  if (dateEl) {
    dateEl.innerText = new Date().toLocaleDateString("en-US", {
      weekday:"long", year:"numeric", month:"long", day:"numeric"
    });
  }

  /* ── COUNTDOWN TO MIDNIGHT (next snippet) ── */
  function updateCountdown() {
    const now       = new Date();
    const midnight  = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const diff      = midnight - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const el = document.getElementById("countdown");
    if (el && !isRandomMode) {
      el.textContent = `${h}h ${m}m ${s}s`;
    }
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ── LOAD TAGS ── */
  try {
    const tagsRes = await fetch(`${API}/tags`);
    const tags    = await tagsRes.json();
    const tagFilters = document.getElementById("tagFilters");
    tags.forEach(tag => {
      const chip = document.createElement("span");
      chip.className = "tag-chip";
      chip.dataset.tag = tag.name;
      chip.textContent = tag.name;
      chip.addEventListener("click", () => {
        document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeTag = tag.name;
        searchPage = 1;
        runSearch();
      });
      tagFilters.appendChild(chip);
    });

    tagFilters.querySelector('[data-tag=""]').addEventListener("click", () => {
      document.querySelectorAll(".tag-chip").forEach(c => c.classList.remove("active"));
      tagFilters.querySelector('[data-tag=""]').classList.add("active");
      activeTag = "";
      searchPage = 1;
      if (isFiltering()) runSearch(); else showDailySection();
    });
  } catch (e) { console.warn("Tags load failed:", e); }

  /* ── SEARCH FILTERS ── */
  function isFiltering() {
    return searchInput.value.trim() !== "" ||
           languageFilter.value !== "" ||
           difficultyFilter.value !== "" ||
           activeTag !== "";
  }

  function onFilterChange() {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      searchPage = 1;
      if (isFiltering()) runSearch(); else showDailySection();
    }, 300);
  }

  searchInput.addEventListener("input", onFilterChange);
  languageFilter.addEventListener("change", onFilterChange);
  difficultyFilter.addEventListener("change", onFilterChange);

  /* ── PAGINATION ── */
  document.getElementById("prevPage").addEventListener("click", () => {
    if (searchPage > 1) { searchPage--; runSearch(); }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    if (searchPage * 12 < searchTotal) { searchPage++; runSearch(); }
  });

  /* ── SEARCH ── */
  async function runSearch() {
    const q          = searchInput.value.trim();
    const language   = languageFilter.value;
    const difficulty = difficultyFilter.value;
    const params     = new URLSearchParams({ page: searchPage, per_page: 12 });
    if (q)          params.set("q", q);
    if (language)   params.set("language", language);
    if (difficulty) params.set("difficulty", difficulty);
    if (activeTag)  params.set("tag", activeTag);

    const headers = token ? { "Authorization": `Bearer ${token}` } : {};
    try {
      const res  = await fetch(`${API}/snippets/search?${params}`, { headers });
      const data = await res.json();
      searchTotal = data.total;

      document.getElementById("dailySection").style.display = "none";
      document.getElementById("galleryList").style.display  = "block";
      document.getElementById("pagination").style.display   = data.total > 12 ? "flex" : "none";
      document.getElementById("resultsCount").textContent   =
        `${data.total} result${data.total !== 1 ? "s" : ""} found`;

      document.getElementById("pageInfo").textContent  = `Page ${data.page}`;
      document.getElementById("prevPage").disabled     = data.page <= 1;
      document.getElementById("nextPage").disabled     = data.page * 12 >= data.total;

      renderGallery(data.snippets, token);
    } catch (err) { console.error("Search error:", err); }
  }

  /* ── GALLERY RENDER ── */
  function renderGallery(snippets, token) {
    const list = document.getElementById("galleryList");
    list.innerHTML = "";
    if (!snippets.length) {
      list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:2rem">No snippets match your filters.</p>`;
      return;
    }
    snippets.forEach(s => {
      const card      = document.createElement("div");
      card.className  = "snippet-card";
      const diffClass = `diff-${s.difficulty || "beginner"}`;
      const tagBadges = (s.tags || []).map(t => `<span class="tag-badge">${t.name}</span>`).join("");
      const favHtml   = token
        ? `<button class="fav-btn" data-id="${s.id}" style="margin-left:auto">☆</button>` : "";
      card.innerHTML = `
        <div class="snippet-header">
          <h3>${s.title}</h3>
          <span class="snippet-meta">${s.language} • ${s.is_public ? "Public" : "Private"}</span>
        </div>
        <pre><code class="language-${s.language.toLowerCase()}">${escapeHtml(s.code)}</code></pre>
        <p class="explanation">${s.explanation || ""}</p>
        <div class="snippet-footer">
          <span class="diff-badge ${diffClass}">${s.difficulty || "beginner"}</span>
          ${tagBadges}${favHtml}
        </div>`;
      list.appendChild(card);
    });

    if (token) {
      list.querySelectorAll(".fav-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id  = btn.dataset.id;
          const isFav = btn.textContent === "⭐";
          const res = await fetch(`${API}/favorites/${id}`, {
            method: isFav ? "DELETE" : "POST",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
          });
          if (res.ok) { btn.textContent = isFav ? "☆" : "⭐"; localStorage.setItem("favoritesChanged","true"); }
        });
      });
    }
    if (window.Prism) Prism.highlightAll();
  }

  function escapeHtml(str) {
    return (str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  /* ── SHOW DAILY SECTION ── */
  function showDailySection() {
    document.getElementById("dailySection").style.display = "block";
    document.getElementById("galleryList").style.display  = "none";
    document.getElementById("pagination").style.display   = "none";
    document.getElementById("resultsCount").textContent   = "";
  }

  /* ── LOAD SNIPPET (daily or random) ── */
  async function loadSnippet(url, isRandom) {
    isRandomMode = isRandom;

    const randomLabel = document.getElementById("randomLabel");
    const sectionDate = document.getElementById("countdown");

    if (isRandom) {
      randomLabel.classList.add("visible");
      if (sectionDate) sectionDate.closest(".next-snippet-info").style.visibility = "hidden";
    } else {
      randomLabel.classList.remove("visible");
      if (sectionDate) sectionDate.closest(".next-snippet-info").style.visibility = "visible";
    }

    try {
      const res  = await fetch(url);
      const data = await res.json();
      currentSnippetId = data.id;

      document.getElementById("snippetTitle").innerText       = data.title;
      document.getElementById("snippetCode").textContent      = data.code;
      document.getElementById("snippetExplanation").innerText = data.explanation || "";
      document.getElementById("snippetLang").innerText        =
        `${data.language} • ${data.is_public ? "Public" : "Private"}`;

      const footer    = document.getElementById("snippetFooter");
      const diffClass = `diff-${data.difficulty || "beginner"}`;
      const tagBadges = (data.tags || []).map(t => `<span class="tag-badge">${t.name}</span>`).join("");
      footer.innerHTML = `<span class="diff-badge ${diffClass}">${data.difficulty || "beginner"}</span>${tagBadges}`;

      if (window.Prism) Prism.highlightAll();
      if (token) checkIfFavorited();
    } catch (err) {
      document.getElementById("snippetTitle").innerText = "No snippets available yet.";
      console.error("Snippet load error:", err);
    }
  }

  /* ── BACK TO DAILY ── */
  if (backToDaily) {
    backToDaily.addEventListener("click", () => loadSnippet(`${API}/snippets/daily`, false));
  }

  /* ── FAVORITES ── */
  async function checkIfFavorited() {
    try {
      const res  = await fetch(`${API}/favorites/me`, { headers: { "Authorization": `Bearer ${token}` } });
      const favs = await res.json();
      const isFav = favs.some(f => f.id === currentSnippetId);
      favBtn.classList.toggle("active", isFav);
      favBtn.innerText = isFav ? "⭐" : "☆";
    } catch (e) {}
  }

  if (favBtn && token) {
    favBtn.addEventListener("click", async () => {
      if (!currentSnippetId) return;
      const isFav = favBtn.classList.contains("active");
      const res   = await fetch(`${API}/favorites/${currentSnippetId}`, {
        method: isFav ? "DELETE" : "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        favBtn.classList.toggle("active");
        favBtn.innerText = favBtn.classList.contains("active") ? "⭐" : "☆";
        localStorage.setItem("favoritesChanged", "true");
      }
    });
  }

  /* ── COPY ── */
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(document.getElementById("snippetCode").textContent || "");
      copyBtn.innerText = "✅ Copied";
      setTimeout(() => copyBtn.innerText = "📋 Copy", 1500);
    });
  }

  /* ── RANDOM ── */
  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      showDailySection();
      loadSnippet(`${API}/snippets/random`, true);
    });
  }

  /* ── INIT: load today's snippet ── */
  loadSnippet(`${API}/snippets/daily`, false);
});