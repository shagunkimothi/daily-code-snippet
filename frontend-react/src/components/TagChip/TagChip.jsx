import { X } from "lucide-react";

// Three visual roles the original ".tag-chip"/".tag-badge" classes played
// (plus "removable", new in the redesign):
// "filter"    — clickable, toggles active (used in Home's tag filter row)
// "badge"     — static display pill (used on every snippet card's footer)
// "removable" — has an "x" button (AddSnippet's tag input, previously a
//               hand-inlined duplicate of "badge"'s styling)
export default function TagChip({ label, active = false, onClick, onRemove, variant = "filter" }) {
  if (variant === "badge") {
    return (
      <span className="whitespace-nowrap rounded-full border border-primary-glow bg-primary-subtle px-2.5 py-[3px] text-[11px] font-semibold text-primary">
        {label}
      </span>
    );
  }

  if (variant === "removable") {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-primary-glow bg-primary-subtle px-2.5 py-[3px] text-xs font-semibold text-primary">
        {label}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${label}`}
          className="rounded-full hover:opacity-70"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border bg-card text-muted hover:border-primary hover:bg-primary-subtle hover:text-primary"
      }`}
    >
      {label}
    </button>
  );
}
