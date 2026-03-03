import CONFIG from './config.js';

const API = CONFIG.API_BASE_URL;

window.addEventListener("pageshow", (e) => {
  if (e.persisted ||
      localStorage.getItem("favoritesChanged") === "true" ||
      localStorage.getItem("snippetsChanged") === "true") {
    localStorage.removeItem("favoritesChanged");
    localStorage.removeItem("snippetsChanged");
    loadDashboardData();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "auth.html"; return; }
  localStorage.removeItem("favoritesChanged");
  loadDashboardData();
  loadHeatmap();
});

/* ==============================================
   DASHBOARD DATA
============================================== */
async function loadDashboardData() {
  const token = localStorage.getItem("token");
  if (!token) return;

  // Greeting
  const greetingEl = document.querySelector(".dashboard-header h2");
  if (greetingEl) {
    const h = new Date().getHours();
    greetingEl.textContent = h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 👋" : "Good Evening 🌙";
  }

  showSkeletons();

  try {
    const res = await fetch(`${API}/dashboard/me`, {
      headers: { "Authorization": `Bearer ${token}`, "Cache-Control": "no-cache, no-store" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    animateCount("statSnippets",  data.total_snippets    ?? 0);
    animateCount("statPublic",    data.public_count      ?? 0);
    animateCount("statPrivate",   data.private_count     ?? 0);
    animateCount("statFavorites", data.favorite_count    ?? 0);
    animateCount("statWeek",      data.created_this_week ?? 0);
    document.getElementById("totalSnippets").innerText = data.total_snippets ?? 0;

    const activityBox = document.querySelector(".dashboard-section");
    if (data.recent_snippets && data.recent_snippets.length > 0) {
      renderRecentSnippets(activityBox, data.recent_snippets);
    } else if (data.latest_snippet) {
      activityBox.innerHTML = `
        <h3>🕐 Latest Snippet</h3>
        <div class="activity-item">
          <span class="activity-dot"></span>
          <div class="activity-info">
            <p class="activity-title">📝 ${data.latest_snippet}</p>
            <p class="activity-meta">Created this week: <strong>${data.created_this_week ?? 0}</strong></p>
          </div>
        </div>`;
    } else {
      activityBox.innerHTML = `
        <h3>🕐 Recent Activity</h3>
        <p class="muted-text">No snippets yet. <a href="addnewsnippet.html" class="add-link">Add your first snippet →</a></p>`;
    }

    if (data.language_stats && Object.keys(data.language_stats).length > 0) {
      renderLanguageBreakdown(data.language_stats);
    }

  } catch (err) {
    console.error("Dashboard error:", err);
    showErrorState(err.message);
  }
}

/* ==============================================
   ACTIVITY HEATMAP
============================================== */
async function loadHeatmap() {
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API}/heatmap/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById("currentStreak").textContent = data.current_streak ?? 0;
    document.getElementById("longestStreak").textContent = data.longest_streak ?? 0;
    document.getElementById("activeDays").textContent    = data.total_days_active ?? 0;

    const grid   = document.getElementById("heatmapGrid");
    const counts = data.entries.map(e => e.count);
    const max    = Math.max(...counts, 1);

    grid.innerHTML = "";
    data.entries.forEach(entry => {
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";

      let level = 0;
      if (entry.count > 0) {
        const pct = entry.count / max;
        level = pct <= 0.25 ? 1 : pct <= 0.5 ? 2 : pct <= 0.75 ? 3 : 4;
      }

      cell.dataset.level = level;
      cell.title = `${entry.date}: ${entry.count} action${entry.count !== 1 ? "s" : ""}`;
      grid.appendChild(cell);
    });

  } catch (err) {
    console.warn("Heatmap error:", err);
    // Gracefully hide if heatmap fails
    const section = document.querySelector(".heatmap-section");
    if (section) section.style.display = "none";
  }
}

/* ==============================================
   HELPERS
============================================== */
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const steps = 30;
  let step = 0;
  const timer = setInterval(() => {
    step++;
    el.textContent = Math.min(Math.round((target / steps) * step), target);
    if (step >= steps) clearInterval(timer);
  }, 800 / steps);
}

function showSkeletons() {
  ["statSnippets","statPublic","statPrivate","statFavorites","statWeek"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span class="skeleton-pulse">–</span>`;
  });
}

function renderRecentSnippets(container, snippets) {
  const langColors = {
    python:"#3776ab", javascript:"#f7df1e", java:"#ed8b00",
    "c++":"#00599c", typescript:"#3178c6", html:"#e34c26",
    css:"#1572b6", go:"#00add8", rust:"#ce4a08", default:"#00d4ff"
  };

  const items = snippets.slice(0, 5).map(s => {
    const color = langColors[(s.language||"").toLowerCase()] || langColors.default;
    const date  = s.created_at
      ? new Date(s.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })
      : "";
    return `
      <div class="activity-item">
        <span class="activity-dot" style="background:${color};box-shadow:0 0 8px ${color}44"></span>
        <div class="activity-info">
          <p class="activity-title">${s.title || "Untitled"}</p>
          <div class="activity-meta-row">
            <span class="lang-badge" style="border-color:${color};color:${color}">${s.language}</span>
            <span class="activity-meta">${s.is_public ? "🌐 Public" : "🔒 Private"}</span>
            ${date ? `<span class="activity-meta">📅 ${date}</span>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <h3>🕐 Recent Snippets</h3>
      <a href="mysnippets.html" class="add-link" style="font-size:0.8rem">View all →</a>
    </div>
    <div class="activity-list">${items}</div>`;
}

function renderLanguageBreakdown(stats) {
  // Remove existing if any
  document.querySelectorAll(".lang-section").forEach(el => el.remove());

  const section = document.createElement("div");
  section.className = "dashboard-section lang-section";
  section.style.marginTop = "1rem";

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const bars  = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return `
        <div class="lang-bar-row">
          <span class="lang-bar-label">${lang}</span>
          <div class="lang-bar-track">
            <div class="lang-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="lang-bar-count">${count}</span>
        </div>`;
    }).join("");

  section.innerHTML = `<h3>📊 Languages Used</h3><div class="lang-breakdown">${bars}</div>`;
  document.querySelector(".app-container").appendChild(section);
}

function showErrorState(message) {
  const box = document.querySelector(".dashboard-section");
  if (box) box.innerHTML = `
    <h3>⚠️ Could not load dashboard</h3>
    <p class="muted-text">${message || "Check that your backend is running."}</p>
    <button onclick="location.reload()" class="retry-btn">🔄 Retry</button>`;
  ["statSnippets","statPublic","statPrivate","statFavorites","statWeek"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "–";
  });
}