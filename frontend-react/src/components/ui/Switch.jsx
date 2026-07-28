import { Switch as HSwitch } from "@headlessui/react";

// Accessible toggle switch (Headless UI Switch) — replacement for the plain
// `<input type="checkbox">` used for things like AddSnippet's "Make Public".
export default function Switch({ checked, onChange, label, className = "" }) {
  return (
    <HSwitch
      checked={checked}
      onChange={onChange}
      className={`group inline-flex items-center gap-2.5 focus:outline-none ${className}`}
    >
      <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border border-border-card bg-card-elevated transition-colors group-data-[checked]:border-primary group-data-[checked]:bg-primary group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-primary group-focus-visible:outline-offset-2">
        <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition-transform group-data-[checked]:translate-x-6" />
      </span>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </HSwitch>
  );
}
