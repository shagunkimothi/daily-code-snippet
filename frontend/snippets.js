/* =========================
   1. CONFIG & STATE
========================= */
const PUBLIC_API = "http://127.0.0.1:8000/snippets/public";
const PRIVATE_API = "http://127.0.0.1:8000/snippets/private";

let allSnippets = [];
let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

/* =========================
   2. AUTH HANDLER (RUNS IMMEDIATELY)
   Catches Google Redirects & Guest Mode
========================= */
(function handleAuth() {
  // A. Check URL for Google Token or Error
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
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // B. Security Check
  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest");

  // If no token AND no guest flag -> Kick to Login
  if (!token && !isGuest) {
    window.location.replace("auth.html");
  }
})();

/* =========================
   3. DATA FETCHING
========================= */
// Wait for DOM, then load data
document.addEventListener("DOMContentLoaded", () => {
  loadSnippets();
});

async function loadSnippets() {
  const token = localStorage.getItem("token");
  const isGuest = localStorage.getItem("isGuest") === "true";

  let dbSnippets = [];

  if (token) {
    const res = await fetch("http://127.0.0.1:8000/snippets/private", {
      headers: { Authorization: `Bearer ${token}` }
    });
    dbSnippets = await res.json();
  }

  // Merge guest + db snippets
  const allSnippets = [...GUEST_SNIPPETS, ...dbSnippets];

  renderSnippets(allSnippets);
}

/* =========================
   4. RENDERING LOGIC
========================= */
function renderSnippets(snippets) {
  // Update global allSnippets
  allSnippets = snippets;

  const searchVal = document.getElementById("search").value.toLowerCase();
  const langVal = document.getElementById("language").value;
  const titleEl = document.getElementById("snippetTitle");
  const codeEl = document.getElementById("snippetCode");
  const explEl = document.getElementById("snippetExplanation");

  // Filter
  const filtered = allSnippets.filter(s => {
    const matchesLang = langVal === "All" || s.language === langVal;
    const matchesSearch = s.title.toLowerCase().includes(searchVal);
    return matchesLang && matchesSearch;
  });

  // Empty State
  if (filtered.length === 0) {
    titleEl.innerText = "No snippets found";
    codeEl.innerText = "// Try changing your search filters";
    explEl.innerText = "";
    return;
  }

  // Pick Random
  const snippet = filtered[Math.floor(Math.random() * filtered.length)];

  // Update DOM
  titleEl.innerText = snippet.title;
  codeEl.textContent = snippet.code;
  explEl.innerText = snippet.explanation || "";
  
  // Highlight
  codeEl.className = `language-${snippet.language.toLowerCase()}`;
  if (window.Prism) Prism.highlightElement(codeEl);
}

/* =========================
   5. EVENTS (Buttons & Actions)
========================= */
document.getElementById("randomBtn").onclick = renderSnippets;
document.getElementById("search").oninput = renderSnippets;
document.getElementById("language").onchange = renderSnippets;

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(document.getElementById("snippetCode").textContent);
  alert("Code copied!");
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

  if (!title || !code) return alert("Title and Code are required.");

  try {
    const res = await fetch(PRIVATE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, language, code, explanation })
    });

    if (res.ok) {
      alert("Snippet saved!");
      document.getElementById("addModal").classList.remove("active");
      loadSnippets(); 
      // Reset inputs
      document.getElementById("newTitle").value = "";
      document.getElementById("newCode").value = "";
      document.getElementById("newExpl").value = "";
    } else {
      alert("Failed to save.");
    }
  } catch (err) {
    alert("Server error.");
  }
};