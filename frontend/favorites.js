document.addEventListener("DOMContentLoaded", () => {
  const favoritesList = document.getElementById("favoritesList");

  let favorites = [];

  try {
    favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  } catch (err) {
    favorites = [];
  }

  if (!favorites.length) {
    favoritesList.innerHTML = `
      <p class="text-gray-400">
        You haven't saved any favorites yet.
      </p>`;
    return;
  }

  favorites.forEach(snippet => {

    // Safety check
    if (!snippet || !snippet.title || !snippet.code) return;

    const card = document.createElement("div");
    card.className = "snippet-card bg-slate-800 p-4 rounded";

    card.innerHTML = `
      <div class="flex justify-between items-center mb-2">
        <h3 class="font-semibold">${snippet.title}</h3>
        <span class="text-sm text-gray-400">${snippet.language}</span>
      </div>

      <pre class="rounded">
        <code class="language-${(snippet.language || "javascript").toLowerCase()}">
${snippet.code}
        </code>
      </pre>

      <p class="text-sm text-gray-400 mt-2">
        ${snippet.explanation || ""}
      </p>

      <div class="mt-3">
        <button class="btn-secondary remove-fav" data-id="${snippet.id}">
          Remove from Favorites
        </button>
      </div>
    `;

    favoritesList.appendChild(card);
  });

  Prism.highlightAll();

  // Remove logic
  document.querySelectorAll(".remove-fav").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = parseInt(e.target.dataset.id);

      const updatedFavs = favorites.filter(f => f.id !== id);
      localStorage.setItem("favorites", JSON.stringify(updatedFavs));

      location.reload();
    });
  });
});
