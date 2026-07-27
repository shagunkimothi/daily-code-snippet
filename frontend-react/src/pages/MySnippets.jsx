import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import SearchBar from "../components/SearchBar/SearchBar";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import Toast from "../components/Toast/Toast";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import * as snippetService from "../services/snippetService";
import { colorForLanguage } from "../utils/langColors";

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

  const { toast, showToast } = useToast();

  const [pendingDelete, setPendingDelete] = useState(null); // { id, title }

  useEffect(() => {
    if (!pendingDelete) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setPendingDelete(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDelete]);

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
      showToast(nextState ? "🌐 Made public — now feeds the daily snippet!" : "🔒 Made private — removed from daily feed");
    } catch {
      showToast("❌ Could not update visibility", "error");
    }
  }

  function copyCode(snippet) {
    navigator.clipboard.writeText(snippet.code || "");
    showToast("📋 Code copied!");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await snippetService.deleteSnippet(pendingDelete.id);
      setList((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      localStorage.setItem("snippetsChanged", "true");
      showToast("🗑️ Snippet deleted");
    } catch {
      showToast("❌ Could not delete", "error");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 px-10 py-12">
        <div className="mx-auto max-w-[880px]">
          <Header
            title="📁 My Snippets"
            actions={
              <Link
                to="/add"
                className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
              >
                ＋ Add Snippet
              </Link>
            }
          />

          <div className="mb-4 rounded-md border border-primary-glow bg-primary-subtle px-4 py-2.5 text-[0.8rem] leading-relaxed text-text-secondary">
            🌐 <strong className="text-primary">Public snippets</strong> are visible to everyone and feed the{" "}
            <strong className="text-primary">Daily Snippet</strong> rotation on the home page. 🔒{" "}
            <strong className="text-text">Private snippets</strong> are only visible to you. Toggle visibility with
            the button on each card.
          </div>

          <SearchBar value={filterText} onChange={setFilterText} placeholder="🔍 Filter snippets...">
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)} className="flex-1">
              <option value="">All Languages</option>
              {["Python", "JavaScript", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select value={filterDiff} onChange={(e) => setFilterDiff(e.target.value)} className="flex-1">
              <option value="">All Levels</option>
              <option value="beginner">🟢 Beginner</option>
              <option value="intermediate">🟡 Intermediate</option>
              <option value="advanced">🔴 Advanced</option>
            </select>
            <select value={filterVis} onChange={(e) => setFilterVis(e.target.value)} className="flex-1">
              <option value="">All</option>
              <option value="public">🌐 Public only</option>
              <option value="private">🔒 Private only</option>
            </select>
          </SearchBar>

          <p className="mb-3 mt-3 min-h-[18px] font-mono text-[0.78rem] text-muted">
            {!loading && !error &&
              `Showing ${filtered.length} of ${list.length} snippets · ${publicCount} public (feeding daily)`}
          </p>

          {loading && <Loader label="Loading your snippets..." />}
          {!loading && error && <p className="text-muted">Failed to load snippets.</p>}

          {!loading && !error && filtered.length === 0 && (
            <div className="py-12 text-center text-muted">
              <div className="mb-3 text-4xl">📭</div>
              <h3 className="mb-2 text-lg font-semibold text-text">No snippets found</h3>
              <p className="mb-4 text-sm">Try different filters or add a new snippet.</p>
              <Link
                to="/add"
                className="inline-flex items-center gap-[7px] rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
              >
                ＋ Add Snippet
              </Link>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((s) => {
              const color = colorForLanguage(s.language);
              return (
                <SnippetCard
                  key={s.id}
                  snippet={s}
                  collapsible
                  defaultExpanded={false}
                  actions={
                    <>
                      {s.is_public && (
                        <span className="whitespace-nowrap rounded-sm border border-primary-glow bg-[rgba(0,212,255,0.08)] px-2 py-px font-mono text-[0.62rem] font-bold tracking-[0.06em] text-primary">
                          ◆ DAILY FEED
                        </span>
                      )}
                      <button
                        title={s.is_public ? "Click to make Private (removes from daily)" : "Click to make Public (adds to daily)"}
                        onClick={() => toggleVisibility(s.id, s.is_public)}
                        className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-sm border px-3 py-1 font-mono text-[0.72rem] font-bold ${
                          s.is_public
                            ? "border-[rgba(0,229,160,0.3)] bg-green-subtle text-green"
                            : "border-border bg-white/[0.04] text-muted"
                        }`}
                      >
                        <span
                          className="h-[7px] w-[7px] rounded-full"
                          style={{ background: "currentColor", boxShadow: "0 0 6px currentColor" }}
                        />
                        {s.is_public ? "🌐 Public" : "🔒 Private"}
                      </button>
                      <button
                        onClick={() => copyCode(s)}
                        className="whitespace-nowrap rounded-sm border border-border-card bg-card px-3 py-1 text-xs font-semibold text-text-secondary hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
                      >
                        📋 Copy
                      </button>
                      <button
                        onClick={() => setPendingDelete({ id: s.id, title: s.title })}
                        aria-label={`Delete "${s.title}"`}
                        className="whitespace-nowrap rounded-sm border border-[rgba(255,68,102,0.15)] px-3 py-1 text-xs font-semibold text-red hover:border-red hover:bg-red-subtle"
                      >
                        🗑️
                      </button>
                    </>
                  }
                />
              );
            })}
        </div>
      </div>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75"
          onClick={() => setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-[90%] max-w-[460px] rounded-xl border border-border-card bg-card p-7 shadow-lg"
          >
            <h3 id="delete-modal-title" className="mb-2 font-mono text-base font-bold text-text">
              🗑️ Delete Snippet?
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-text-secondary">
              Delete "{pendingDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setPendingDelete(null)}
                className="rounded-sm border border-border-card bg-card px-3 py-1.5 text-sm font-semibold text-text-secondary hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-sm border border-[rgba(255,68,102,0.15)] px-3 py-1.5 text-sm font-semibold text-red hover:border-red hover:bg-red-subtle"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  );
}
