import { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext(null);

// Same no-flash trick as the old Themetoggle.js: disable transitions for
// two animation frames while the class swap happens, then re-enable them.
function withoutTransition(fn) {
  document.body.classList.add("no-transition");
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove("no-transition");
    });
  });
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("theme") === "light" ? "light" : "dark"
  );

  useEffect(() => {
    withoutTransition(() => {
      document.body.classList.toggle("light", theme === "light");
    });
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
