import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquareText, Sparkles, Upload } from "lucide-react";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Toast from "../components/Toast/Toast";
import Button from "../components/ui/Button";
import SnippetCard from "../components/SnippetCard/SnippetCard";
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
const BULK_FORMAT_OPTIONS = [
  { value: "json", label: "JSON" },
  { value: "csv", label: "CSV" },
  { value: "txt", label: "TXT" },
];
const BULK_PLACEHOLDERS = {
  json: '[{"title":"Binary Search","language":"C++","code":"int binarySearch(...) { ... }","explanation":"Searches a sorted array efficiently.","tags":["binary-search","array"]}]',
  csv: 'title,language,code,explanation,tags\nBinary Search,C++,"int binarySearch(...) { ... }","Searches a sorted array","binary-search|array"',
  txt: "TITLE: Binary Search\nLANGUAGE: C++\nTAGS: binary-search, array\nEXPLANATION:\nSearches a sorted array efficiently.\n\nCODE:\nint binarySearch(...) {\n    ...\n}",
};

const TAB_LABELS = ["Manual Entry", "AI Generate", "Ask Library", "Bulk Import"];

function validateImportedSnippet(snippet, source) {
  if (!snippet || typeof snippet !== "object" || Array.isArray(snippet)) {
    return { error: `${source}: expected a snippet object.` };
  }

  const missing = ["title", "language", "code"].filter(
    (field) => typeof snippet[field] !== "string" || !snippet[field].trim()
  );
  if (missing.length) {
    return { error: `${source}: missing required ${missing.join(", ")}.` };
  }

  return {
    snippet: {
      title: snippet.title.trim(),
      language: snippet.language.trim(),
      code: snippet.code.trim(),
      explanation: typeof snippet.explanation === "string" ? snippet.explanation.trim() : "",
      is_public: typeof snippet.is_public === "boolean" ? snippet.is_public : true,
      difficulty: typeof snippet.difficulty === "string" && snippet.difficulty.trim() ? snippet.difficulty.trim() : "beginner",
      category: typeof snippet.category === "string" && snippet.category.trim() ? snippet.category.trim() : "snippet",
      tags: Array.isArray(snippet.tags)
        ? snippet.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
        : [],
    },
  };
}

function parseCsvRecords(text) {
  const records = [];
  const errors = [];
  let fields = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let recordLine = 1;

  function finishRecord() {
    fields.push(field);
    if (fields.some((value) => value.trim())) records.push({ fields, line: recordLine });
    fields = [];
    field = "";
    recordLine = line + 1;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
        if (char === "\n") line += 1;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === "," ) {
      fields.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      finishRecord();
      line += 1;
      recordLine = line;
    } else {
      if (char === '"') errors.push(`CSV line ${line}: unexpected quote in an unquoted field.`);
      field += char;
    }
  }

  if (quoted) errors.push(`CSV line ${recordLine}: unterminated quoted field.`);
  if (field.length || fields.length) finishRecord();
  return { records, errors };
}

function parseBulkImport(text, format) {
  if (!text.trim()) return { snippets: [], errors: [] };

  if (format === "json") {
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      return { snippets: [], errors: [`Invalid JSON: ${error.message}`] };
    }
    if (!Array.isArray(value)) return { snippets: [], errors: ["JSON must contain an array of snippets."] };
    const snippets = [];
    const errors = [];
    value.forEach((item, index) => {
      const result = validateImportedSnippet(item, `Snippet ${index + 1}`);
      if (result.error) errors.push(result.error);
      else snippets.push(result.snippet);
    });
    return { snippets, errors };
  }

  if (format === "csv") {
    const { records, errors } = parseCsvRecords(text);
    if (!records.length) return { snippets: [], errors: [...errors, "CSV must include a header row and at least one snippet row."] };
    const headers = records[0].fields.map((header) => header.trim().replace(/^\uFEFF/, "").toLowerCase());
    const missingHeaders = ["title", "language", "code"].filter((header) => !headers.includes(header));
    if (missingHeaders.length) {
      return { snippets: [], errors: [...errors, `CSV is missing required columns: ${missingHeaders.join(", ")}.`] };
    }

    const snippets = [];
    records.slice(1).forEach(({ fields, line }) => {
      if (fields.every((value) => !value.trim())) return;
      if (fields.length !== headers.length) {
        errors.push(`CSV line ${line}: expected ${headers.length} columns, found ${fields.length}.`);
        return;
      }
      const row = Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]));
      const result = validateImportedSnippet({
        ...row,
        tags: (row.tags || "").split("|"),
      }, `CSV line ${line}`);
      if (result.error) errors.push(result.error);
      else snippets.push(result.snippet);
    });
    if (records.length === 1) errors.push("CSV must include at least one snippet row.");
    return { snippets, errors };
  }

  if (format === "txt") {
    const blocks = text.split(/^\s*---\s*$/m).map((block) => block.trim()).filter(Boolean);
    const snippets = [];
    const errors = [];

    blocks.forEach((block, index) => {
      const source = `TXT snippet ${index + 1}`;
      const lines = block.split(/\r?\n/);
      const data = { tags: [] };
      let section = "";
      let sawTitle = false;
      let sawLanguage = false;
      let sawTags = false;
      let sawExplanation = false;
      let sawCode = false;
      const explanation = [];
      const code = [];

      lines.forEach((line) => {
        if (sawCode) {
          code.push(line);
          return;
        }
        const header = line.match(/^\s*(TITLE|LANGUAGE|TAGS|EXPLANATION|CODE)\s*:\s*(.*)$/i);
        if (!header) {
          if (section === "explanation") explanation.push(line);
          else if (line.trim()) errors.push(`${source}: unexpected content before the CODE: section.`);
          return;
        }
        const key = header[1].toLowerCase();
        if (key === "title") {
          data.title = header[2].trim();
          sawTitle = true;
          section = "title";
        } else if (key === "language") {
          data.language = header[2].trim();
          sawLanguage = true;
          section = "language";
        } else if (key === "tags") {
          data.tags = header[2].split(",").map((tag) => tag.trim()).filter(Boolean);
          sawTags = true;
          section = "tags";
        } else if (key === "explanation") {
          data.explanation = header[2].trim();
          sawExplanation = true;
          section = "explanation";
        } else {
          data.code = header[2];
          sawCode = true;
          section = "code";
        }
      });

      if (!sawTitle) errors.push(`${source}: missing TITLE: section.`);
      if (!sawLanguage) errors.push(`${source}: missing LANGUAGE: section.`);
      if (!sawTags) data.tags = [];
      if (!sawExplanation) errors.push(`${source}: missing EXPLANATION: section.`);
      if (!sawCode) errors.push(`${source}: missing CODE: section.`);
      data.explanation = [data.explanation, ...explanation].filter(Boolean).join("\n").trim();
      data.code = code.join("\n").trim();
      if (sawTitle && sawLanguage && sawCode) {
        const result = validateImportedSnippet(data, source);
        if (result.error) errors.push(result.error);
        else snippets.push(result.snippet);
      }
    });

    return { snippets, errors };
  }

  return { snippets: [], errors: [`Unsupported import format: ${format}.`] };
}

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
  const [ragQuestion, setRagQuestion] = useState("");
  const [ragBusy, setRagBusy] = useState(false);
  const [ragAnswer, setRagAnswer] = useState(null);
  const [ragError, setRagError] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkFormat, setBulkFormat] = useState("json");
  const [bulkFileError, setBulkFileError] = useState("");
  const fileInputRef = useRef(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { toast, showToast, dismissToast } = useToast();
  const bulkParse = parseBulkImport(bulkText, bulkFormat);
  const bulkErrors = bulkFileError ? [bulkFileError, ...bulkParse.errors] : bulkParse.errors;

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

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];
    setBulkFileName(file?.name || "");
    setBulkFileError("");
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["json", "csv", "txt"].includes(extension)) {
      setBulkText("");
      setBulkFileError("Choose a .json, .csv, or .txt file.");
      return;
    }

    setBulkFormat(extension);
    try {
      setBulkText(await file.text());
    } catch (error) {
      setBulkText("");
      setBulkFileError(`Could not read ${file.name}: ${error.message}`);
    }
  }

  async function handleImport() {
    if (!token) return showToast("Please log in.", "error");
    if (!bulkText.trim()) {
      return showToast("Choose a file or paste snippet content first.", "error");
    }
    if (bulkErrors.length) return showToast("Fix the import format errors before submitting.", "error");
    if (!bulkParse.snippets.length) return showToast("No valid snippets to import.", "error");

    setBulkBusy(true);
    showToast("Importing...", "info");

    const results = await Promise.all(
      bulkParse.snippets.map((snippet) =>
        snippetService
          .addSnippet(snippet)
          .then(() => true)
          .catch(() => false)
      )
    );

    const saved = results.filter(Boolean).length;
    if (saved) localStorage.setItem("snippetsChanged", "true");
    showToast(`${saved} saved, ${results.length - saved} failed.`);
    setBulkBusy(false);
    if (saved > 0) setTimeout(() => navigate("/dashboard"), 2000);
  }

  async function handleAskLibrary() {
    if (!token) return showToast("Please log in.", "error");
    if (!ragQuestion.trim()) return showToast("Please enter a question.", "error");
    setRagBusy(true);
    setRagAnswer(null);
    setRagError("");
    try {
      setRagAnswer(await snippetService.generateRagAnswer({ query: ragQuestion.trim() }));
    } catch (err) {
      setRagError(err.message || "Grounded AI answer failed. Please try again.");
    } finally {
      setRagBusy(false);
    }
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
            <Textarea
              placeholder="Ask about a concept in your Daily Code library..."
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              className="min-h-[100px] resize-y"
            />
            <p className="-mt-1.5 text-xs text-muted">Answers are grounded only in snippets you are allowed to access.</p>
            <Button variant="primary" size="lg" onClick={handleAskLibrary} loading={ragBusy} className="gap-2">
              <MessageSquareText size={16} aria-hidden="true" />
              {ragBusy ? "Searching Daily Code..." : "Ask Daily Code"}
            </Button>
            {ragError && (
              <div role="alert" className="rounded-md border border-border-card bg-card p-4 text-sm text-text-secondary">
                <p className="font-semibold text-text">Could not generate an answer</p>
                <p className="mt-1">{ragError}</p>
              </div>
            )}
            {ragAnswer && (
              <div className="rounded-md border border-border-card bg-card p-4 text-sm leading-relaxed text-text-secondary">
                <p className="mb-2 font-semibold text-text">
                  {ragAnswer.grounded ? "Grounded in Daily Code snippets" : "No grounded context found"}
                </p>
                <p className="whitespace-pre-wrap">{ragAnswer.answer}</p>
                {ragAnswer.snippets?.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-text">Retrieved snippets used as context</p>
                    {ragAnswer.snippets.map((snippet) => (
                      <SnippetCard
                        key={snippet.id}
                        snippet={snippet}
                        similarityScore={snippet.similarity_score}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel>
          <div className="flex flex-col gap-3.5">
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-border-card bg-input-bg px-4 py-6 text-center hover:border-primary">
              <Upload size={20} className="text-muted" aria-hidden="true" />
              <span className="text-sm text-text-secondary">
                {bulkFileName || "Choose a JSON, CSV, or TXT file, or paste content below"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.txt"
                className="hidden"
                onChange={handleBulkFileChange}
              />
            </label>
            <details className="rounded-md border border-border-card bg-card px-4 py-3 text-sm text-text-secondary">
              <summary className="cursor-pointer font-semibold text-text">Supported formats and examples</summary>
              <div className="mt-3 flex flex-col gap-3">
                <div>
                  <p className="font-semibold text-text">JSON — an array of snippet objects</p>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-input-bg p-3 text-xs">{`[
  {
    "title": "Binary Search",
    "language": "C++",
    "code": "int binarySearch(...) { ... }",
    "explanation": "Searches a sorted array efficiently.",
    "tags": ["binary-search", "array"]
  }
]`}</pre>
                </div>
                <div>
                  <p className="font-semibold text-text">CSV — include a header; quote fields containing commas or line breaks. Separate tags with |.</p>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-input-bg p-3 text-xs">{`title,language,code,explanation,tags
Binary Search,C++,"int binarySearch(...) { ... }","Searches a sorted array","binary-search|array"`}</pre>
                </div>
                <div>
                  <p className="font-semibold text-text">TXT — use the labeled sections and --- between snippets.</p>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-input-bg p-3 text-xs">{`TITLE: Binary Search
LANGUAGE: C++
TAGS: binary-search, array
EXPLANATION:
Searches a sorted array efficiently.

CODE:
int binarySearch(...) {
    ...
}`}</pre>
                </div>
              </div>
            </details>
            <Select
              label="Paste format"
              value={bulkFormat}
              onChange={setBulkFormat}
              options={BULK_FORMAT_OPTIONS}
              className="max-w-xs"
            />
            <Textarea
              aria-label="Snippet import content"
              placeholder={BULK_PLACEHOLDERS[bulkFormat]}
              value={bulkText}
              onChange={(e) => {
                setBulkText(e.target.value);
                setBulkFileError("");
              }}
              className="min-h-[160px] resize-y font-mono text-[13px]"
            />
            <div aria-live="polite" className="text-sm">
              {bulkErrors.length ? (
                <div role="alert" className="rounded-md border border-red/30 bg-red/5 px-3 py-2 text-red">
                  <p className="font-semibold">Fix these import issues:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {bulkErrors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="text-muted">
                  {bulkParse.snippets.length} snippet{bulkParse.snippets.length === 1 ? "" : "s"} ready to import.
                  {bulkParse.snippets.length > 0 && (
                    <span> Preview: {bulkParse.snippets.slice(0, 3).map((snippet) => snippet.title).join(", ")}
                      {bulkParse.snippets.length > 3 ? ", …" : ""}
                    </span>
                  )}
                </p>
              )}
            </div>
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
