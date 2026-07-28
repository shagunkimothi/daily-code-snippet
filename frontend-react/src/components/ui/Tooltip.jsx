import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SIDE_CLASS = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
};

// Lightweight hover/focus tooltip — Headless UI intentionally ships no
// Tooltip primitive (a plain absolutely-positioned label doesn't need
// floating-ui), so this is hand-rolled. Wraps its trigger in a span with
// hover/focus handlers; React's onFocus/onBlur behave like focusin/focusout
// so this fires correctly even though the actual focusable element is a
// descendant button/icon.
export default function Tooltip({ label, children, side = "top" }) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.12 }}
            className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border-card bg-card-elevated px-2.5 py-1 text-xs font-medium text-text shadow-md ${SIDE_CLASS[side]}`}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
