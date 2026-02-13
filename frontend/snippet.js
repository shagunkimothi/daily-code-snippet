document.addEventListener("DOMContentLoaded", async () => {
    const galleryList = document.getElementById("galleryList");
    const loader = document.getElementById("loader");
    const token = localStorage.getItem("token");

    // 1. Theme Logic
    const themeBtn = document.getElementById("themeToggle");
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeBtn.innerText = "☀️";
    }
    themeBtn.onclick = () => {
        const isDark = document.body.classList.toggle("dark-mode");
        themeBtn.innerText = isDark ? "☀️" : "🌙";
        localStorage.setItem("theme", isDark ? "dark" : "light");
    };

    // 2. Fetch from Database
    // Use PRIVATE_API if logged in to see your private snippets, otherwise PUBLIC_API
    const API_URL = token ? "http://127.0.0.1:8000/snippets/private" : "http://127.0.0.1:8000/snippets/public";
    const headers = token ? { "Authorization": `Bearer ${token}` } : {};

    try {
        const response = await fetch(API_URL, { headers });
        const snippets = await response.json();

        loader.style.display = "none";

        if (snippets.length === 0) {
            galleryList.innerHTML = `<p class="explanation">No snippets found in the database.</p>`;
            return;
        }

        // 3. Render each snippet from DB
        snippets.forEach(s => {
            const card = document.createElement("div");
            card.className = "snippet-card";
            card.style.marginBottom = "2rem";

            card.innerHTML = `
                <div class="snippet-header">
                    <h3 class="snippet-title">${s.title}</h3>
                    <span class="snippet-meta">${s.language} • ${s.is_public ? "🌐 Public" : "🔒 Private"}</span>
                </div>
                <pre><code class="language-${s.language.toLowerCase()}">${s.code}</code></pre>
                <p class="explanation">${s.explanation || ""}</p>
            `;
            galleryList.appendChild(card);
        });

        // 4. Highlight Code
        if (window.Prism) Prism.highlightAll();

    } catch (error) {
        loader.innerText = "Error loading snippets. Is the backend running?";
        console.error("Fetch error:", error);
    }
});