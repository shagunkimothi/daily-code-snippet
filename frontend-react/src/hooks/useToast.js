import { useCallback, useRef, useState } from "react";

let idCounter = 0;

// Return shape is intentionally unchanged from before ({ toast, showToast })
// so MySnippets.jsx/AddSnippet.jsx (not yet migrated to the redesign) keep
// working exactly as-is. `dismissToast` is additive — only new call sites
// that want a manual close button need to use it.
export function useToast() {
  const [toast, setToast] = useState(null); // { id, message, variant }
  const timerRef = useRef(null);

  const showToast = useCallback((message, variant = "success") => {
    const id = ++idCounter;
    setToast({ id, message, variant });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const dismissToast = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
