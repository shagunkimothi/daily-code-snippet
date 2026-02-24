document.addEventListener("DOMContentLoaded", async () => {

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "auth.html";
    return;
  }

  try {

    const res = await fetch("http://127.0.0.1:8000/dashboard/me", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();

    document.getElementById("statSnippets").innerText = data.total_snippets;
    document.getElementById("statPublic").innerText = data.public_count;
    document.getElementById("statPrivate").innerText = data.private_count;
    document.getElementById("statFavorites").innerText = data.favorite_count;

    document.getElementById("totalSnippets").innerText = data.total_snippets;

    if (data.latest_snippet) {
      const activityBox = document.querySelector(".dashboard-section");
      activityBox.innerHTML = `
        <h3>Latest Snippet</h3>
        <p>📝 ${data.latest_snippet}</p>
        <p>🔥 Created this week: ${data.created_this_week}</p>
      `;
    }

  } catch (err) {
    console.error("Dashboard fetch error:", err);
  }

});
document.getElementById("statWeek").innerText = data.created_this_week;