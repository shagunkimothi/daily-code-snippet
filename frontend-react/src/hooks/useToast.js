import { useCallback, useRef, useState } from "react";

// Consolidates the toast logic that MySnippets.jsx and addnewsnippets.js
// each hand-rolled independently in the original (same 3s-timeout pattern,
// slightly different call signatures). One hook, one <Toast/> component.
export function useToast() {
  const [toast, setToast] = useState(null); // { message, variant }
  const timerRef = useRef(null);

  const showToast = useCallback((message, variant = "success") => {
    setToast({ message, variant });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}
