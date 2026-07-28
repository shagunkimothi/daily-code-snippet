import { useEffect, useState } from "react";
import { Clock, Copy, Filter, RotateCw, Search as SearchIcon, Star } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Footer from "../components/Footer/Footer";
import SearchBar from "../components/SearchBar/SearchBar";
import TagChip from "../components/TagChip/TagChip";
import Pagination from "../components/Pagination/Pagination";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Select from "../components/ui/Select";
import EmptyState from "../components/ui/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useDebounce } from "../hooks/useDebounce";
import * as snippetService from "../services/snippetService";

const LANGUAGES = ["Python", "JavaScript", "Java", "C++", "HTML", "CSS", "TypeScript", "Go", "Rust"];
const LANGUAGE_OPTIONS = [{ value: "", label: "All Languages" }, ...LANGUAGES.map((l) => ({ value: l, label: l }))];
const DIFFICULTIES = [
  { value: "beginner", label: "🟢 Beginner" },
  { value: "intermediate", label: "🟡 Intermediate" },
  { value: "advanced", label: "🔴 Advanced" },
];
const DIFFICULTY_OPTIONS = [{ value: "", label: "All Levels" }, ...DIFFICULTIES];
const PER_PAGE = 12;

function GalleryFavButton({ id, favored, onToggle }) {
  return (
    <button
      onClick={() => onToggle(id, favored)}
      aria-label={favored ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favored}
      className={`ml-auto transition-transform hover:scale-125 ${favored ? "text-amber" : "text-muted"}`}
    >
      <Star size={18} fill={favored ? "currentColor" : "none"} aria-hidden="true" />
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

  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const isFiltering = Boolean(debouncedSearch.trim() || language || difficulty || activeTag);
  const [viewMode, setViewMode] = useState("daily"); // "daily" | "gallery"
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile-only disclosure

  const [tags, setTags] = useState([]);

  const [dailySnippet, setDailySnippet] = useState(null);
  const [snippetLoading, setSnippetLoading] = useState(true);
  const [isRandomMode, setIsRandomMode] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const [galleryResults, setGalleryResults] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [galleryFavOverrides, setGalleryFavOverrides] = useState({});

  const [copyLabel, setCopyLabel] = useState("Copy");
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
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy"), 1500);
  }

  return (
    <AppShell title="Daily Snippet" maxWidth="880px">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex flex-wrap items-center gap-3 font-mono text-xl font-extrabold tracking-tight text-text sm:text-2xl">
            Daily Code Snippet
            <span className="animate-pulseGlow rounded-sm border border-primary-glow bg-primary-subtle px-[11px] py-[5px] font-mono text-[0.64rem] font-bold uppercase tracking-[0.1em] text-primary">
              TODAY
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

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
          <Button variant="primary" onClick={handleRandom} className="gap-1.5">
            <RotateCw size={14} aria-hidden="true" />
            New Random
          </Button>
          <Button variant="secondary" onClick={handleCopy} className="gap-1.5">
            <Copy size={14} aria-hidden="true" />
            {copyLabel}
          </Button>
          <button
            onClick={handleToggleDailyFavorite}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorited}
            className={`rounded-md bg-transparent p-2 transition-transform hover:scale-110 ${
              isFavorited ? "text-amber" : "text-muted"
            }`}
          >
            <Star size={20} fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-border-card bg-card px-3 py-2 text-xs font-semibold text-text-secondary lg:hidden"
        >
          <Filter size={14} aria-hidden="true" />
          Filters
          {isFiltering && <Badge variant="primary" size="sm">On</Badge>}
        </button>

        <div className={`flex-col gap-2.5 ${filtersOpen ? "flex" : "hidden"} lg:flex`}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search title, code, explanation...">
            <Select value={language} onChange={setLanguage} options={LANGUAGE_OPTIONS} placeholder="All Languages" className="flex-1" />
            <Select value={difficulty} onChange={setDifficulty} options={DIFFICULTY_OPTIONS} placeholder="All Levels" className="flex-1" />
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
      </div>

      {viewMode === "gallery" && (
        <p className="mb-1.5 min-h-[18px] text-[13px] text-muted">
          {total} result{total !== 1 ? "s" : ""} found
        </p>
      )}

      {viewMode === "daily" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Today&apos;s Snippet</span>
              <Badge variant="success">✦ Auto Daily</Badge>
            </div>
            {!isRandomMode && (
              <span className="text-xs text-muted">
                Next snippet tomorrow · in <span className="font-semibold text-primary">{countdown}</span>
              </span>
            )}
          </div>

          {isRandomMode && (
            <div className="mt-2.5 flex items-center gap-2">
              <Badge variant="primary">🔀 Random Snippet</Badge>
              <button onClick={handleBackToDaily} className="bg-transparent text-xs text-muted underline hover:text-primary">
                ← Back to today&apos;s snippet
              </button>
            </div>
          )}

          {snippetLoading ? (
            <Loader label="Loading today's concept..." />
          ) : dailySnippet ? (
            <SnippetCard snippet={dailySnippet} />
          ) : (
            <EmptyState
              className="mt-6"
              icon={Clock}
              title="Today's concept is waiting"
              description="Check back in a moment."
            />
          )}
        </div>
      )}

      {viewMode === "gallery" && (
        <div>
          {galleryLoading ? (
            <Loader label="Searching..." />
          ) : galleryResults.length === 0 ? (
            <EmptyState
              className="my-4"
              icon={SearchIcon}
              title="No matches yet"
              description="Try a different language, difficulty, or search term."
            />
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
    </AppShell>
  );
}
