/* =========================
   INITIAL SETUP
========================= */
const API_URL = "http://127.0.0.1:8000/snippets";

const codeEl = document.getElementById("code");
const titleEl = document.getElementById("title");
const expEl = document.getElementById("explanation");
const langSelect = document.getElementById("language");
const searchInput = document.getElementById("search");
const toggleBtn = document.getElementById("themeToggle");

let snippets = [];

/* =========================
   FETCH SNIPPETS (BACKEND)
========================= */
async function fetchSnippets() {
  try {
    const res = await fetch(API_URL);
    snippets = await res.json();

    if (!snippets.length) {
      showEmptyState();
      return;
    }

    renderSnippet();
  } catch (err) {
    console.error("Error fetching snippets:", err);
    titleEl.innerText = "Backend not running";
    codeEl.innerText = "// Start FastAPI server first";
    expEl.innerText = "";
  }
}

/* =========================
   FILTERING LOGIC
========================= */
function getFilteredSnippets(language = "All") {
  let filtered =
    language === "All"
      ? snippets
      : snippets.filter(
          s => s.language.toLowerCase() === language.toLowerCase()
        );

  const query = searchInput.value.toLowerCase();
  if (query) {
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(query)
    );
  }

  return filtered;
}

/* =========================
   RENDER SNIPPET
========================= */
function renderSnippet(language = "All") {
  const filtered = getFilteredSnippets(language);

  if (!filtered.length) {
    showEmptyState();
    return;
  }

  const snippet =
    filtered[Math.floor(Math.random() * filtered.length)];

  titleEl.innerText = snippet.title;
  codeEl.innerText = snippet.code;
  expEl.innerText = snippet.explanation || "";

  codeEl.className = `language-${snippet.language.toLowerCase()}`;
  Prism.highlightAll();
}

/* =========================
   EMPTY STATE
========================= */
function showEmptyState() {
  titleEl.innerText = "No snippets found";
  codeEl.innerText = "// Try adding snippets from backend";
  expEl.innerText = "";
  codeEl.className = "";
}

/* =========================
   EVENTS
========================= */
document.getElementById("randomBtn").addEventListener("click", () => {
  renderSnippet(langSelect.value);
});

searchInput.addEventListener("input", () => {
  renderSnippet(langSelect.value);
});

langSelect.addEventListener("change", () => {
  renderSnippet(langSelect.value);
});

document.getElementById("copyBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(codeEl.innerText);
  alert("Copied!");
});

/* =========================
   FAVORITES (LOCAL)
========================= */
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

document.getElementById("favBtn").addEventListener("click", () => {
  const currentTitle = titleEl.innerText;

  if (!favorites.includes(currentTitle)) {
    favorites.push(currentTitle);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("⭐ Added to favorites");
  } else {
    alert("Already in favorites");
  }
});

/* =========================
   THEME (PERSISTENT)
========================= */
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  toggleBtn.textContent = "🌞";
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  toggleBtn.textContent = isLight ? "🌞" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

/* =========================
   INIT
========================= */
window.onload = () => {
  fetchSnippets();
  document.getElementById("year").innerText =
    new Date().getFullYear();
};
