import { useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

// Searchable, keyboard-navigable dropdown replacing native <select> — built
// on Headless UI's Combobox (v2), which handles ARIA roles, focus, arrow-key
// navigation, and floating-ui-based positioning (the `anchor` prop) so none
// of that had to be hand-rolled. `options`: [{ value, label }].
export default function Select({ label, value, onChange, options, placeholder = "Select...", className = "" }) {
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value) || null;
  const filtered =
    query === ""
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={`relative ${className}`}>
      {label && <label className="mb-1.5 block text-xs font-semibold text-text-secondary">{label}</label>}
      <Combobox value={selected} onChange={(opt) => onChange(opt ? opt.value : "")}>
        <div className="relative">
          <ComboboxInput
            className="w-full rounded-md border border-border bg-input-bg py-2.5 pl-3.5 pr-9 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none"
            displayValue={(opt) => opt?.label || ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
            <ChevronDown size={15} aria-hidden="true" />
          </ComboboxButton>
        </div>
        <ComboboxOptions
          anchor="bottom start"
          transition
          className="z-50 min-w-[14rem] overflow-auto rounded-md border border-border-card bg-card-elevated py-1 shadow-lg transition duration-150 [--anchor-gap:6px] empty:invisible data-[closed]:opacity-0 data-[closed]:-translate-y-1 focus:outline-none"
        >
          {filtered.length === 0 ? (
            <div className="px-3.5 py-2 text-sm text-muted">No results</div>
          ) : (
            filtered.map((opt) => (
              <ComboboxOption
                key={opt.value}
                value={opt}
                className="group flex cursor-pointer items-center justify-between px-3.5 py-2 text-sm text-text data-[focus]:bg-primary-subtle data-[focus]:text-primary"
              >
                <span>{opt.label}</span>
                <Check size={14} className="invisible text-primary group-data-[selected]:visible" aria-hidden="true" />
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>
    </div>
  );
}
