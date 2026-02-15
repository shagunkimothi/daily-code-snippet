/* =========================
   1. CONFIG & STATE
========================= */
const PUBLIC_API = "http://127.0.0.1:8000/snippets/public";
const PRIVATE_API = "http://127.0.0.1:8000/snippets/private";
const ADD_API = "http://127.0.0.1:8000/snippets/add";

let allSnippets = [];
let currentSnippet = null;

// Phase 5: Initialize favorites from LocalStorage
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];


/* =========================
   2. AUTH HANDLER
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

    if (!res.ok) {
      console.error("Failed API:", res.status);
      return;
    }

    const dbSnippets = await res.json();
    allSnippets = dbSnippets;
    showRandomSnippet();

  } catch (err) {
    console.error("Failed to load snippets:", err);
  }
}


/* =========================
   4. RENDERING LOGIC
========================= */
function showRandomSnippet() {

  const searchVal = document.getElementById("search").value.toLowerCase();
  const langVal = document.getElementById("language").value;

  const filtered = allSnippets.filter(s => {
    const matchesLang = langVal === "All" || s.language === langVal;
    const matchesSearch = s.title.toLowerCase().includes(searchVal);
    return matchesLang && matchesSearch;
  });

  const titleEl = document.getElementById("snippetTitle");
  const codeEl = document.getElementById("snippetCode");
  const explEl = document.getElementById("snippetExplanation");
  const langEl = document.getElementById("snippetLang");
  const favBtn = document.getElementById("favBtn");

  if (filtered.length === 0) {
    titleEl.innerText = "No snippets found";
    codeEl.innerText = "// Try changing filters";
    explEl.innerText = "";
    langEl.innerText = "";
    favBtn.style.display = "none";
    return;
  }

  favBtn.style.display = "inline-block";

  currentSnippet = filtered[Math.floor(Math.random() * filtered.length)];

  titleEl.innerText = currentSnippet.title;
  codeEl.textContent = currentSnippet.code;
  explEl.innerText = currentSnippet.explanation || "";
  langEl.innerText = `${currentSnippet.language} • ${currentSnippet.is_public ? "Public" : "Private"}`;

  updateFavoriteIcon();

  codeEl.className = `language-${currentSnippet.language.toLowerCase()}`;
  if (window.Prism) Prism.highlightElement(codeEl);
}


/* =========================
   5. FAVORITE HANDLING
========================= */
function updateFavoriteIcon() {
  const favBtn = document.getElementById("favBtn");
  if (!currentSnippet) return;

  const isFav = favorites.some(f => f.id === currentSnippet.id);
  favBtn.innerText = isFav ? "⭐" : "☆";
}

document.getElementById("favBtn").onclick = () => {
  if (!currentSnippet) return;

  const favIndex = favorites.findIndex(f => f.id === currentSnippet.id);

  if (favIndex > -1) {
    favorites.splice(favIndex, 1);
  } else {
    favorites.push(currentSnippet);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavoriteIcon();
};


/* =========================
   6. BUTTON EVENTS
========================= */
document.getElementById("randomBtn").onclick = showRandomSnippet;
document.getElementById("search").oninput = showRandomSnippet;
document.getElementById("language").onchange = showRandomSnippet;

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(
    document.getElementById("snippetCode").textContent
  );
  alert("Code copied!");
};


/* =========================
   7. SAVE NEW SNIPPET
========================= */
document.getElementById("saveSnippetBtn").onclick = async () => {

  const token = localStorage.getItem("token");

  if (!token) {
    return alert("Guest mode is read-only. Please Login to save snippets.");
  }

  const title = document.getElementById("newTitle").value.trim();
  const language = document.getElementById("newLang").value;
  const code = document.getElementById("newCode").value.trim();
  const explanation = document.getElementById("newExpl").value.trim();
  const isPublic = document.getElementById("newVisibility").checked;

  if (!title || !code) {
    return alert("Title and Code are required.");
  }

  try {
    const res = await fetch(ADD_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        language,
        code,
        explanation,
        is_public: isPublic
      })
    });

    if (!res.ok) {
      alert("Failed to save snippet.");
      return;
    }

    alert("Snippet saved successfully!");

    document.getElementById("addModal").classList.remove("active");

    document.getElementById("newTitle").value = "";
    document.getElementById("newCode").value = "";
    document.getElementById("newExpl").value = "";
    document.getElementById("newVisibility").checked = true;

    await loadSnippets();

  } catch (err) {
    alert("Server error.");
  }
};
