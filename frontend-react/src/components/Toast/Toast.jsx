import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const VARIANT_CLASSES = {
  success: "bg-green text-[#03080e]",
  error: "bg-red text-white",
  info: "bg-primary text-[#03080e]",
};

// `onDismiss` is optional and additive — existing call sites that only pass
// `toast` (no dismiss button) keep rendering exactly as before, just with an
// animated enter/exit now instead of an abrupt pop in/out.
export default function Toast({ toast, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[999] flex flex-col items-end gap-2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id ?? toast.message}
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto flex items-center gap-3 rounded-md px-5 py-3 text-sm font-bold shadow-lg ${
              VARIANT_CLASSES[toast.variant] || VARIANT_CLASSES.success
            }`}
          >
            {toast.message}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss notification"
                className="rounded p-0.5 opacity-70 hover:opacity-100"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
