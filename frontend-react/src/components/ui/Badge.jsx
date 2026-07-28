// Unifies the pill patterns (difficulty, category, "DAILY FEED", status
// tags) scattered across SnippetCard/MySnippets/Dashboard into one set of
// variants, all driven by the existing `-subtle` token pairs so it re-themes
// automatically with the rest of the app.
const VARIANTS = {
  neutral: "border-border-card bg-card-elevated text-muted",
  primary: "border-primary-glow bg-primary-subtle text-primary",
  success: "border-green-subtle bg-green-subtle text-green",
  warning: "border-amber-subtle bg-amber-subtle text-amber",
  danger: "border-red-subtle bg-red-subtle text-red",
};

const SIZES = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-[3px] text-[11px]",
};

export default function Badge({ variant = "neutral", size = "md", className = "", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold capitalize ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
