import CONFIG from './config.js';

const ADD_API = `${CONFIG.API_BASE_URL}/snippets/add`;
const AI_API  = `${CONFIG.API_BASE_URL}/snippets/generate-ai`;
let currentTags = [];

/* ── TABS ── */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add("active");
  });
});

/* ── TOAST ── */
function showToast(msg, color = "#22c55e") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.background = color;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

/* ── TAGS INPUT ── */
const tagInput = document.getElementById("tagInput");
const tagsPreview = document.getElementById("tagsPreview");

function renderTags() {
  if (!tagsPreview) return;
  tagsPreview.innerHTML = "";
  currentTags.forEach((tag, i) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.innerHTML = `${tag} <span class="remove-tag">&times;</span>`;
    pill.onclick = () => {
      currentTags.splice(i, 1);
      renderTags();
    };
    tagsPreview.appendChild(pill);
  });
}

tagInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = tagInput.value.trim().toLowerCase().replace(/,/g, "");
    if (val && !currentTags.includes(val) && currentTags.length < 6) {
      currentTags.push(val);
      renderTags();
    }
    tagInput.value = "";
  }
});

/* ── MANUAL FORM SUBMIT ── */
document.getElementById("snippetForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) { showToast("Please log in.", "#ef4444"); return; }

  const submitBtn = document.getElementById("submitBtn");
  const payload = {
    title: document.getElementById("title").value.trim(),
    language: document.getElementById("language").value,
    difficulty: document.getElementById("difficulty").value,
    category: document.getElementById("category").value,
    code: document.getElementById("code").value.trim(),
    explanation: document.getElementById("explanation").value.trim(),
    is_public: document.getElementById("isPublic").checked,
    tags: currentTags
  };

  if (!payload.title || !payload.code) { 
    showToast("Title and Code are required.", "#ef4444"); 
    return; 
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const res = await fetch(ADD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to save snippet");

    localStorage.setItem("snippetsChanged", "true");
    showToast("✅ Snippet saved!");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
  } catch (err) {
    showToast(`❌ ${err.message}`, "#ef4444");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Snippet";
  }
});

/* ── AI MAGIC ── */
async function generateAI() {
  const token = localStorage.getItem("token");
  const topic = document.getElementById("aiTopic")?.value.trim();
  const language = document.getElementById("aiLanguage")?.value || "Python";
  const aiBtn = document.getElementById("aiBtn");

  if (!token) return showToast("Please log in.", "#ef4444");
  if (!topic) return showToast("Please enter a topic.", "#ef4444");

  const originalText = aiBtn.textContent;
  aiBtn.textContent = "✨ Generating...";
  aiBtn.disabled = true;

  try {
    const res = await fetch(AI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ topic, language })  // ← send language to backend
    });

    const data = await res.json();
    const jsonMatch = data.result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI format");

    const parsed = JSON.parse(jsonMatch[0]);

    // Switch to manual tab and fill in fields
    document.getElementById("title").value = parsed.title || "";
    document.getElementById("code").value = parsed.code || "";
    document.getElementById("explanation").value = parsed.explanation || "";

    const setSelect = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      const match = Array.from(el.options).findIndex(o => o.value.toLowerCase() === (val || "").toLowerCase());
      if (match !== -1) el.selectedIndex = match;
    };

    setSelect("language", parsed.language || language);  // fallback to chosen language
    setSelect("difficulty", parsed.difficulty);
    setSelect("category", parsed.category);

    if (Array.isArray(parsed.tags)) {
      currentTags = [...new Set(parsed.tags.slice(0, 6).map(t => t.toLowerCase().trim()))];
      renderTags();
    }

    document.querySelector('[data-tab="manual"]')?.click();
    showToast(`✨ ${language} snippet ready!`);

  } catch (err) {
    showToast("❌ AI generation failed.", "#ef4444");
  } finally {
    aiBtn.textContent = originalText;
    aiBtn.disabled = false;
  }
}

/* ── BULK IMPORT ── */
async function importSnippets() {
  const token = localStorage.getItem("token");
  if (!token) return showToast("Please log in.", "#ef4444");

  const fileInput = document.getElementById("jsonFile");
  const bulkText = document.getElementById("bulkText").value.trim();
  let snippets = [];

  try {
    if (fileInput.files.length > 0) {
      snippets = JSON.parse(await fileInput.files[0].text());
    } else if (bulkText) {
      snippets = JSON.parse(bulkText);
    } else {
      return showToast("Provide a file or paste JSON.", "#ef4444");
    }
  } catch {
    return showToast("❌ Invalid JSON format.", "#ef4444");
  }

  if (!Array.isArray(snippets)) return showToast("❌ JSON must be an array.", "#ef4444");

  showToast("🚀 Importing...", "#3b82f6");

  const promises = snippets.map(s =>
    fetch(ADD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        title: s.title || "Untitled",
        language: s.language || "JavaScript",
        code: s.code || "",
        explanation: s.explanation || "",
        is_public: s.is_public ?? true,
        difficulty: s.difficulty || "beginner",
        category: s.category || "snippet",
        tags: Array.isArray(s.tags) ? s.tags : []
      })
    }).then(res => res.ok).catch(() => false)
  );

  const results = await Promise.all(promises);
  const saved = results.filter(Boolean).length;
  
  localStorage.setItem("snippetsChanged", "true");
  showToast(`✅ ${saved} saved, ${results.length - saved} failed.`);
  if (saved > 0) setTimeout(() => window.location.href = "dashboard.html", 2000);
}

// Bindings
document.getElementById("aiBtn")?.addEventListener("click", generateAI);
document.getElementById("importBtn")?.addEventListener("click", importSnippets);