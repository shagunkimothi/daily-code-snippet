import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import { useFetch } from "../hooks/useFetch";
import * as snippetService from "../services/snippetService";

// 1:1 port of favorites.html + favorites.js. Uses the shared themed
// SnippetCard (the original page's `bg-slate-800`/`text-gray-400` classes
// were dead weight — the vanilla site never loaded Tailwind, so those
// classes had zero visual effect and the page actually rendered with the
// same obsidian theme as everywhere else via style.css's global `body`/
// `.snippet-card` rules). No Sidebar here, matching the original's
// simpler standalone layout for this page.
export default function Favorites() {
  const { data, loading, error } = useFetch(snippetService.getFavorites, []);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    setFavorites((data || []).filter((s) => s && s.title && s.code));
  }, [data]);

  async function handleRemove(id) {
    try {
      await snippetService.removeFavorite(id);
      setFavorites((prev) => prev.filter((s) => s.id !== id));
      localStorage.setItem("favoritesChanged", "true");
    } catch (err) {
      console.error("Remove favorite error:", err);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">⭐ My Favorites</h2>
        <Link
          to="/"
          className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-md border border-border-card bg-card px-[1.1rem] py-[0.55rem] text-[0.84rem] font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
        >
          Back to Home
        </Link>
      </header>

      <main className="flex flex-col gap-2">
        {loading && <Loader label="Loading favorites..." />}
        {!loading && error && <p className="text-muted">Error loading favorites. Is the backend running?</p>}
        {!loading && !error && favorites.length === 0 && (
          <p className="text-muted">You haven&apos;t saved any favorites yet.</p>
        )}
        {!loading &&
          !error &&
          favorites.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet}
              showBadges={false}
              actions={
                <button
                  onClick={() => handleRemove(snippet.id)}
                  className="whitespace-nowrap rounded-sm border border-border-card bg-card px-3 py-1 text-xs font-semibold text-text-secondary hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
                >
                  Remove from Favorites
                </button>
              }
            />
          ))}
      </main>
    </div>
  );
}
