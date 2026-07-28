import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import SnippetCard from "../components/SnippetCard/SnippetCard";
import Loader from "../components/Loader/Loader";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { useFetch } from "../hooks/useFetch";
import * as snippetService from "../services/snippetService";

// 1:1 port of favorites.html + favorites.js. Uses the shared themed
// SnippetCard (the original page's `bg-slate-800`/`text-gray-400` classes
// were dead weight — the vanilla site never loaded Tailwind, so those
// classes had zero visual effect and the page actually rendered with the
// same obsidian theme as everywhere else via style.css's global `body`/
// `.snippet-card` rules). Now wrapped in AppShell like every other
// authenticated page, instead of standing alone without a sidebar.
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
    <AppShell title="Favorites" maxWidth="896px">
      <Header title="My Favorites" backTo="/" />

      {loading && <Loader label="Loading favorites..." />}
      {!loading && error && (
        <p className="text-muted">Error loading favorites. Is the backend running?</p>
      )}
      {!loading && !error && favorites.length === 0 && (
        <EmptyState
          className="mt-4"
          icon={Star}
          title="Your journey starts here"
          description="Star a snippet from today's feed to start building your collection."
        />
      )}
      {!loading &&
        !error &&
        favorites.map((snippet) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            showBadges={false}
            actions={
              <Button variant="secondary" size="sm" onClick={() => handleRemove(snippet.id)} className="gap-1.5">
                <Star size={13} fill="currentColor" aria-hidden="true" />
                Remove
              </Button>
            }
          />
        ))}
    </AppShell>
  );
}
