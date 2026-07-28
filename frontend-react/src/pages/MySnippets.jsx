import { useEffect, useMemo, useState } from "react";
import { Copy, Globe, Inbox, Lock, Plus, Trash2 } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import SearchBar from "../components/SearchBar/SearchBar";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import Toast from "../components/Toast/Toast";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Dialog from "../components/ui/Dialog";
import EmptyState from "../components/ui/EmptyState";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import * as snippetService from "../services/snippetService";
import { colorForLanguage } from "../utils/langColors";

const LANGUAGE_OPTIONS = [
  { value: "", label: "All Languages" },
  ...["Python", "JavaScript", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"].map((l) => ({
    value: l,
    label: l,
  })),
];
const DIFFICULTY_OPTIONS = [
  { value: "", label: "All Levels" },
  { value: "beginner", label: "🟢 Beginner" },
  { value: "intermediate", label: "🟡 Intermediate" },
  { value: "advanced", label: "🔴 Advanced" },
];
const VISIBILITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "public", label: "Public only" },
  { value: "private", label: "Private only" },
];

// 1:1 port of Mysnippets.html's inline script: client-side filtering over
// GET /snippets/mine, per-card visibility toggle (PATCH .../visibility),
// delete-with-confirm modal, copy-to-clipboard, and a toast for feedback.
export default function MySnippets() {
  const { data: snippets, loading, error, refetch } = useFetch(snippetService.getMySnippets, []);
  const [list, setList] = useState([]);

  useEffect(() => {
    setList(snippets || []);
  }, [snippets]);

  const [filterText, setFilterText] = useState("");
  const [filterLang, setFilterLang] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [filterVis, setFilterVis] = useState("");

  const { toast, showToast, dismissToast } = useToast();

  const [pendingDelete, setPendingDelete] = useState(null); // { id, title }

  const filtered = useMemo(() => {
    const q = filterText.toLowerCase();
    const lng = filterLang.toLowerCase();
    return list.filter((s) => {
      if (q && !s.title.toLowerCase().includes(q) && !(s.code || "").toLowerCase().includes(q)) return false;
      if (lng && s.language.toLowerCase() !== lng) return false;
      if (filterDiff && s.difficulty !== filterDiff) return false;
      if (filterVis === "public" && !s.is_public) return false;
      if (filterVis === "private" && s.is_public) return false;
      return true;
    });
  }, [list, filterText, filterLang, filterDiff, filterVis]);

  const publicCount = list.filter((s) => s.is_public).length;

  async function toggleVisibility(id, currentlyPublic) {
    const nextState = !currentlyPublic;
    try {
      await snippetService.updateSnippetVisibility(id, nextState);
      setList((prev) => prev.map((s) => (s.id === id ? { ...s, is_public: nextState } : s)));
      localStorage.setItem("snippetsChanged", "true");
      showToast(nextState ? "Made public — now feeds the daily snippet!" : "Made private — removed from daily feed");
    } catch {
      showToast("Could not update visibility", "error");
    }
  }

  function copyCode(snippet) {
    navigator.clipboard.writeText(snippet.code || "");
    showToast("Code copied!");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await snippetService.deleteSnippet(pendingDelete.id);
      setList((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      localStorage.setItem("snippetsChanged", "true");
      showToast("Snippet deleted");
    } catch {
      showToast("Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <AppShell title="My Snippets" maxWidth="880px">
      <Header
        title="My Snippets"
        actions={
          <Button as="link" to="/add" variant="primary" className="gap-1.5">
            <Plus size={15} aria-hidden="true" />
            Add Snippet
          </Button>
        }
      />

      <div className="mb-4 rounded-md border border-primary-glow bg-primary-subtle px-4 py-2.5 text-[0.8rem] leading-relaxed text-text-secondary">
        <strong className="text-primary">Public snippets</strong> are visible to everyone and feed the{" "}
        <strong className="text-primary">Daily Snippet</strong> rotation on the home page.{" "}
        <strong className="text-text">Private snippets</strong> are only visible to you. Toggle visibility with the
        button on each card.
      </div>

      <SearchBar value={filterText} onChange={setFilterText} placeholder="Filter snippets...">
        <Select value={filterLang} onChange={setFilterLang} options={LANGUAGE_OPTIONS} placeholder="All Languages" className="flex-1" />
        <Select value={filterDiff} onChange={setFilterDiff} options={DIFFICULTY_OPTIONS} placeholder="All Levels" className="flex-1" />
        <Select value={filterVis} onChange={setFilterVis} options={VISIBILITY_OPTIONS} placeholder="All" className="flex-1" />
      </SearchBar>

      <p className="mb-3 mt-3 min-h-[18px] font-mono text-[0.78rem] text-muted">
        {!loading && !error &&
          `Showing ${filtered.length} of ${list.length} snippets · ${publicCount} public (feeding daily)`}
      </p>

      {loading && <Loader label="Loading your snippets..." />}
      {!loading && error && (
        <div className="py-8 text-center">
          <p className="mb-3 text-muted">Failed to load snippets.</p>
          <Button variant="secondary" onClick={refetch}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && list.length === 0 && (
        <EmptyState
          className="my-4"
          icon={Inbox}
          title="Build your own knowledge library"
          description="Every snippet you save becomes part of your personal collection, one at a time."
          action={
            <Button as="link" to="/add" variant="primary" className="mt-2 gap-1.5">
              <Plus size={15} aria-hidden="true" />
              Create your first snippet
            </Button>
          }
        />
      )}

      {!loading && !error && filtered.length === 0 && list.length > 0 && (
        <EmptyState className="my-4" icon={Inbox} title="No matches" description="Try different filters." />
      )}

      {!loading &&
        !error &&
        filtered.map((s) => (
          <SnippetCard
            key={s.id}
            snippet={s}
            collapsible
            defaultExpanded={false}
            actions={
              <>
                {s.is_public && (
                  <span className="whitespace-nowrap rounded-sm border border-primary-glow bg-primary-subtle px-2 py-px font-mono text-[0.62rem] font-bold tracking-[0.06em] text-primary">
                    ◆ DAILY FEED
                  </span>
                )}
                <button
                  title={s.is_public ? "Click to make Private (removes from daily)" : "Click to make Public (adds to daily)"}
                  onClick={() => toggleVisibility(s.id, s.is_public)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border px-3 py-1 font-mono text-[0.72rem] font-bold ${
                    s.is_public
                      ? "border-green-subtle bg-green-subtle text-green"
                      : "border-border bg-card-elevated text-muted"
                  }`}
                >
                  {s.is_public ? <Globe size={12} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
                  {s.is_public ? "Public" : "Private"}
                </button>
                <button
                  onClick={() => copyCode(s)}
                  aria-label="Copy code"
                  className="whitespace-nowrap rounded-sm border border-border-card bg-card p-1.5 text-text-secondary hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => setPendingDelete({ id: s.id, title: s.title })}
                  aria-label={`Delete "${s.title}"`}
                  className="whitespace-nowrap rounded-sm border border-red-subtle p-1.5 text-red hover:border-red hover:bg-red-subtle"
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </>
            }
          />
        ))}

      <Dialog open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} title="Delete Snippet?">
        <p className="mb-5 text-sm leading-relaxed text-text-secondary">
          Delete &quot;{pendingDelete?.title}&quot;? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button variant="secondary" onClick={() => setPendingDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Dialog>

      <Toast toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
