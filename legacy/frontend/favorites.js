import CONFIG from './config.js';

document.addEventListener("DOMContentLoaded", async () => {
  const favoritesList = document.getElementById("favoritesList");
  const token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  favoritesList.innerHTML = `<p class="text-gray-400">Loading favorites...</p>`;

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/favorites/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Cache-Control": "no-cache"
      },
      cache: "no-store"
    });

    if (!res.ok) throw new Error(`Error ${res.status}`);

    const favorites = await res.json();

    if (!favorites.length) {
      favoritesList.innerHTML = `<p class="text-gray-400">You haven't saved any favorites yet.</p>`;
      return;
    }

    favoritesList.innerHTML = "";

    favorites.forEach(snippet => {
      if (!snippet || !snippet.title || !snippet.code) return;

      const card = document.createElement("div");
      card.className = "snippet-card bg-slate-800 p-4 rounded";
      card.dataset.id = snippet.id;

      card.innerHTML = `
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold">${snippet.title}</h3>
          <span class="text-sm text-gray-400">${snippet.language}</span>
        </div>
        <pre class="rounded"><code class="language-${(snippet.language || "javascript").toLowerCase()}">${snippet.code}</code></pre>
        <p class="text-sm text-gray-400 mt-2">${snippet.explanation || ""}</p>
        <div class="mt-3">
          <button class="btn-secondary remove-fav" data-id="${snippet.id}">
            Remove from Favorites
          </button>
        </div>
      `;

      favoritesList.appendChild(card);
    });

    if (window.Prism) Prism.highlightAll();

    document.querySelectorAll(".remove-fav").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const snippetId = e.target.dataset.id;
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/favorites/${snippetId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (res.ok) {
            const card = favoritesList.querySelector(`[data-id="${snippetId}"]`);
            if (card) card.remove();
            localStorage.setItem("favoritesChanged", "true");

            if (!favoritesList.children.length) {
              favoritesList.innerHTML = `<p class="text-gray-400">You haven't saved any favorites yet.</p>`;
            }
          }
        } catch (err) {
          console.error("Remove favorite error:", err);
        }
      });
    });

  } catch (err) {
    console.error("Favorites fetch error:", err);
    favoritesList.innerHTML = `<p class="text-gray-400">Error loading favorites. Is the backend running?</p>`;
  }
});