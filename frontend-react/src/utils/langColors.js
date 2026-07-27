// Shared by Dashboard's recent-activity list and MySnippets' language
// badges — same map both files hardcoded independently in the original.
export const LANG_COLORS = {
  python: "#3776ab",
  javascript: "#f7df1e",
  java: "#ed8b00",
  "c++": "#00599c",
  typescript: "#3178c6",
  html: "#e34c26",
  css: "#1572b6",
  go: "#00add8",
  rust: "#ce4a08",
  default: "#00d4ff",
};

export function colorForLanguage(language) {
  return LANG_COLORS[(language || "").toLowerCase()] || LANG_COLORS.default;
}
