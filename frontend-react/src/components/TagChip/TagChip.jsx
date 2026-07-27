// Two visual roles the original ".tag-chip"/".tag-badge" classes played:
// "filter"  — clickable, toggles active (used in Home's tag filter row)
// "badge"   — static display pill (used on every snippet card's footer)
export default function TagChip({ label, active = false, onClick, variant = "filter" }) {
  if (variant === "badge") {
    return (
      <span className="whitespace-nowrap rounded-full border border-primary-glow bg-primary-subtle px-2.5 py-[3px] text-[11px] font-semibold text-primary">
        {label}
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
        active
          ? "border-primary bg-primary-subtle text-primary"
          : "border-border bg-card text-muted hover:border-primary hover:bg-primary-subtle hover:text-primary"
      }`}
    >
      {label}
    </span>
  );
}
