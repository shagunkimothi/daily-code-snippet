// Shared between SnippetCard and Login's today's-snippet preview so both
// render the same Badge color for a given difficulty.
export function difficultyVariant(difficulty) {
  if (difficulty === "intermediate") return "warning";
  if (difficulty === "advanced") return "danger";
  return "success";
}
