import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import * as snippetService from "../services/snippetService";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const controlBtn =
  "inline-flex items-center gap-[7px] whitespace-nowrap rounded-md border border-border-card bg-card px-4 py-2 text-sm font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary";

// 1:1 port of calendar.html + calendar.js. No Sidebar/auth-guard here,
// matching the original — this page was standalone and reachable by
// anyone. Snippets are matched against `s.date` exactly as the legacy
// code did; the private/public endpoints it calls are the same
// pre-existing ones flagged in snippetService.js.
export default function Calendar() {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [snippets, setSnippets] = useState([]);

  useEffect(() => {
    const fetcher = token ? snippetService.getPrivateSnippets : snippetService.getPublicSnippets;
    fetcher()
      .then(setSnippets)
      .catch(() => setSnippets([]));
  }, [token]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().split("T")[0];

  function dateStrFor(d) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= numDays; d += 1) cells.push(d);

  return (
    <div className="mx-auto max-w-[1100px] p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-2xl font-extrabold text-text">
            {MONTH_NAMES[month]} {year}
          </h2>
          <p className="mt-1 text-sm text-muted">Browse snippets by creation date</p>
        </div>
        <div className="flex gap-2">
          <button
            className={controlBtn}
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            ◀
          </button>
          <button className={controlBtn} onClick={() => setCurrentDate(new Date())}>
            Today
          </button>
          <button
            className={controlBtn}
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-md">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-card-elevated px-2 py-2 text-center text-xs font-semibold text-muted">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} className="min-h-[110px] bg-card" />;
          const dateStr = dateStrFor(d);
          const isToday = dateStr === todayStr;
          // The API returns `created_at` (a full ISO datetime), not a bare
          // `date` field — the original vanilla app's calendar.js compared
          // against `s.date`, which no snippet response has ever had, so
          // this always matched nothing. Now that /snippets/private and
          // /snippets/public actually exist (Phase 7.5 backend fix), fixing
          // this comparison is what makes the calendar view work at all.
          const daySnippets = snippets.filter((s) => s.created_at && s.created_at.slice(0, 10) === dateStr);
          return (
            <div
              key={dateStr}
              className={`flex min-h-[110px] flex-col gap-1 bg-card p-2 hover:bg-card-hover ${
                isToday ? "bg-primary-subtle outline outline-1 -outline-offset-1 outline-primary" : ""
              }`}
            >
              <div className="text-sm text-muted">{d}</div>
              {daySnippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => alert(`Snippet: ${s.title}`)}
                  className="truncate rounded bg-primary-subtle px-1.5 py-0.5 text-left text-xs text-primary hover:bg-primary hover:text-white"
                >
                  {s.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
