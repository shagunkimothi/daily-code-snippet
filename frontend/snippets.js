// snippets.js

const PUBLIC_API = "http://127.0.0.1:8000/snippets/public";
const PRIVATE_API = "http://127.0.0.1:8000/snippets/private";

/* =========================
   STATE
========================= */
let snippets = [];

/* =========================
   DOM ELEMENTS
========================= */
const titleEl = document.getElementById("title");
const codeEl = document.getElementById("code");
const explanationEl = document.getElementById("explanation");

const randomBtn = document.getElementById("randomBtn");
const searchInput = document.getElementById("search");
const languageSelect = document.getElementById("language");
const copyBtn = document.getElementById("copyBtn");

/* =========================
   LOAD SNIPPETS
========================= */
async function loadSnippets() {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(token ? PRIVATE_API : PUBLIC_API, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      location.reload();
      return;
    }

    snippets = await res.json();

    if (!snippets.length) {
      showEmptyState();
      return;
    }

    renderSnippet();
  } catch (err) {
    console.error("Failed to load snippets:", err);
    showErrorState();
  }
}

/* =========================
   RENDER SNIPPET
========================= */
function renderSnippet(language = "All", query = "") {
  let filtered = [...snippets];

  if (language !== "All") {
    filtered = filtered.filter(
      s => s.language.toLowerCase() === language.toLowerCase()
    );
  }

  if (query) {
    filtered = filtered.filter(
      s => s.title.toLowerCase().includes(query.toLowerCase())
    );
  }

  if (!filtered.length) {
    showEmptyState();
    return;
  }

  const snippet =
    filtered[Math.floor(Math.random() * filtered.length)];

  titleEl.innerText = snippet.title;
  codeEl.innerText = snippet.code;
  explanationEl.innerText = snippet.explanation || "";

  codeEl.className = `language-${snippet.language.toLowerCase()}`;
  Prism.highlightAll();
}

/* =========================
   UI STATES
========================= */
function showEmptyState() {
  titleEl.innerText = "No snippets found";
  codeEl.innerText = "// Try a different search or language";
  explanationEl.innerText = "";
  codeEl.className = "";
}

function showErrorState() {
  titleEl.innerText = "Backend not reachable";
  codeEl.innerText = "// Start FastAPI server first";
  explanationEl.innerText = "";
  codeEl.className = "";
}

/* =========================
   EVENTS
========================= */
if (randomBtn) {
  randomBtn.onclick = () =>
    renderSnippet(languageSelect.value, searchInput.value);
}

if (searchInput) {
  searchInput.oninput = () =>
    renderSnippet(languageSelect.value, searchInput.value);
}

if (languageSelect) {
  languageSelect.onchange = () =>
    renderSnippet(languageSelect.value, searchInput.value);
}

if (copyBtn) {
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(codeEl.innerText);
    alert("Copied!");
  };
}
