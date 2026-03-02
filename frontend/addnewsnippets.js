const ADD_API = "http://127.0.0.1:8000/snippets/add";
const AI_API  = "http://127.0.0.1:8000/snippets/generate-ai";

/* =========================
   GO BACK
========================= */
function goBack() {
  window.history.back();
}

/* =========================
   TAB SWITCHING
========================= */
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

/* =========================
   TOAST NOTIFICATION
========================= */
function showToast(message, color = "#22c55e") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.background = color;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

/* =========================
   MANUAL FORM SUBMIT
========================= */
document.getElementById("snippetForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please log in to add snippets.", "#ef4444");
    setTimeout(() => window.location.href = "auth.html", 1500);
    return;
  }

  const title       = document.getElementById("title").value.trim();
  const language    = document.getElementById("language").value;
  const code        = document.getElementById("code").value.trim();
  const explanation = document.getElementById("explanation").value.trim();
  const isPublic    = document.getElementById("isPublic").checked;

  if (!title || !code) {
    showToast("Title and Code are required.", "#ef4444");
    return;
  }

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const res = await fetch(ADD_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, language, code, explanation, is_public: isPublic })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${res.status}`);
    }

    // ✅ Tell dashboard a new snippet was created
    localStorage.setItem("snippetsChanged", "true");

    showToast("✅ Snippet saved successfully!");

    // Clear form
    document.getElementById("title").value = "";
    document.getElementById("code").value = "";
    document.getElementById("explanation").value = "";
    document.getElementById("isPublic").checked = true;

    // Redirect to dashboard after short delay
    setTimeout(() => window.location.href = "dashboard.html", 1500);

  } catch (err) {
    console.error("Save error:", err);
    showToast(`❌ ${err.message}`, "#ef4444");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create Snippet";
  }
});

/* =========================
   AI MAGIC
========================= */
async function generateAI() {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please log in to use AI Magic.", "#ef4444");
    return;
  }

  const topic = document.getElementById("aiTopic").value.trim();
  if (!topic) {
    showToast("Please enter a topic first.", "#ef4444");
    return;
  }

  const aiBtn = document.getElementById("aiBtn");
  aiBtn.textContent = "✨ Generating...";
  aiBtn.disabled = true;

  try {
    const res = await fetch(AI_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ topic })
    });

    if (!res.ok) throw new Error(`Server error ${res.status}`);

    const data = await res.json();

    // Strip markdown fences Gemini sometimes adds
    const clean = data.result.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Fill in manual form fields
    document.getElementById("title").value       = parsed.title       || "";
    document.getElementById("code").value        = parsed.code        || "";
    document.getElementById("explanation").value = parsed.explanation || "";

    // Match language to select option (case-insensitive)
    const langSelect = document.getElementById("language");
    const options = Array.from(langSelect.options).map(o => o.value.toLowerCase());
    const match = options.indexOf((parsed.language || "").toLowerCase());
    if (match !== -1) langSelect.selectedIndex = match;

    // Switch to manual tab so user can review and save
    document.querySelector('[data-tab="manual"]').click();
    showToast("✨ AI snippet ready! Review and click Create Snippet.");

  } catch (err) {
    console.error("AI error:", err);
    showToast("❌ AI generation failed. Check backend and API key.", "#ef4444");
  } finally {
    aiBtn.textContent = "✨ Generate Snippet";
    aiBtn.disabled = false;
  }
}

/* =========================
   BULK IMPORT
========================= */
async function importSnippets() {
  const token = localStorage.getItem("token");
  if (!token) {
    showToast("Please log in to import snippets.", "#ef4444");
    return;
  }

  // Try file first, then textarea
  let snippets = [];
  const fileInput = document.getElementById("jsonFile");
  const bulkText  = document.getElementById("bulkText").value.trim();

  try {
    if (fileInput.files.length > 0) {
      const text = await fileInput.files[0].text();
      snippets = JSON.parse(text);
    } else if (bulkText) {
      snippets = JSON.parse(bulkText);
    } else {
      showToast("Please provide a file or paste JSON.", "#ef4444");
      return;
    }
  } catch {
    showToast("❌ Invalid JSON format.", "#ef4444");
    return;
  }

  if (!Array.isArray(snippets)) {
    showToast("❌ JSON must be an array of snippets.", "#ef4444");
    return;
  }

  let saved = 0;
  let failed = 0;

  for (const s of snippets) {
    if (!s.title || !s.code) { failed++; continue; }

    try {
      const res = await fetch(ADD_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title:       s.title,
          language:    s.language    || "JavaScript",
          code:        s.code,
          explanation: s.explanation || "",
          is_public:   s.is_public   ?? true
        })
      });

      if (res.ok) saved++;
      else failed++;
    } catch { failed++; }
  }

  localStorage.setItem("snippetsChanged", "true");
  showToast(`✅ Imported ${saved} snippets${failed ? `, ${failed} failed` : ""}.`);

  if (saved > 0) {
    setTimeout(() => window.location.href = "dashboard.html", 2000);
  }
}