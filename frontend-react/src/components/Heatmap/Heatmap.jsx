// Uses bg-primary at increasing *opacity* (not a hardcoded color) so the
// heatmap matches whichever of the 6 themes is active — Tailwind's `/alpha`
// color-modifier syntax doesn't work on CSS-custom-property-based colors
// like `--primary` (the modifier needs a literal color to compute against),
// but the plain `opacity-*` utility works on any background since it's a
// separate CSS property, blending down to the card's solid background.
const LEVEL_BG = {
  0: "bg-card-elevated",
  1: "bg-primary opacity-25",
  2: "bg-primary opacity-45",
  3: "bg-primary opacity-70",
  4: "bg-primary opacity-100 shadow-[0_0_6px_var(--primary-glow)]",
};

function levelFor(count, max) {
  if (!count) return 0;
  const pct = count / max;
  if (pct <= 0.25) return 1;
  if (pct <= 0.5) return 2;
  if (pct <= 0.75) return 3;
  return 4;
}

function StatItem({ label, value }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="font-mono text-2xl font-extrabold leading-none text-primary [text-shadow:0_0_20px_var(--primary-glow)]">
        {value}
      </span>
    </div>
  );
}

// Dashboard's 365-day activity grid. Reproduces loadHeatmap()'s level
// bucketing (count relative to the max day) 1:1. Cell colors now scale with
// the active theme's --primary (see LEVEL_BG) instead of a hardcoded cyan.
export default function Heatmap({ entries = [], currentStreak = 0, longestStreak = 0, activeDays = 0 }) {
  const max = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl border border-border-card bg-card px-7 py-6 animate-fadeUp [animation-delay:0.2s]">
      <div className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-text-secondary">
        🔥 Activity — Last 365 Days
      </div>

      <div className="mb-5 flex flex-wrap gap-6">
        <StatItem label="Current Streak" value={currentStreak} />
        <StatItem label="Longest Streak" value={longestStreak} />
        <StatItem label="Active Days" value={activeDays} />
      </div>

      <div className="overflow-x-auto pb-1.5">
        <div className="grid min-w-[640px] grid-cols-[repeat(53,1fr)] gap-[3px]">
          {entries.map((entry) => (
            <div
              key={entry.date}
              title={`${entry.date}: ${entry.count} action${entry.count !== 1 ? "s" : ""}`}
              className={`aspect-square rounded-[2px] transition-transform hover:z-10 hover:scale-150 ${
                LEVEL_BG[levelFor(entry.count, max)]
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end gap-[5px] font-mono text-[0.7rem] text-muted">
        Less
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div key={lvl} className={`h-[11px] w-[11px] rounded-[2px] ${LEVEL_BG[lvl]}`} />
        ))}
        More
      </div>
    </div>
  );
}
