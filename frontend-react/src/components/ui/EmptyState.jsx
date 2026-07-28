// Canonical "nothing here yet" pattern, replacing ad hoc
// <p>No snippets available.</p>-style strings scattered across pages.
export default function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-card px-6 py-14 text-center ${className}`}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card-elevated text-muted">
          <Icon size={22} aria-hidden="true" />
        </div>
      )}
      <div>
        <p className="font-semibold text-text">{title}</p>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
