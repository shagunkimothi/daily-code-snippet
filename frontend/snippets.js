const PUBLIC_API = "http://127.0.0.1:8000/snippets/public";
const PRIVATE_API = "http://127.0.0.1:8000/snippets/private";

const title = document.getElementById("title");
const code = document.getElementById("code");
const explanation = document.getElementById("explanation");
const favoriteBtn = document.getElementById("favoriteBtn");
const copyBtn = document.getElementById("copyBtn");

let snippets = [];
let currentSnippet = null;

async function loadSnippets() {
  const token = localStorage.getItem("token");

  const res = await fetch(token ? PRIVATE_API : PUBLIC_API, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  snippets = await res.json();

  if (snippets.length === 0) {
    title.innerText = "No snippets yet ✨";
    code.innerText = "// Snippets will appear here once added";
    explanation.innerText = "";
    return;
  }

  renderSnippet();
}

function renderSnippet() {
  currentSnippet = snippets[Math.floor(Math.random() * snippets.length)];

  title.innerText = currentSnippet.title;
  code.innerText = currentSnippet.code;
  explanation.innerText = currentSnippet.explanation || "";
}

// ⭐ Favorite
favoriteBtn.onclick = () => {
  favoriteBtn.classList.toggle("text-yellow-400");
  alert("Saved to favorites ⭐ (local only)");
};

// 📋 Copy
copyBtn.onclick = () => {
  navigator.clipboard.writeText(code.innerText);
  alert("Copied to clipboard 📋");
};
