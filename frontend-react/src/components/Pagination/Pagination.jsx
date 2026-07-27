// Mirrors script.js's pagination: hidden entirely when everything fits on
// one page (data.total <= 12), Prev disabled on page 1, Next disabled once
// the current page covers the remaining total.
export default function Pagination({ page, total, perPage = 12, onPrev, onNext }) {
  if (total <= perPage) return null;

  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded-[10px] border border-border bg-card px-5 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        ← Prev
      </button>
      <span className="text-[13px] text-muted">Page {page}</span>
      <button
        onClick={onNext}
        disabled={page * perPage >= total}
        className="rounded-[10px] border border-border bg-card px-5 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}
