import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import Footer from "../components/Footer/Footer";
import SearchBar from "../components/SearchBar/SearchBar";
import TagChip from "../components/TagChip/TagChip";
import Pagination from "../components/Pagination/Pagination";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { useDebounce } from "../hooks/useDebounce";
import * as snippetService from "../services/snippetService";

const LANGUAGES = ["Python", "JavaScript", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"];
const DIFFICULTIES = [
  { value: "beginner", label: "🟢 Beginner" },
  { value: "intermediate", label: "🟡 Intermediate" },
  { value: "advanced", label: "🔴 Advanced" },
];
const PER_PAGE = 12;

function GalleryFavButton({ id, favored, onToggle }) {
  return (
    <button
      onClick={() => onToggle(id, favored)}
      aria-label={favored ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favored}
      className={`ml-auto text-lg leading-none transition-transform hover:scale-125 hover:text-amber ${
        favored ? "text-amber" : "text-muted"
      }`}
    >
      {favored ? "⭐" : "☆"}
    </button>
  );
}

// 1:1 port of index.html + script.js. Two "sections" toggle visibility
// exactly like the original (dailySection vs galleryList): `viewMode` is
// its own piece of state (not purely derived from the filters) because the
// original's "🔄 New Random" button force-switches back to the daily/random
// view via showDailySection() WITHOUT clearing the filter inputs — so the
// filters can still be sitting there, filled in, while the daily card shows.
export default function Home() {
  const { token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const isFiltering = Boolean(debouncedSearch.trim() || language || difficulty || activeTag);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "gallery"

  const [tags, setTags] = useState([]);

  const [dailySnippet, setDailySnippet] = useState(null);
  const [snippetLoading, setSnippetLoading] = useState(true);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const [galleryResults, setGalleryResults] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [galleryFavOverrides, setGalleryFavOverrides] = useState({});

  const [copyLabel, setCopyLabel] = useState("📋 Copy");
  const [countdown, setCountdown] = useState("–");

  // Load tags once for the filter chip row.
  useEffect(() => {
    snippetService.getTags().then(setTags).catch(() => {});
  }, []);

  // Countdown to the next auto-daily snippet. The rotation flips at UTC
  // midnight (not the visitor's local midnight), so this counts down to
  // `next_rotation_at` from the /snippets/daily response rather than
  // computing local midnight client-side — otherwise a visitor ahead of or
  // behind UTC would see the countdown hit zero while the snippet on screen
  // stays the same until the real (UTC) rollover.
  useEffect(() => {
    if (isRandomMode) return undefined;
    function targetMs() {
      if (dailySnippet?.next_rotation_at) {
        return new Date(dailySnippet.next_rotation_at).getTime();
      }
      // Daily snippet hasn't loaded yet — fall back to computed UTC midnight.
      const now = new Date();
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    }
    function tick() {
      const diff = Math.max(0, targetMs() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}h ${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRandomMode, dailySnippet?.next_rotation_at]);

  async function loadSnippet(fetcher, random) {
    setIsRandomMode(random);
    setSnippetLoading(true);
    try {
      const data = await fetcher();
      setDailySnippet(data);
      if (token) {
        try {
          const favs = await snippetService.getFavorites();
          setIsFavorited(favs.some((f) => f.id === data.id));
        } catch {
          /* ignore */
        }
      }
    } catch {
      setDailySnippet(null);
    } finally {
      setSnippetLoading(false);
    }
  }

  // Initial load: today's snippet.
  useEffect(() => {
    loadSnippet(snippetService.getDailySnippet, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirrors onFilterChange(): reset to page 1 and flip the visible section
  // whenever a filter value settles.
  useEffect(() => {
    setPage(1);
    setViewMode(isFiltering ? "gallery" : "daily");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, language, difficulty, activeTag]);

  // Run the actual search request whenever the gallery view is active.
  useEffect(() => {
    if (viewMode !== "gallery") return undefined;
    let cancelled = false;
    setGalleryLoading(true);
    snippetService
      .searchSnippets({
        page,
        perPage: PER_PAGE,
        q: debouncedSearch.trim(),
        language,
        difficulty,
        tag: activeTag,
      })
      .then((data) => {
        if (cancelled) return;
        setGalleryResults(data.snippets || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        if (!cancelled) setGalleryResults([]);
      })
      .finally(() => {
        if (!cancelled) setGalleryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, page, debouncedSearch, language, difficulty, activeTag]);

  function handleTagClick(tagName) {
    setActiveTag(tagName);
  }

  function handleRandom() {
    setViewMode("daily");
    loadSnippet(snippetService.getRandomSnippet, true);
  }

  function handleBackToDaily() {
    loadSnippet(snippetService.getDailySnippet, false);
  }

  async function handleToggleDailyFavorite() {
    if (!token || !dailySnippet) return;
    try {
      if (isFavorited) await snippetService.removeFavorite(dailySnippet.id);
      else await snippetService.addFavorite(dailySnippet.id);
      setIsFavorited((v) => !v);
      localStorage.setItem("favoritesChanged", "true");
    } catch {
      /* ignore */
    }
  }

  async function handleToggleGalleryFavorite(id, currentlyFav) {
    try {
      if (currentlyFav) await snippetService.removeFavorite(id);
      else await snippetService.addFavorite(id);
      setGalleryFavOverrides((prev) => ({ ...prev, [id]: !currentlyFav }));
      localStorage.setItem("favoritesChanged", "true");
    } catch {
      /* ignore */
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(dailySnippet?.code || "");
    setCopyLabel("✅ Copied");
    setTimeout(() => setCopyLabel("📋 Copy"), 1500);
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex flex-1 justify-center px-10 py-12">
        <div className="w-full max-w-[880px]">
          <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex flex-wrap items-center gap-3.5 font-mono text-2xl font-extrabold tracking-tight text-text">
                Daily Code Snippet
                <span className="animate-pulseGlow rounded-sm border border-primary-glow bg-primary-subtle px-[11px] py-[5px] font-mono text-[0.64rem] font-bold uppercase tracking-[0.1em] text-primary">
                  📅 TODAY
                </span>
              </h2>
              <p className="mt-[5px] font-mono text-[0.8rem] tracking-wide text-muted">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-[7px]">
              <button
                onClick={toggleTheme}
                aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-border-card bg-card text-sm text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
              >
                {theme === "light" ? "☀️" : "🌙"}
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md border border-border-card bg-card px-[1.1rem] py-[0.55rem] text-[0.84rem] font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
              >
                Logout
              </button>
              <button
                onClick={handleRandom}
                className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
              >
                🔄 New Random
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md border border-border-card bg-card px-[1.1rem] py-[0.55rem] text-[0.84rem] font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
              >
                {copyLabel}
              </button>
              <button
                onClick={handleToggleDailyFavorite}
                aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
                aria-pressed={isFavorited}
                className={`rounded-sm bg-transparent px-2 py-1 text-lg leading-none transition-transform hover:scale-125 hover:text-amber ${
                  isFavorited ? "text-amber" : "text-muted"
                }`}
              >
                {isFavorited ? "⭐" : "☆"}
              </button>
            </div>
          </header>

          <div className="mb-4 flex flex-col gap-2.5">
            <SearchBar value={search} onChange={setSearch} placeholder="🔍 Search title, code, explanation...">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="flex-1">
                <option value="">All Languages</option>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="flex-1">
                <option value="">All Levels</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </SearchBar>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="flex-shrink-0 text-xs text-muted">Tags:</span>
              <TagChip label="All" active={activeTag === ""} onClick={() => handleTagClick("")} />
              {tags.map((tag) => (
                <TagChip
                  key={tag.id ?? tag.name}
                  label={tag.name}
                  active={activeTag === tag.name}
                  onClick={() => handleTagClick(tag.name)}
                />
              ))}
            </div>
          </div>

          {viewMode === "gallery" && (
            <p className="mb-1.5 min-h-[18px] text-[13px] text-muted">
              {total} result{total !== 1 ? "s" : ""} found
            </p>
          )}

          {viewMode === "daily" && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
                    📅 Today&apos;s Snippet
                  </span>
                  <span className="rounded-full border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.12)] px-2.5 py-[3px] text-[11px] font-semibold text-[#22c55e]">
                    ✦ Auto Daily
                  </span>
                </div>
                {!isRandomMode && (
                  <span className="text-xs text-muted">
                    Next snippet tomorrow · in <span className="font-semibold text-primary">{countdown}</span>
                  </span>
                )}
              </div>

              {isRandomMode && (
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="rounded-full border border-primary-glow bg-primary-subtle px-2.5 py-[3px] text-[11px] font-semibold text-primary">
                    🔀 Random Snippet
                  </span>
                  <button
                    onClick={handleBackToDaily}
                    className="bg-transparent text-xs text-muted underline hover:text-primary"
                  >
                    ← Back to today&apos;s snippet
                  </button>
                </div>
              )}

              {snippetLoading ? (
                <Loader label="Loading snippet..." />
              ) : dailySnippet ? (
                <SnippetCard snippet={dailySnippet} />
              ) : (
                <p className="mt-6 text-center text-muted">No snippets available yet.</p>
              )}
            </div>
          )}

          {viewMode === "gallery" && (
            <div>
              {galleryLoading ? (
                <Loader label="Searching..." />
              ) : galleryResults.length === 0 ? (
                <p className="py-8 text-center text-muted">No snippets match your filters.</p>
              ) : (
                galleryResults.map((s) => (
                  <SnippetCard
                    key={s.id}
                    snippet={s}
                    actions={
                      token ? (
                        <GalleryFavButton
                          id={s.id}
                          favored={Boolean(galleryFavOverrides[s.id])}
                          onToggle={handleToggleGalleryFavorite}
                        />
                      ) : null
                    }
                  />
                ))
              )}
              <Pagination
                page={page}
                total={total}
                perPage={PER_PAGE}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          )}

          <Footer />
        </div>
      </div>
    </div>
  );
}
