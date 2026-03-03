import CONFIG from './config.js';

// Replace hardcoded URLs with dynamic ones
const ADD_API = `${CONFIG.API_BASE_URL}/snippets/add`;
const AI_API  = `${CONFIG.API_BASE_URL}/snippets/generate-ai`;
let currentTags = [];

/* ── TABS ── */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* ── TOAST ── */
function showToast(msg, color="#22c55e") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = color;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

/* ── TAGS INPUT ── */
const tagInput   = document.getElementById("tagInput");
const tagsPreview = document.getElementById("tagsPreview");

function renderTags() {
  tagsPreview.innerHTML = "";
  currentTags.forEach((tag, i) => {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = tag;
    pill.addEventListener("click", () => {
      currentTags.splice(i, 1);
      renderTags();
    });
    tagsPreview.appendChild(pill);
  });
}

tagInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = tagInput.value.trim().toLowerCase().replace(/,/g,"");
    if (val && !currentTags.includes(val) && currentTags.length < 6) {
      currentTags.push(val);
      renderTags();
    }
    tagInput.value = "";
  }
});

/* ── MANUAL FORM SUBMIT ── */
document.getElementById("snippetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = localStorage.getItem("token");
  if (!token) { showToast("Please log in.", "#ef4444"); return; }

  const title       = document.getElementById("title").value.trim();
  const language    = document.getElementById("language").value;
  const difficulty  = document.getElementById("difficulty").value;
  const category    = document.getElementById("category").value;
  const code        = document.getElementById("code").value.trim();
  const explanation = document.getElementById("explanation").value.trim();
  const isPublic    = document.getElementById("isPublic").checked;

  if (!title || !code) { showToast("Title and Code are required.", "#ef4444"); return; }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const res = await fetch(ADD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ title, language, difficulty, category, code, explanation, is_public: isPublic, tags: currentTags })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }

    localStorage.setItem("snippetsChanged", "true");
    showToast("✅ Snippet saved!");

    // Reset form
    document.getElementById("title").value = "";
    document.getElementById("code").value = "";
    document.getElementById("explanation").value = "";
    document.getElementById("isPublic").checked = true;
    currentTags = [];
    renderTags();

    setTimeout(() => window.location.href = "dashboard.html", 1500);
  } catch (err) {
    showToast(`❌ ${err.message}`, "#ef4444");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Snippet";
  }
});

/* ── AI MAGIC ── */
async function generateAI() {
  const token = localStorage.getItem("token");
  if (!token) { showToast("Please log in.", "#ef4444"); return; }

  const topic = document.getElementById("aiTopic").value.trim();
  if (!topic) { showToast("Please enter a topic.", "#ef4444"); return; }

  const aiBtn = document.getElementById("aiBtn");
  aiBtn.textContent = "✨ Generating...";
  aiBtn.disabled = true;

  try {
    const res = await fetch(AI_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ topic })
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data   = await res.json();
    const clean  = data.result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    document.getElementById("title").value       = parsed.title       || "";
    document.getElementById("code").value        = parsed.code        || "";
    document.getElementById("explanation").value = parsed.explanation || "";

    // Language
    const langSelect = document.getElementById("language");
    const langMatch  = Array.from(langSelect.options).findIndex(o => o.value.toLowerCase() === (parsed.language||"").toLowerCase());
    if (langMatch !== -1) langSelect.selectedIndex = langMatch;

    // Difficulty
    const diffSelect = document.getElementById("difficulty");
    const diffMatch  = Array.from(diffSelect.options).findIndex(o => o.value === (parsed.difficulty||"").toLowerCase());
    if (diffMatch !== -1) diffSelect.selectedIndex = diffMatch;

    // Category
    const catSelect = document.getElementById("category");
    const catMatch  = Array.from(catSelect.options).findIndex(o => o.value === (parsed.category||"").toLowerCase());
    if (catMatch !== -1) catSelect.selectedIndex = catMatch;

    // Tags from AI
    if (Array.isArray(parsed.tags)) {
      currentTags = parsed.tags.slice(0, 6).map(t => t.toLowerCase());
      renderTags();
    }

    document.querySelector('[data-tab="manual"]').click();
    showToast("✨ AI snippet ready! Review and save.");

  } catch (err) {
    showToast("❌ AI generation failed.", "#ef4444");
  } finally {
    aiBtn.textContent = "✨ Generate Snippet";
    aiBtn.disabled = false;
  }
}

/* ── BULK IMPORT ── */
async function importSnippets() {
  const token = localStorage.getItem("token");
  if (!token) { showToast("Please log in.", "#ef4444"); return; }

  let snippets = [];
  const fileInput = document.getElementById("jsonFile");
  const bulkText  = document.getElementById("bulkText").value.trim();

  try {
    if (fileInput.files.length > 0) {
      snippets = JSON.parse(await fileInput.files[0].text());
    } else if (bulkText) {
      snippets = JSON.parse(bulkText);
    } else {
      showToast("Provide a file or paste JSON.", "#ef4444");
      return;
    }
  } catch {
    showToast("❌ Invalid JSON.", "#ef4444");
    return;
  }

  if (!Array.isArray(snippets)) { showToast("❌ JSON must be an array.", "#ef4444"); return; }

  let saved = 0, failed = 0;
  for (const s of snippets) {
    if (!s.title || !s.code) { failed++; continue; }
    try {
      const res = await fetch(ADD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          title: s.title, language: s.language || "JavaScript",
          code: s.code, explanation: s.explanation || "",
          is_public: s.is_public ?? true,
          difficulty: s.difficulty || "beginner",
          category: s.category || "snippet",
          tags: Array.isArray(s.tags) ? s.tags : []
        })
      });
      if (res.ok) saved++; else failed++;
    } catch { failed++; }
  }

  localStorage.setItem("snippetsChanged", "true");
  showToast(`✅ Imported ${saved}${failed ? `, ${failed} failed` : ""} snippets.`);
  if (saved > 0) setTimeout(() => window.location.href = "dashboard.html", 2000);
}