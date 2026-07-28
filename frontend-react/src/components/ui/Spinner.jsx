// Canonical loading spinner primitive — backs both the full-page <Loader/>
// (icon + label) and any inline use (e.g. inside a <Button loading />).
export default function Spinner({ size = 16, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70 ${className}`}
      style={{ width: size, height: size, borderTopColor: "transparent" }}
      role="status"
      aria-label="Loading"
    />
  );
}
