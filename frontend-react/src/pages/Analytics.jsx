import { Flame, Trophy } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import EmptyState from "../components/ui/EmptyState";
import { useFetch } from "../hooks/useFetch";
import * as userService from "../services/userService";

function BarChart({ points, labelKey, valueKey, formatLabel }) {
  const max = Math.max(...points.map((p) => p[valueKey]), 1);
  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {points.map((p) => {
        const heightPct = Math.max((p[valueKey] / max) * 100, p[valueKey] > 0 ? 6 : 2);
        return (
          <div key={p[labelKey]} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-sm ${p[valueKey] > 0 ? "bg-primary" : "bg-card-elevated"}`}
                style={{ height: `${heightPct}%` }}
                title={`${formatLabel(p[labelKey])}: ${p[valueKey]}`}
              />
            </div>
            <span className="text-[10px] text-muted">{formatLabel(p[labelKey])}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatWeek(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatMonth(ym) {
  const [year, month] = ym.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short" });
}

// Deep-dive analytics — deliberately its own route, not folded into
// Dashboard. Dashboard stays "today's notebook" (the daily snippet as the
// hero); this is the opt-in place for people who want the numbers, so the
// everyday screen doesn't turn into a metrics wall.
export default function Analytics() {
  const { data, loading, error, refetch } = useFetch(() => userService.getAnalytics(), []);

  return (
    <AppShell title="Analytics" maxWidth="880px">
      <Header title="Analytics" backTo="/" />

      {loading && <p className="text-sm text-muted">Loading your learning analytics...</p>}

      {!loading && error && (
        <EmptyState
          title="Couldn't load analytics"
          description="Check that the backend is reachable."
          action={
            <button onClick={refetch} className="mt-2 text-sm font-semibold text-primary hover:underline">
              Retry
            </button>
          }
        />
      )}

      {!loading && !error && data && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Current Streak" value={data.current_streak} />
            <StatCard label="Longest Streak" value={data.longest_streak} />
            <StatCard label="Completed" value={data.snippets_completed} />
            <StatCard label="Favorites" value={data.favorites_count} />
            <StatCard label="Consistency" value={data.reading_consistency_pct} suffix="%" />
            <StatCard label="Avg. Time" value={data.average_learning_time_minutes} suffix=" min" />
          </div>

          {(data.current_streak > 0 || data.longest_streak > 0) && (
            <Card padding="md" className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Flame size={16} className="text-amber" aria-hidden="true" />
                <span>
                  <strong className="text-text">{data.current_streak}</strong>-day current streak
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Trophy size={16} className="text-amber" aria-hidden="true" />
                <span>
                  <strong className="text-text">{data.longest_streak}</strong>-day best streak
                </span>
              </div>
              <div className="ml-auto text-sm text-text-secondary">
                Trend vs. last 2 weeks:{" "}
                <strong className={data.learning_trend_pct >= 0 ? "text-green" : "text-red"}>
                  {data.learning_trend_pct >= 0 ? "+" : ""}
                  {data.learning_trend_pct}%
                </strong>
              </div>
            </Card>
          )}

          <Card padding="md">
            <h2 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
              Weekly Activity
            </h2>
            <BarChart points={data.weekly_activity} labelKey="week_start" valueKey="count" formatLabel={formatWeek} />
          </Card>

          <Card padding="md">
            <h2 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
              Monthly Activity
            </h2>
            <BarChart points={data.monthly_activity} labelKey="month" valueKey="count" formatLabel={formatMonth} />
          </Card>

          {data.category_distribution.length > 0 && (
            <Card padding="md">
              <h2 className="mb-4 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
                Category Distribution
              </h2>
              <div className="flex flex-col gap-2.5">
                {data.category_distribution.map((c) => {
                  const total = data.category_distribution.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? Math.round((c.count / total) * 100) : 0;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-[110px] flex-shrink-0 truncate font-mono text-sm font-semibold capitalize text-text-secondary">
                        {c.category}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-border bg-card-elevated">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary-dim to-primary transition-[width] duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 flex-shrink-0 text-right font-mono text-[0.78rem] font-bold text-muted">
                        {c.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card padding="md">
            <h2 className="mb-3 font-mono text-[0.82rem] font-bold uppercase tracking-wide text-text-secondary">
              Preferred Topics
            </h2>
            {data.preferred_topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.preferred_topics.map((t) => (
                  <Badge key={t} variant="primary">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No topics selected yet — pick some in Settings to personalize recommendations.
              </p>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
