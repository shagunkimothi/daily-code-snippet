import { useEffect, useState } from "react";

// Generic debounce hook. Home's search/filter inputs used a 300ms
// setTimeout debounce in script.js's onFilterChange() — this is the
// reusable equivalent.
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
