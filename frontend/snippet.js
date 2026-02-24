document.addEventListener("DOMContentLoaded", async () => {

    const galleryList = document.getElementById("galleryList");
    const loader = document.getElementById("loader");
    const token = localStorage.getItem("token");

    /* =========================
       1. THEME LOGIC
    ========================= */

    const themeBtn = document.getElementById("themeToggle");

    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light");
        themeBtn.innerText = "☀️";
    } else {
        themeBtn.innerText = "🌙";
    }

    themeBtn.onclick = () => {
        const isLight = document.body.classList.toggle("light");
        themeBtn.innerText = isLight ? "☀️" : "🌙";
        localStorage.setItem("theme", isLight ? "light" : "dark");
    };

    /* =========================
       2. FETCH SNIPPETS
    ========================= */

    const API_URL = token
        ? "http://127.0.0.1:8000/snippets/private"
        : "http://127.0.0.1:8000/snippets/public";

    const headers = token
        ? { "Authorization": `Bearer ${token}` }
        : {};

    try {
        const response = await fetch(API_URL, { headers });
        const snippets = await response.json();

        loader.style.display = "none";

        if (snippets.length === 0) {
            galleryList.innerHTML =
                `<p class="explanation">No snippets found in the database.</p>`;
            return;
        }

        /* =========================
           3. LOAD USER FAVORITES
        ========================= */

        let favoriteIds = [];

        if (token) {
            const favRes = await fetch(
                "http://127.0.0.1:8000/favorites/me",
                { headers }
            );
            const favSnippets = await favRes.json();
            favoriteIds = favSnippets.map(f => f.id);
        }

        /* =========================
           4. RENDER CARDS
        ========================= */

        snippets.forEach(s => {

            const card = document.createElement("div");
            card.className = "snippet-card";
            card.style.marginBottom = "2rem";

            const isFavorited = favoriteIds.includes(s.id);

            card.innerHTML = `
                <div class="snippet-header">
                    <h3 class="snippet-title">${s.title}</h3>
                    <div>
                        <span class="snippet-meta">
                            ${s.language} • ${s.is_public ? "🌐 Public" : "🔒 Private"}
                        </span>
                        ${
                            token
                            ? `<button class="fav-btn" data-id="${s.id}">
                                   ${isFavorited ? "⭐" : "☆"}
                               </button>`
                            : ""
                        }
                    </div>
                </div>

                <pre><code class="language-${s.language.toLowerCase()}">
${s.code}
                </code></pre>

                <p class="explanation">${s.explanation || ""}</p>
            `;

            galleryList.appendChild(card);
        });

        /* =========================
           5. FAVORITE TOGGLE
        ========================= */

        if (token) {
            document.querySelectorAll(".fav-btn").forEach(btn => {

                btn.addEventListener("click", async () => {

                    const snippetId = btn.getAttribute("data-id");
                    const isFavorited = btn.textContent === "⭐";

                    const method = isFavorited ? "DELETE" : "POST";

                    const res = await fetch(
                        `http://127.0.0.1:8000/favorites/${snippetId}`,
                        {
                            method,
                            headers
                        }
                    );

                    if (res.ok) {
                        btn.textContent = isFavorited ? "☆" : "⭐";
                    }
                });

            });
        }

        /* =========================
           6. HIGHLIGHT CODE
        ========================= */

        if (window.Prism) Prism.highlightAll();

    } catch (error) {
        loader.innerText =
            "Error loading snippets. Is the backend running?";
        console.error("Fetch error:", error);
    }
});
