// ✅ FIX 1: pageshow fires on EVERY visit including back-button navigation
// DOMContentLoaded does NOT fire when browser restores from bfcache (back/forward cache)
window.addEventListener("pageshow", (e) => {
  // e.persisted = true means page was restored from bfcache (back button)
  if (e.persisted || localStorage.getItem("favoritesChanged") === "true" || localStorage.getItem("snippetsChanged") === "true") {
    localStorage.removeItem("favoritesChanged");
    localStorage.removeItem("snippetsChanged");
    loadDashboardData();
  }
});

document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  // Clear stale flag on fresh load
  localStorage.removeItem("favoritesChanged");

  loadDashboardData();
});

async function loadDashboardData() {

  const token = localStorage.getItem("token");
  if (!token) return;

  /* =========================
     GREETING BY TIME OF DAY
  ========================= */
  const greetingEl = document.querySelector(".dashboard-header h2");
  if (greetingEl) {
    const hour = new Date().getHours();
    let greeting = "Welcome Back 👋";
    if (hour < 12) greeting = "Good Morning ☀️";
    else if (hour < 17) greeting = "Good Afternoon 👋";
    else greeting = "Good Evening 🌙";
    greetingEl.textContent = greeting;
  }

  /* =========================
     SHOW SKELETON LOADING
  ========================= */
  showSkeletons();

  /* =========================
     FETCH DASHBOARD DATA
  ========================= */
  try {
    // cache: "no-store" forces a fresh request every time — never serves stale data
    const res = await fetch("http://127.0.0.1:8000/dashboard/me", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Cache-Control": "no-cache, no-store"
      },
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();

    /* --- Update stat cards with animated counters --- */
    animateCount("statSnippets", data.total_snippets ?? 0);
    animateCount("statPublic",   data.public_count    ?? 0);
    animateCount("statPrivate",  data.private_count   ?? 0);
    animateCount("statFavorites",data.favorite_count  ?? 0);
    animateCount("statWeek",     data.created_this_week ?? 0);  // ✅ FIXED: now inside try block

    document.getElementById("totalSnippets").innerText = data.total_snippets ?? 0;

    /* --- Recent Activity Section --- */
    const activityBox = document.querySelector(".dashboard-section");

    if (data.recent_snippets && data.recent_snippets.length > 0) {
      // If backend sends an array of recent snippets
      renderRecentSnippets(activityBox, data.recent_snippets);
    } else if (data.latest_snippet) {
      // Fallback: single latest snippet string
      activityBox.innerHTML = `
        <h3>🕐 Latest Snippet</h3>
        <div class="activity-item">
          <span class="activity-dot"></span>
          <div>
            <p class="activity-title">📝 ${data.latest_snippet}</p>
            <p class="activity-meta">Created this week: <strong>${data.created_this_week ?? 0}</strong></p>
          </div>
        </div>
      `;
    } else {
      activityBox.innerHTML = `
        <h3>🕐 Recent Activity</h3>
        <p class="muted-text">No snippets yet. <a href="#" class="add-link" data-view="add">Add your first snippet →</a></p>
      `;
    }

    /* --- Language Breakdown (if provided by backend) --- */
    if (data.language_stats && Object.keys(data.language_stats).length > 0) {
      renderLanguageBreakdown(data.language_stats);
    }

  } catch (err) {
    console.error("Dashboard fetch error:", err);
    showErrorState(err.message);
  }

} // end loadDashboardData

/* =========================
   ANIMATE NUMBER COUNTER
========================= */
function animateCount(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const duration = 800;
  const steps = 30;
  const stepValue = target / steps;
  let current = 0;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current = Math.min(Math.round(stepValue * step), target);
    el.textContent = current;
    if (step >= steps) clearInterval(timer);
  }, duration / steps);
}

/* =========================
   SKELETON LOADING STATE
========================= */
function showSkeletons() {
  ["statSnippets", "statPublic", "statPrivate", "statFavorites", "statWeek"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<span class="skeleton-pulse">–</span>`;
    }
  });
}

/* =========================
   RENDER RECENT SNIPPETS
========================= */
function renderRecentSnippets(container, snippets) {
  const langColors = {
    python:     "#3776ab",
    javascript: "#f7df1e",
    java:       "#ed8b00",
    "c++":      "#00599c",
    typescript: "#3178c6",
    html:       "#e34c26",
    css:        "#1572b6",
    default:    "#6c63ff"
  };

  const items = snippets.slice(0, 5).map(s => {
    const lang = (s.language || "").toLowerCase();
    const color = langColors[lang] || langColors.default;
    const date = s.created_at
      ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "";
    return `
      <div class="activity-item">
        <span class="activity-dot" style="background:${color}"></span>
        <div class="activity-info">
          <p class="activity-title">${s.title || "Untitled"}</p>
          <div class="activity-meta-row">
            <span class="lang-badge" style="border-color:${color};color:${color}">${s.language}</span>
            <span class="activity-meta">${s.is_public ? "🌐 Public" : "🔒 Private"}</span>
            ${date ? `<span class="activity-meta">📅 ${date}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `<h3>🕐 Recent Snippets</h3><div class="activity-list">${items}</div>`;
}

/* =========================
   RENDER LANGUAGE BREAKDOWN
========================= */
function renderLanguageBreakdown(stats) {
  const section = document.createElement("div");
  section.className = "dashboard-section";

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const bars = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="lang-bar-row">
          <span class="lang-bar-label">${lang}</span>
          <div class="lang-bar-track">
            <div class="lang-bar-fill" style="width: ${pct}%"></div>
          </div>
          <span class="lang-bar-count">${count}</span>
        </div>
      `;
    }).join("");

  section.innerHTML = `<h3>📊 Languages Used</h3><div class="lang-breakdown">${bars}</div>`;

  const mainContainer = document.querySelector(".app-container");
  if (mainContainer) mainContainer.appendChild(section);
}

/* =========================
   ERROR STATE
========================= */
function showErrorState(message) {
  const activityBox = document.querySelector(".dashboard-section");
  if (activityBox) {
    activityBox.innerHTML = `
      <h3>⚠️ Could not load dashboard</h3>
      <p class="muted-text">${message || "Check that your backend is running."}</p>
      <button onclick="location.reload()" class="retry-btn">🔄 Retry</button>
    `;
  }

  ["statSnippets", "statPublic", "statPrivate", "statFavorites", "statWeek"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "–";
  });
}