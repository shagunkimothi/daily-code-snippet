import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header/Header";
import Toast from "../components/Toast/Toast";
import { useToast } from "../hooks/useToast";
import * as snippetService from "../services/snippetService";

const LANGUAGES = ["JavaScript", "Python", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"];
const AI_LANGUAGES = [
  ["Python", "🐍 Python"],
  ["JavaScript", "🌐 JavaScript"],
  ["TypeScript", "🔷 TypeScript"],
  ["Java", "☕ Java"],
  ["C++", "⚙️ C++"],
  ["C", "🔧 C"],
  ["Go", "🐹 Go"],
  ["Rust", "🦀 Rust"],
  ["HTML", "🧱 HTML"],
  ["CSS", "🎨 CSS"],
  ["SQL", "🗄️ SQL"],
  ["Bash", "🖥️ Bash"],
  ["Kotlin", "🟣 Kotlin"],
  ["Swift", "🍎 Swift"],
  ["PHP", "🐘 PHP"],
  ["Ruby", "💎 Ruby"],
  ["R", "📊 R"],
  ["Dart", "🎯 Dart"],
];
const DIFFICULTIES = [
  ["beginner", "🟢 Beginner"],
  ["intermediate", "🟡 Intermediate"],
  ["advanced", "🔴 Advanced"],
];
const CATEGORIES = ["snippet", "algorithm", "data-structure", "utility", "pattern", "other"];

const inputClass =
  "w-full rounded-md border border-border bg-card px-4 py-3 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none";

function matchOption(options, value, fallback) {
  const hit = options.find((o) => o.toLowerCase() === (value || "").toLowerCase());
  return hit || fallback;
}

// 1:1 port of addnewsnippet.html + addnewsnippets.js: three tabs (Manual /
// AI Generate / Bulk Import) sharing the same underlying manual-form state,
// since AI Generate fills the manual fields and switches tabs, exactly
// like the original.
export default function AddSnippet() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("manual");

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("JavaScript");
  const [difficulty, setDifficulty] = useState("beginner");
  const [category, setCategory] = useState("snippet");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [aiTopic, setAiTopic] = useState("");
  const [aiLanguage, setAiLanguage] = useState("Python");
  const [aiBusy, setAiBusy] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const fileInputRef = useRef(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { toast, showToast } = useToast();

  function addTag() {
    const val = tagInput.trim().toLowerCase().replace(/,/g, "");
    if (val && !tags.includes(val) && tags.length < 6) {
      setTags((prev) => [...prev, val]);
    }
    setTagInput("");
  }

  function handleTagKeyDown(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  function removeTag(index) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please log in.", "error");

    const payload = {
      title: title.trim(),
      language,
      difficulty,
      category,
      code: code.trim(),
      explanation: explanation.trim(),
      is_public: isPublic,
      tags,
    };

    if (!payload.title || !payload.code) {
      return showToast("Title and Code are required.", "error");
    }

    setSubmitting(true);
    try {
      await snippetService.addSnippet(payload);
      localStorage.setItem("snippetsChanged", "true");
      showToast("✅ Snippet saved!");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      showToast(`❌ ${err.message}`, "error");
      setSubmitting(false);
    }
  }

  async function handleGenerateAi() {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please log in.", "error");
    if (!aiTopic.trim()) return showToast("Please enter a topic.", "error");

    setAiBusy(true);
    try {
      const data = await snippetService.generateAiSnippet({ topic: aiTopic.trim(), language: aiLanguage });
      const jsonMatch = data.result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid AI format");
      const parsed = JSON.parse(jsonMatch[0]);

      setTitle(parsed.title || "");
      setCode(parsed.code || "");
      setExplanation(parsed.explanation || "");
      setLanguage(matchOption(LANGUAGES, parsed.language || aiLanguage, aiLanguage));
      setDifficulty(matchOption(DIFFICULTIES.map((d) => d[0]), parsed.difficulty, difficulty));
      setCategory(matchOption(CATEGORIES, parsed.category, category));

      if (Array.isArray(parsed.tags)) {
        setTags([...new Set(parsed.tags.slice(0, 6).map((t) => t.toLowerCase().trim()))]);
      }

      setTab("manual");
      showToast(`✨ ${aiLanguage} snippet ready!`);
    } catch {
      showToast("❌ AI generation failed.", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleImport() {
    const token = localStorage.getItem("token");
    if (!token) return showToast("Please log in.", "error");

    let snippets = [];
    try {
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        snippets = JSON.parse(await file.text());
      } else if (bulkText.trim()) {
        snippets = JSON.parse(bulkText.trim());
      } else {
        return showToast("Provide a file or paste JSON.", "error");
      }
    } catch {
      return showToast("❌ Invalid JSON format.", "error");
    }

    if (!Array.isArray(snippets)) return showToast("❌ JSON must be an array.", "error");

    setBulkBusy(true);
    showToast("🚀 Importing...", "info");

    const results = await Promise.all(
      snippets.map((s) =>
        snippetService
          .addSnippet({
            title: s.title || "Untitled",
            language: s.language || "JavaScript",
            code: s.code || "",
            explanation: s.explanation || "",
            is_public: s.is_public ?? true,
            difficulty: s.difficulty || "beginner",
            category: s.category || "snippet",
            tags: Array.isArray(s.tags) ? s.tags : [],
          })
          .then(() => true)
          .catch(() => false)
      )
    );

    const saved = results.filter(Boolean).length;
    localStorage.setItem("snippetsChanged", "true");
    showToast(`✅ ${saved} saved, ${results.length - saved} failed.`);
    setBulkBusy(false);
    if (saved > 0) setTimeout(() => navigate("/dashboard"), 2000);
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-8">
      <Header title="Add to Library" />

      <div role="tablist" aria-label="Add snippet method" className="mb-8 flex gap-2 border-b border-border">
        {[
          ["manual", "Manual Entry"],
          ["ai-magic", "AI Generate"],
          ["bulk", "Bulk Import"],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-[18px] py-2.5 text-sm font-medium ${
              tab === key ? "border-primary text-primary" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "manual" && (
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5">
          <input
            type="text"
            placeholder="Snippet Title"
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />

          <div className="grid grid-cols-2 gap-3">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass}>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
              {DIFFICULTIES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div>
            <input
              type="text"
              placeholder="Add tags (press Enter or comma)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className={inputClass}
            />
            <div className="mt-1.5 flex min-h-[20px] flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(i)}
                  aria-label={`Remove tag ${tag}`}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary-glow bg-primary-subtle px-2.5 py-[3px] text-xs font-semibold text-primary hover:opacity-70"
                >
                  {tag} <span aria-hidden="true">&times;</span>
                </button>
              ))}
            </div>
          </div>

          <textarea
            placeholder="// Paste your code here..."
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`${inputClass} min-h-[180px] resize-y font-mono text-[13px]`}
          />
          <textarea
            placeholder="Explanation (optional)"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm text-muted">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-[18px] w-[18px] accent-primary"
              />
              Make Public
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-gradient-to-br from-primary to-primary-dim px-7 py-3 text-[15px] font-semibold text-white shadow-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Create Snippet"}
            </button>
          </div>
        </form>
      )}

      {tab === "ai-magic" && (
        <div className="flex flex-col gap-3.5">
          <input
            type="text"
            placeholder="e.g. Binary Search, Debounce function, Merge Sort..."
            value={aiTopic}
            onChange={(e) => setAiTopic(e.target.value)}
            className={inputClass}
          />
          <p className="-mt-1.5 text-xs text-muted">
            💡 Describe what you want — AI will generate the full snippet for you.
          </p>

          <select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)} className={inputClass}>
            {AI_LANGUAGES.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateAi}
            disabled={aiBusy}
            className="rounded-md bg-gradient-to-br from-primary to-primary-dim px-7 py-3 text-[15px] font-semibold text-white shadow-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aiBusy ? "✨ Generating..." : "✨ Generate Snippet"}
          </button>
        </div>
      )}

      {tab === "bulk" && (
        <div className="flex flex-col gap-3.5">
          <input ref={fileInputRef} type="file" accept=".json" className="text-sm text-text" />
          <textarea
            placeholder='[{"title":"...","language":"...","code":"...","tags":["loop","array"]}]'
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className={`${inputClass} min-h-[160px] resize-y font-mono text-[13px]`}
          />
          <button
            onClick={handleImport}
            disabled={bulkBusy}
            className="rounded-md bg-gradient-to-br from-primary to-primary-dim px-7 py-3 text-[15px] font-semibold text-white shadow-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📥 Import Snippets
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
