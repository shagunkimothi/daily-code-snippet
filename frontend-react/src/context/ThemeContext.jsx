import { createContext, useEffect, useState } from "react";

// The 6-theme catalog. `mode` drives anything that needs to know if a theme
// is visually light or dark without hardcoding per-theme special cases
// (e.g. picking a sensible toggleTheme() fallback, or the ThemeGallery's
// dark/light grouping).
export const THEMES = [
  { id: "midnight", label: "Midnight", emoji: "🌙", mode: "dark" },
  { id: "solar", label: "Solar", emoji: "☀️", mode: "light" },
  { id: "forest", label: "Forest", emoji: "🌿", mode: "dark" },
  { id: "lavender", label: "Lavender", emoji: "💜", mode: "light" },
  { id: "ocean", label: "Ocean", emoji: "🌊", mode: "dark" },
  { id: "paper", label: "Paper", emoji: "🤍", mode: "light" },
];

const THEME_IDS = THEMES.map((t) => t.id);

// Pre-redesign this app only had two themes, toggled via a `body.light`
// class and stored as the literal strings "light"/"dark". Map those to
// their closest new-catalog equivalent so returning users keep a sensible
// preference instead of silently resetting to the default.
const LEGACY_MIGRATION = { light: "paper", dark: "midnight" };

function resolveInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (LEGACY_MIGRATION[stored]) return LEGACY_MIGRATION[stored];
  if (THEME_IDS.includes(stored)) return stored;
  return "paper";
}

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  // index.html's inline script already set data-theme before first paint
  // (avoids a flash of the wrong theme); this effect just keeps it in sync
  // on every change and persists the choice. No more transition-suppression
  // trick — index.css's global `transition-property` rule now runs freely,
  // so switching themes cross-fades every color smoothly on its own.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function setTheme(id) {
    if (THEME_IDS.includes(id)) setThemeState(id);
  }

  // Kept for any future quick-toggle affordance; flips between the two
  // themes closest to the old binary dark/light.
  function toggleTheme() {
    setThemeState((prev) => {
      const current = THEMES.find((t) => t.id === prev);
      return current?.mode === "dark" ? "paper" : "midnight";
    });
  }

  const mode = THEMES.find((t) => t.id === theme)?.mode || "light";

  return (
    <ThemeContext.Provider value={{ theme, mode, themes: THEMES, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
