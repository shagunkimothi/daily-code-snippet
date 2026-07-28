import { useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

// Literal swatch colors per theme (not live CSS vars) so every preview card
// renders correctly regardless of which theme is *currently* active — kept
// in sync by hand with index.css's per-theme blocks (bg/card/text/primary
// only; the full token set lives there, this is presentational only).
const PREVIEWS = {
  midnight: { bg: "#000000", card: "#0a0a0d", text: "#e4ecf5", primary: "#00d4ff" },
  solar: { bg: "#fdf6ec", card: "#fffaf1", text: "#2b2013", primary: "#e8863a" },
  forest: { bg: "#0a120d", card: "#0f1a13", text: "#d9ecdf", primary: "#34d399" },
  lavender: { bg: "#f5f0fb", card: "#ffffff", text: "#2a2440", primary: "#8b5cf6" },
  ocean: { bg: "#060e1a", card: "#0b1626", text: "#dbe8f5", primary: "#2b8ca6" },
  paper: { bg: "#ffffff", card: "#f8f9fb", text: "#14161a", primary: "#0077aa" },
};

function ThemePreviewCard({ themeDef, active, onSelect }) {
  const p = PREVIEWS[themeDef.id];
  return (
    <button
      type="button"
      onClick={() => onSelect(themeDef.id)}
      aria-pressed={active}
      className={`group relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-transform hover:-translate-y-0.5 ${
        active ? "shadow-lg" : ""
      }`}
      style={{ background: p.bg, borderColor: active ? p.primary : `${p.text}22` }}
    >
      <div className="flex-1 p-3.5">
        <div className="rounded-lg p-3" style={{ background: p.card, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}>
          <div className="mb-2 h-1.5 w-3/4 rounded-full" style={{ background: p.text, opacity: 0.85 }} />
          <div className="mb-3 h-1.5 w-1/2 rounded-full" style={{ background: p.text, opacity: 0.4 }} />
          <div
            className="inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-bold"
            style={{ background: p.primary, color: p.bg }}
          >
            Button
          </div>
        </div>
      </div>
      <div
        className="flex items-center justify-between px-3.5 py-2.5"
        style={{ borderTop: `1px solid ${p.text}1a` }}
      >
        <span className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: p.text }}>
          <span aria-hidden="true">{themeDef.emoji}</span> {themeDef.label}
        </span>
        {active && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ color: p.primary }}
          >
            <Check size={16} aria-hidden="true" />
          </motion.span>
        )}
      </div>
    </button>
  );
}

export default function ThemeGallery({ open, onClose }) {
  const { theme, themes, setTheme } = useTheme();
  const [pendingClose, setPendingClose] = useState(false);

  function handleSelect(id) {
    setTheme(id);
    setPendingClose(true);
    setTimeout(() => {
      onClose();
      setPendingClose(false);
    }, 450);
  }

  return (
    <Dialog open={open} onClose={onClose} transition className="relative z-[200]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-2xl rounded-2xl border border-border-card bg-card p-6 shadow-lg transition-all duration-200 data-[closed]:translate-y-2 data-[closed]:opacity-0 data-[closed]:scale-95"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-mono text-lg font-extrabold tracking-tight text-text">
                Choose a theme
              </DialogTitle>
              <p className="mt-1 text-sm text-muted">
                {pendingClose ? "Applied ✓" : "Applies instantly, everywhere."}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close theme gallery"
              className="rounded-md p-2 text-muted hover:bg-card-hover hover:text-text"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <ThemePreviewCard key={t.id} themeDef={t} active={theme === t.id} onSelect={handleSelect} />
            ))}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
