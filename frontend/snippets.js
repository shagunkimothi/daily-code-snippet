/* =========================
   1. CONFIG & STATE
========================= */
const PUBLIC_API = "http://127.0.0.1:8000/snippets/public";
const PRIVATE_API = "http://127.0.0.1:8000/snippets/private";
const ADD_API = "http://127.0.0.1:8000/snippets/add";

let allSnippets = [];
// Phase 5: Initialize favorites from LocalStorage
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

/* =========================
   2. AUTH HANDLER (RUNS IMMEDIATELY)
   Catches Google Redirects & Guest Mode
========================= */
(function handleAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlToken = urlParams.get("token");
  const error = urlParams.get("error");

  if (error) {
    alert("Google Login Error: " + error);
    window.location.href = "auth.html";
    return;
  }

  if (urlToken) {
    localStorage.setItem("token", urlToken);
    localStorage.removeItem("isGuest");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest");

  if (!token && !isGuest) {
    window.location.replace("auth.html");
  }
})();

/* =========================
   3. DATA FETCHING
========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadSnippets();
});

async function loadSnippets() {
  const token = localStorage.getItem("token");
  const endpoint = token ? PRIVATE_API : PUBLIC_API;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    const res = await fetch(endpoint, { headers });
    const dbSnippets = await res.json();
    renderSnippets(dbSnippets);
  } catch (err) {
    console.error("Failed to load snippets:", err);
  }
}

/* =========================
   4. RENDERING LOGIC
========================= */
function renderSnippets(snippets) {
  allSnippets = snippets;

  const searchVal = document.getElementById("search").value.toLowerCase();
  const langVal = document.getElementById("language").value;
  const titleEl = document.getElementById("snippetTitle");
  const codeEl = document.getElementById("snippetCode");
  const explEl = document.getElementById("snippetExplanation");
  const langEl = document.getElementById("snippetLang");
  const favBtn = document.getElementById("favBtn");

  const filtered = allSnippets.filter(s => {
    const matchesLang = langVal === "All" || s.language === langVal;
    const matchesSearch = s.title.toLowerCase().includes(searchVal);
    return matchesLang && matchesSearch;
  });

  if (filtered.length === 0) {
    titleEl.innerText = "No snippets found";
    codeEl.innerText = "// Try changing your search filters";
    explEl.innerText = "";
    langEl.innerText = "";
    favBtn.style.display = "none"; // Hide star if no snippet
    return;
  }

  favBtn.style.display = "inline-block";
  const snippet = filtered[Math.floor(Math.random() * filtered.length)];

  // Update DOM
  titleEl.innerText = snippet.title;
  codeEl.textContent = snippet.code;
  explEl.innerText = snippet.explanation || "";
  langEl.innerText = `${snippet.language} • ${snippet.is_public ? "Public" : "Private"}`;
  
  // Phase 5: Update Favorite Button State
  favBtn.dataset.id = snippet.id;
  const isFav = favorites.some(f => f.id === snippet.id);
  favBtn.innerText = isFav ? "⭐" : "☆";

  // Highlight
  codeEl.className = `language-${snippet.language.toLowerCase()}`;
  if (window.Prism) Prism.highlightElement(codeEl);
}

/* =========================
   5. EVENTS (Buttons & Actions)
========================= */
document.getElementById("randomBtn").onclick = () => {
  renderSnippets(allSnippets); // Just re-render from existing list for speed
};

document.getElementById("search").oninput = () => renderSnippets(allSnippets);
document.getElementById("language").onchange = () => renderSnippets(allSnippets);

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(document.getElementById("snippetCode").textContent);
  alert("Code copied!");
};

// Phase 5: Toggle Favorite Click Handler
document.getElementById("favBtn").onclick = (e) => {
  const currentId = parseInt(e.target.dataset.id);
  const snippet = allSnippets.find(s => s.id === currentId);
  
  if (!snippet) return;

  const favIndex = favorites.findIndex(f => f.id === currentId);

  if (favIndex > -1) {
    // Remove if already favorited
    favorites.splice(favIndex, 1);
    e.target.innerText = "☆";
  } else {
    // Add to favorites
    favorites.push(snippet);
    e.target.innerText = "⭐";
  }

  // Save to LocalStorage
  localStorage.setItem("favorites", JSON.stringify(favorites));
};

document.getElementById("saveSnippetBtn").onclick = async () => {
  const token = localStorage.getItem("token");
  
  if (!token) {
    return alert("Guest mode is read-only. Please Login to save snippets.");
  }

  const title = document.getElementById("newTitle").value;
  const language = document.getElementById("newLang").value;
  const code = document.getElementById("newCode").value;
  const explanation = document.getElementById("newExpl").value;
  const isPublic = document.getElementById("newVisibility").checked;

  if (!title || !code) return alert("Title and Code are required.");

  try {
    const res = await fetch(ADD_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, language, code, explanation, is_public: isPublic })
    });

    if (res.ok) {
      alert("Snippet saved!");
      document.getElementById("addModal").classList.remove("active");
      loadSnippets(); 
      // Reset inputs
      document.getElementById("newTitle").value = "";
      document.getElementById("newCode").value = "";
      document.getElementById("newExpl").value = "";
      document.getElementById("newVisibility").checked = true;
    } else {
      alert("Failed to save.");
    }
  } catch (err) {
    alert("Server error.");
  }
};