/* =========================
   INITIAL SETUP
========================= */
const codeEl = document.getElementById("code");
const titleEl = document.getElementById("title");
const expEl = document.getElementById("explanation");
const langSelect = document.getElementById("language");
const searchInput = document.getElementById("search");
const toggleBtn = document.getElementById("themeToggle");

/* =========================
   SNIPPET LOGIC
========================= */
function getFilteredSnippets(language = "All") {
  let filtered =
    language === "All"
      ? snippets
      : snippets.filter(s => s.language === language);

  const query = searchInput.value.toLowerCase();
  if (query) {
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(query)
    );
  }

  return filtered;
}

function renderSnippet(language = "All") {
  const filtered = getFilteredSnippets(language);

  if (filtered.length === 0) {
    titleEl.innerText = "No snippet found";
    codeEl.innerText = "// Try a different search or language";
    expEl.innerText = "";
    codeEl.className = "";
    return;
  }

  const snippet =
    filtered[Math.floor(Math.random() * filtered.length)];

  titleEl.innerText = snippet.title;
  codeEl.innerText = snippet.code;
  expEl.innerText = snippet.explanation;

  codeEl.className =
    "language-" + snippet.language.toLowerCase();

  Prism.highlightAll();
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
   FAVORITES
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
  renderSnippet();
  document.getElementById("year").innerText =
    new Date().getFullYear();
};
