import { useEffect, useRef, useState } from "react";
import Prism from "../../utils/prismSetup";
import TagChip from "../TagChip/TagChip";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import { difficultyVariant } from "../../utils/difficultyVariant";

// Shared by Home (daily/random snippet + search results), MySnippets, and
// Favorites. `actions` renders whatever page-specific buttons belong
// top-right (a favorite star on Home, visibility/copy/delete on
// MySnippets). `collapsible` reproduces MySnippets' "▶ Show Code"
// expand/collapse.
export default function SnippetCard({
  snippet,
  actions,
  collapsible = false,
  defaultExpanded = true,
  showBadges = true,
  similarityScore,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const codeRef = useRef(null);

  useEffect(() => {
    if ((!collapsible || expanded) && codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [expanded, collapsible, snippet.code, snippet.language]);

  const lang = (snippet.language || "javascript").toLowerCase();

  return (
    <Card hover className="group relative mt-4 animate-fadeUp overflow-hidden">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h3 className="font-mono text-base font-bold tracking-tight text-text">{snippet.title}</h3>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="whitespace-nowrap rounded-sm border border-border-card bg-primary-subtle px-2.5 py-[3px] font-mono text-[0.73rem] font-medium tracking-wide text-muted">
            {snippet.language} • {snippet.is_public ? "Public" : "Private"}
          </span>
          {actions}
        </div>
      </div>

      {(!collapsible || expanded) && (
        <pre>
          <code ref={codeRef} className={`language-${lang}`}>
            {snippet.code}
          </code>
        </pre>
      )}

      {collapsible && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 font-mono text-xs font-bold tracking-wide text-primary hover:opacity-70"
        >
          {expanded ? "▼ Hide Code" : "▶ Show Code"}
        </button>
      )}

      {snippet.explanation && (
        <p className="mt-3.5 text-sm italic leading-relaxed text-text-secondary">
          {snippet.explanation}
        </p>
      )}

      {showBadges && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {typeof similarityScore === "number" && (
            <Badge variant="primary">{Math.round(similarityScore * 100)}% semantic match</Badge>
          )}
          <Badge variant={difficultyVariant(snippet.difficulty)}>{snippet.difficulty || "beginner"}</Badge>
          {snippet.category && <Badge variant="neutral">{snippet.category}</Badge>}
          {(snippet.tags || []).map((t) => (
            <TagChip key={t.id ?? t.name} label={t.name} variant="badge" />
          ))}
        </div>
      )}

      {showBadges && (snippet.author || snippet.reading_time_minutes) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {snippet.author && <span>by {snippet.author}</span>}
          {snippet.author && snippet.reading_time_minutes && <span aria-hidden="true">·</span>}
          {snippet.reading_time_minutes && <span>☕ {snippet.reading_time_minutes} min read</span>}
        </div>
      )}
    </Card>
  );
}
