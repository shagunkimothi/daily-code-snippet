import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Button from "../components/ui/Button";
import Dialog from "../components/ui/Dialog";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import { useAuth } from "../hooks/useAuth";
import * as snippetService from "../services/snippetService";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 1:1 port of calendar.html + calendar.js, now inside AppShell (the
// original had no Sidebar/nav at all — standalone) so it matches the rest
// of the app's shell instead of feeling orphaned. Snippets are matched
// against `s.date` exactly as the legacy code did; the private/public
// endpoints it calls are the same pre-existing ones flagged in
// snippetService.js.
export default function Calendar() {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [snippets, setSnippets] = useState([]);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
    <AppShell title="Calendar" maxWidth="1100px">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-mono text-xl font-extrabold text-text sm:text-2xl">
            {MONTH_NAMES[month]} {year}
          </h2>
          <p className="mt-1 text-sm text-muted">Browse snippets by creation date</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button
            variant="secondary"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border shadow-md">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="bg-card-elevated px-1 py-2 text-center text-[11px] font-semibold text-muted sm:px-2 sm:text-xs">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`pad-${i}`} className="min-h-[70px] bg-card sm:min-h-[110px]" />;
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
              className={`flex min-h-[70px] flex-col gap-1 bg-card p-1.5 hover:bg-card-hover sm:min-h-[110px] sm:p-2 ${
                isToday ? "bg-primary-subtle outline outline-1 -outline-offset-1 outline-primary" : ""
              }`}
            >
              <div className="text-xs text-muted sm:text-sm">{d}</div>
              {daySnippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedSnippet(s);
                    setDialogOpen(true);
                  }}
                  className="truncate rounded bg-primary-subtle px-1.5 py-0.5 text-left text-[11px] text-primary hover:bg-primary hover:text-white sm:text-xs"
                >
                  {s.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* selectedSnippet is intentionally NOT cleared on close — only
          `dialogOpen` flips, so the card stays rendered through the exit
          transition instead of vanishing right as the dialog starts to
          fade out. It's replaced, not cleared, next time a day is clicked. */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedSnippet?.title}
        className="max-h-[85vh] max-w-2xl overflow-y-auto"
      >
        {selectedSnippet && <SnippetCard snippet={selectedSnippet} />}
      </Dialog>
    </AppShell>
  );
}
