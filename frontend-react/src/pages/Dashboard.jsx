import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import Heatmap from "../components/Heatmap/Heatmap";
import Skeleton from "../components/Skeleton/Skeleton";
import { useFetch } from "../hooks/useFetch";
import * as dashboardService from "../services/dashboardService";
import { colorForLanguage } from "../utils/langColors";

function useAnimatedCount(target, active) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setValue(Math.min(Math.round((target / steps) * step), target));
      if (step >= steps) clearInterval(timer);
    }, 800 / steps);
    return () => clearInterval(timer);
  }, [target, active]);
  return value;
}

function StatCard({ label, value, loading }) {
  const animated = useAnimatedCount(value || 0, !loading);
  return (
    <div className="rounded-lg border border-border-card bg-card px-6 py-[1.35rem] text-center shadow-sm transition-transform hover:-translate-y-0.5">
      <h3 className="mb-2.5 font-mono text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted">{label}</h3>
      {loading ? (
        <Skeleton className="mx-auto h-9 w-14" />
      ) : (
        <p className="font-mono text-[2.2rem] font-extrabold leading-none text-text">{animated}</p>
      )}
    </div>
  );
}

// 1:1 port of dashboard.html + dashboard.js, including the pageshow/
// favoritesChanged/snippetsChanged refetch trigger the original wired up
// so the dashboard is fresh after adding/favoriting/deleting a snippet
// elsewhere and navigating back.
//
// Loading behavior matches the original more closely than a full-page
// spinner would: dashboard.js rendered the whole shell (badge, greeting,
// stat cards, heatmap section) immediately and only shimmered the
// individual numbers via its .skeleton-pulse class (showSkeletons()) while
// the fetch was in flight — so that's what happens here too, via the
// shared <Skeleton/> component.
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
  const recent = (d?.recent_snippets || []).slice(0, 5);
  const langStats = d?.language_stats && Object.keys(d.language_stats).length ? d.language_stats : null;
  const langTotal = langStats ? Object.values(langStats).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 px-10 py-12">
        <div className="mx-auto max-w-[880px]">
          <Header
            actions={
              <Link
                to="/mysnippets"
                className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
              >
                📁 My Snippets
              </Link>
            }
          />

          <div className="mb-8 animate-fadeUp">
            <span className="mb-3 inline-block rounded-sm border border-primary-glow bg-primary-subtle px-3 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.12em] text-primary">
              PRO DASHBOARD
            </span>
            <h2 className="mb-1.5 font-mono text-[2rem] font-extrabold leading-tight tracking-tight text-text">
              {greeting}
            </h2>
            <p className="text-sm text-text-secondary">
              Managing{" "}
              {loading ? (
                <Skeleton className="inline-block h-4 w-6 align-middle" />
              ) : (
                <strong className="font-bold text-primary">{d?.total_snippets ?? 0}</strong>
              )}{" "}
              snippets.
            </p>
          </div>

          <div className="relative mb-4 overflow-hidden rounded-xl border border-border-card bg-card px-8 py-7 text-center shadow-md">
            <h3 className="mb-3.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
              Created This Week
            </h3>
            {loading ? (
              <Skeleton className="mx-auto h-14 w-20" />
            ) : (
              <p className="font-mono text-[3.5rem] font-extrabold leading-none text-primary [text-shadow:0_0_30px_var(--primary-glow)]">
                {d?.created_this_week ?? "–"}
              </p>
            )}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatCard label="Total Snippets" value={d?.total_snippets} loading={loading} />
            <StatCard label="Favorites" value={d?.favorite_count} loading={loading} />
            <StatCard label="Public" value={d?.public_count} loading={loading} />
            <StatCard label="Private" value={d?.private_count} loading={loading} />
          </div>

          {loading ? (
            <Skeleton className="mt-4 h-48 w-full rounded-xl" />
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

          <div className="mt-4 rounded-xl border border-border-card bg-card px-7 py-6 shadow-sm">
            {loading ? (
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <>
                <h3 className="mb-2.5 font-mono text-sm font-bold uppercase tracking-wide text-text-secondary">
                  ⚠️ Could not load dashboard
                </h3>
                <p className="mb-3 text-sm text-muted">Check that your backend is running.</p>
                <button
                  onClick={refetch}
                  className="rounded-md border border-primary-glow bg-primary-subtle px-[18px] py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-[#03080e]"
                >
                  🔄 Retry
                </button>
              </>
            ) : recent.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
                    🕐 Recent Snippets
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
                              {s.is_public ? "🌐 Public" : "🔒 Private"}
                            </span>
                            {date && <span className="font-mono text-xs text-muted">📅 {date}</span>}
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
                  🕐 Latest Snippet
                </h3>
                <div className="flex items-start gap-3 rounded-md border border-border bg-card-elevated px-3.5 py-2.5">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_8px_var(--primary-glow)]" />
                  <div>
                    <p className="text-sm font-semibold text-text">📝 {d.latest_snippet}</p>
                    <p className="mt-1 font-mono text-xs text-muted">
                      Created this week: <strong>{d.created_this_week ?? 0}</strong>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
                  🕐 Recent Activity
                </h3>
                <p className="text-sm text-muted">
                  No snippets yet.{" "}
                  <Link to="/add" className="font-semibold text-primary hover:underline">
                    Add your first snippet →
                  </Link>
                </p>
              </>
            )}
          </div>

          {!loading && !error && langStats && (
            <div className="mt-4 rounded-xl border border-border-card bg-card px-7 py-6 shadow-sm">
              <h3 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
                📊 Languages Used
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
