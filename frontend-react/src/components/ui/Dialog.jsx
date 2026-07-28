import { Dialog as HDialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";

// Generic modal shell — used by ThemeGallery today, and standing ready to
// replace hand-rolled modals (MySnippets' delete-confirmation overlay,
// Calendar's alert()-based day click) in Phase 2.
export default function Dialog({ open, onClose, title, children, className = "" }) {
  return (
    <HDialog open={open} onClose={onClose} transition className="relative z-[200]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity duration-200 data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className={`w-full max-w-md rounded-2xl border border-border-card bg-card p-6 shadow-lg transition-all duration-200 data-[closed]:translate-y-2 data-[closed]:opacity-0 data-[closed]:scale-95 ${className}`}
        >
          {title && (
            <div className="mb-4 flex items-center justify-between gap-4">
              <DialogTitle className="font-mono text-base font-bold text-text">{title}</DialogTitle>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-muted hover:bg-card-hover hover:text-text"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {children}
        </DialogPanel>
      </div>
    </HDialog>
  );
}
