import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Upload } from "lucide-react";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Toast from "../components/Toast/Toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Select from "../components/ui/Select";
import Switch from "../components/ui/Switch";
import TagChip from "../components/TagChip/TagChip";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import * as snippetService from "../services/snippetService";

const LANGUAGES = ["JavaScript", "Python", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"];
const LANGUAGE_OPTIONS = LANGUAGES.map((l) => ({ value: l, label: l }));
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
const AI_LANGUAGE_OPTIONS = AI_LANGUAGES.map(([value, label]) => ({ value, label }));
const DIFFICULTIES = [
  ["beginner", "🟢 Beginner"],
  ["intermediate", "🟡 Intermediate"],
  ["advanced", "🔴 Advanced"],
];
const DIFFICULTY_OPTIONS = DIFFICULTIES.map(([value, label]) => ({ value, label }));
const CATEGORIES = ["snippet", "algorithm", "data-structure", "utility", "pattern", "other"];
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }));

const TAB_LABELS = ["Manual Entry", "AI Generate", "Bulk Import"];

function matchOption(options, value, fallback) {
  const hit = options.find((o) => o.toLowerCase() === (value || "").toLowerCase());
  return hit || fallback;
}

// 1:1 port of addnewsnippet.html + addnewsnippets.js: three tabs (Manual /
// AI Generate / Bulk Import) sharing the same underlying manual-form state,
// since AI Generate fills the manual fields and switches tabs, exactly
// like the original. Tabs are now Headless UI's TabGroup (index-based)
// instead of a hand-rolled role="tablist" — same three panels, real
// keyboard nav (arrow keys) for free.
export default function AddSnippet() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [tabIndex, setTabIndex] = useState(0);

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
  const [bulkFileName, setBulkFileName] = useState("");
  const fileInputRef = useRef(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { toast, showToast, dismissToast } = useToast();

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
      showToast("Snippet saved!");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      showToast(err.message || "Could not save snippet.", "error");
      setSubmitting(false);
    }
  }

  async function handleGenerateAi() {
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

      setTabIndex(0);
      showToast(`${aiLanguage} snippet ready!`);
    } catch {
      showToast("AI generation failed.", "error");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleImport() {
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
      return showToast("Invalid JSON format.", "error");
    }

    if (!Array.isArray(snippets)) return showToast("JSON must be an array.", "error");

    setBulkBusy(true);
    showToast("Importing...", "info");

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
    showToast(`${saved} saved, ${results.length - saved} failed.`);
    setBulkBusy(false);
    if (saved > 0) setTimeout(() => navigate("/dashboard"), 2000);
  }

  return (
    <AppShell title="Add Snippet" maxWidth="720px">
      <Header title="Add to Library" />

      <Tabs tabs={TAB_LABELS} selectedIndex={tabIndex} onChange={setTabIndex}>
        <TabPanel>
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3.5">
            <Input
              type="text"
              placeholder="Snippet Title"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} />
              <Select value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} />
            </div>

            <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />

            <div>
              <Input
                type="text"
                placeholder="Add tags (press Enter or comma)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <div className="mt-1.5 flex min-h-[20px] flex-wrap gap-1.5">
                {tags.map((tag, i) => (
                  <TagChip key={tag} label={tag} variant="removable" onRemove={() => removeTag(i)} />
                ))}
              </div>
            </div>

            <Textarea
              placeholder="// Paste your code here..."
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[180px] resize-y font-mono text-[13px]"
            />
            <Textarea
              placeholder="Explanation (optional)"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="min-h-[80px] resize-y"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Switch checked={isPublic} onChange={setIsPublic} label="Make Public" />
              <Button type="submit" variant="primary" size="lg" loading={submitting}>
                {submitting ? "Saving..." : "Create Snippet"}
              </Button>
            </div>
          </form>
        </TabPanel>

        <TabPanel>
          <div className="flex flex-col gap-3.5">
            <Input
              type="text"
              placeholder="e.g. Binary Search, Debounce function, Merge Sort..."
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
            />
            <p className="-mt-1.5 text-xs text-muted">Describe what you want — AI will generate the full snippet for you.</p>

            <Select value={aiLanguage} onChange={setAiLanguage} options={AI_LANGUAGE_OPTIONS} />

            <Button variant="primary" size="lg" onClick={handleGenerateAi} loading={aiBusy} className="gap-2">
              <Sparkles size={16} aria-hidden="true" />
              {aiBusy ? "Generating..." : "Generate Snippet"}
            </Button>
          </div>
        </TabPanel>

        <TabPanel>
          <div className="flex flex-col gap-3.5">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border-card bg-input-bg px-4 py-6 text-center hover:border-primary">
              <Upload size={20} className="text-muted" aria-hidden="true" />
              <span className="text-sm text-text-secondary">
                {bulkFileName || "Choose a JSON file, or paste JSON below"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => setBulkFileName(e.target.files?.[0]?.name || "")}
              />
            </label>
            <Textarea
              placeholder='[{"title":"...","language":"...","code":"...","tags":["loop","array"]}]'
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="min-h-[160px] resize-y font-mono text-[13px]"
            />
            <Button variant="primary" size="lg" onClick={handleImport} loading={bulkBusy} className="gap-2">
              <Upload size={16} aria-hidden="true" />
              Import Snippets
            </Button>
          </div>
        </TabPanel>
      </Tabs>

      <Toast toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
