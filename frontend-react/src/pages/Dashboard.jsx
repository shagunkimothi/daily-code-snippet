import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, FolderOpen, Plus, RotateCw, Sparkles } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Heatmap from "../components/Heatmap/Heatmap";
import Skeleton from "../components/Skeleton/Skeleton";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Dialog from "../components/ui/Dialog";
import EmptyState from "../components/ui/EmptyState";
import StatCard from "../components/ui/StatCard";
import { useFetch } from "../hooks/useFetch";
import * as dashboardService from "../services/dashboardService";
import * as snippetService from "../services/snippetService";
import * as userService from "../services/userService";
import { colorForLanguage } from "../utils/langColors";

// v1 rule-based recommendations (see backend /recommendations/me) — a
// quiet supporting card, not a second hero; clicking a suggestion opens
// the full snippet in a dialog rather than navigating away, same pattern
// as Calendar's day-click. `dialogOpen` is tracked separately from
// `selectedSnippet` so the content doesn't vanish mid-close-animation.
function RecommendedNext() {
  const { data, loading } = useFetch(() => userService.getRecommendations(), []);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  async function openSnippet(id) {
    setDetailLoading(true);
    setDialogOpen(true);
    try {
      const snippet = await snippetService.getSnippetById(id);
      setSelectedSnippet(snippet);
    } catch {
      setSelectedSnippet(null);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading || !data || (!data.next_snippet && data.related_snippets.length === 0)) return null;

  const suggestions = [data.next_snippet, ...data.related_snippets].filter(Boolean).slice(0, 4);

  return (
    <>
      <Card padding="md" className="mb-4">
        <h3 className="mb-1 flex items-center gap-1.5 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
          <Sparkles size={14} className="text-primary" aria-hidden="true" />
          Recommended Next
        </h3>
        <p className="mb-3 text-xs text-muted">Based on your topics and favorites.</p>
        <div className="flex flex-col gap-2">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSnippet(s.id)}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card-elevated px-3.5 py-2.5 text-left hover:border-border-hover hover:bg-card-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{s.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{s.reason}</p>
              </div>
              <Badge variant="primary" size="sm" className="flex-shrink-0">
                {s.language}
              </Badge>
            </button>
          ))}
        </div>
        {data.suggested_topics.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Not yet explored:{" "}
            <span className="font-semibold text-text-secondary">{data.suggested_topics.join(", ")}</span>
          </p>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedSnippet?.title}
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
      >
        {detailLoading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : selectedSnippet ? (
          <SnippetCard snippet={selectedSnippet} />
        ) : (
          <p className="text-sm text-muted">Couldn&apos;t load this snippet.</p>
        )}
      </Dialog>
    </>
  );
}

// Today's entry, in full — this is the dashboard's reason to exist, so it
// renders the actual SnippetCard (code, explanation, badges) rather than a
// title-and-link teaser. Everything else on this page is secondary to it.
function TodaysSnippetHero() {
  const { data, loading } = useFetch(() => snippetService.getDailySnippet(), []);

  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center justify-between">
        <p className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted">Today&apos;s Learning</p>
        <Link to="/" className="text-xs font-semibold text-primary hover:underline">
          Open in feed →
        </Link>
      </div>
      {loading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : data ? (
        <SnippetCard snippet={data} />
      ) : (
        <EmptyState className="mt-2" title="Today's concept is on its way" description="Check back in a moment." />
      )}
    </div>
  );
}

// 1:1 port of dashboard.html + dashboard.js, including the pageshow/
// favoritesChanged/snippetsChanged refetch trigger the original wired up
// so the dashboard is fresh after adding/favoriting/deleting a snippet
// elsewhere and navigating back.
//
// Hierarchy: this should read like opening today's notebook, not an admin
// panel — the daily snippet is the first and largest thing on the page;
// stats are a quiet supporting row, not a metrics dashboard.
export default function Dashboard() {
  const { data, loading, error, refetch } = useFetch(async () => {
    const [dashboard, heatmap] = await Promise.all([
      dashboardService.getDashboardData(),
      dashboardService.getHeatmap().catch(() => null),
    ]);
    return { dashboard, heatmap };
  }, []);

  useEffect(() => {
    localStorage.removeItem("favoritesChanged");
    function onPageShow(e) {
      if (
        e.persisted ||
        localStorage.getItem("favoritesChanged") === "true" ||
        localStorage.getItem("snippetsChanged") === "true"
      ) {
        localStorage.removeItem("favoritesChanged");
        localStorage.removeItem("snippetsChanged");
        refetch();
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [refetch]);

  // Doesn't depend on fetched data, so (unlike the original, which set this
  // before starting the fetch) it renders correctly on the very first paint
  // instead of waiting behind a loading flag.
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning ☀️" : hour < 17 ? "Good Afternoon 👋" : "Good Evening 🌙";

  const d = data?.dashboard;
  const heatmap = data?.heatmap;
  const streak = heatmap?.current_streak ?? 0;
  const recent = (d?.recent_snippets || []).slice(0, 5);
  const langStats = d?.language_stats && Object.keys(d.language_stats).length ? d.language_stats : null;
  const langTotal = langStats ? Object.values(langStats).reduce((a, b) => a + b, 0) : 0;

  return (
    <AppShell title="Dashboard" maxWidth="880px">
      <Header
        actions={
          <Link
            to="/mysnippets"
            className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
          >
            <FolderOpen size={15} aria-hidden="true" />
            My Snippets
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-fadeUp">
        <h2 className="font-mono text-2xl font-extrabold leading-tight tracking-tight text-text sm:text-[2rem]">
          {greeting}
        </h2>
        {!loading && streak > 0 && (
          <span className="mb-1 flex items-center gap-1.5 text-sm text-muted">
            <Flame size={15} className="text-amber" aria-hidden="true" />
            <strong className="font-bold text-text">{streak}</strong>-day streak
          </span>
        )}
      </div>

      <TodaysSnippetHero />

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row">
        <Button as="link" to="/add" variant="primary" size="lg" className="flex-1 gap-2">
          <Plus size={16} aria-hidden="true" />
          Add Snippet
        </Button>
        <Button as="link" to="/mysnippets" variant="secondary" size="lg" className="flex-1 gap-2">
          <FolderOpen size={16} aria-hidden="true" />
          View All Snippets
        </Button>
      </div>

      <RecommendedNext />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard label="This Week" value={d?.created_this_week} loading={loading} />
        <StatCard label="Total" value={d?.total_snippets} loading={loading} />
        <StatCard label="Favorites" value={d?.favorite_count} loading={loading} />
        <StatCard label="Public" value={d?.public_count} loading={loading} />
        <StatCard label="Private" value={d?.private_count} loading={loading} />
      </div>

      <Card padding="md" className="mb-4">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <>
            <h3 className="mb-2.5 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">
              Could not load dashboard
            </h3>
            <p className="mb-3 text-sm text-muted">Check that your backend is running.</p>
            <Button variant="secondary" onClick={refetch} className="gap-1.5">
              <RotateCw size={14} aria-hidden="true" />
              Retry
            </Button>
          </>
        ) : recent.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
                Recent Snippets
              </h3>
              <Link to="/mysnippets" className="text-[0.8rem] font-semibold text-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              {recent.map((s) => {
                const color = colorForLanguage(s.language);
                const date = s.created_at
                  ? new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "";
                return (
                  <div
                    key={s.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-card-elevated px-3.5 py-2.5 hover:border-border-hover hover:bg-card-hover"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: color, boxShadow: `0 0 8px ${color}44` }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">{s.title || "Untitled"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-sm border px-2 py-px font-mono text-[0.68rem] font-bold tracking-wide"
                          style={{ borderColor: color, color }}
                        >
                          {s.language}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {s.is_public ? "Public" : "Private"}
                        </span>
                        {date && <span className="font-mono text-xs text-muted">{date}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : d?.latest_snippet ? (
          <>
            <h3 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
              Latest Snippet
            </h3>
            <div className="flex items-start gap-3 rounded-md border border-border bg-card-elevated px-3.5 py-2.5">
              <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />
              <div>
                <p className="text-sm font-semibold text-text">{d.latest_snippet}</p>
                <p className="mt-1 font-mono text-xs text-muted">
                  Created this week: <strong>{d.created_this_week ?? 0}</strong>
                </p>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            title="Build your own knowledge library"
            description="Every snippet you save becomes part of your personal collection."
            action={
              <Button as="link" to="/add" variant="primary" className="mt-2 gap-1.5">
                <Plus size={15} aria-hidden="true" />
                Create your first snippet
              </Button>
            }
          />
        )}
      </Card>

      {loading ? (
        <Skeleton className="mb-4 h-48 w-full rounded-xl" />
      ) : (
        heatmap && (
          <Heatmap
            entries={heatmap.entries || []}
            currentStreak={heatmap.current_streak}
            longestStreak={heatmap.longest_streak}
            activeDays={heatmap.total_days_active}
          />
        )
      )}

      {!loading && !error && langStats && (
        <Card padding="md" className="mt-4">
          <h3 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
            Languages Used
          </h3>
          <div className="flex flex-col gap-2.5">
            {Object.entries(langStats)
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count]) => {
                const pct = langTotal > 0 ? Math.round((count / langTotal) * 100) : 0;
                return (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="w-[100px] flex-shrink-0 font-mono text-sm font-semibold text-text-secondary">
                      {lang}
                    </span>
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full border border-border bg-card-elevated"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${lang}: ${count} snippets (${pct}%)`}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-dim to-primary shadow-[0_0_8px_var(--primary-glow)] transition-[width] duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 flex-shrink-0 text-right font-mono text-[0.78rem] font-bold text-muted">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
