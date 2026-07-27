// Just the text input + a slot for whatever <select> filters the page
// needs (Home passes language+difficulty selects, MySnippets passes
// language+difficulty+visibility selects) — kept generic since the two
// pages' filter sets differ.
export default function SearchBar({ value, onChange, placeholder = "🔍 Search...", children }) {
  return (
    <div className="flex gap-2.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-[2] rounded-md border border-border bg-input-bg px-[0.95rem] py-[0.62rem] text-sm text-text placeholder:text-muted focus:border-primary"
      />
      {children}
    </div>
  );
}
