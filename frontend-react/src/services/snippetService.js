import api from "./api";

export async function getTags() {
  const res = await api.get("/tags");
  return res.data;
}

// Mirrors script.js's runSearch(): page/per_page always sent, the rest
// only when non-empty so the querystring shape matches exactly.
export async function searchSnippets({ page = 1, perPage = 12, q, language, difficulty, tag }) {
  const params = { page, per_page: perPage };
  if (q) params.q = q;
  if (language) params.language = language;
  if (difficulty) params.difficulty = difficulty;
  if (tag) params.tag = tag;

  const res = await api.get("/snippets/search", { params });
  return res.data; // { total, page, snippets }
}

export async function getDailySnippet() {
  const res = await api.get("/snippets/daily");
  return res.data;
}

export async function getRandomSnippet() {
  const res = await api.get("/snippets/random");
  return res.data;
}

export async function getMySnippets() {
  const res = await api.get("/snippets/mine");
  return res.data;
}

// Used by Calendar for the logged-in view. Preserved as-is from calendar.js —
// the backend does not currently expose this route (pre-existing, not touched).
export async function getPrivateSnippets() {
  const res = await api.get("/snippets/private");
  return res.data;
}

// Used by Calendar for the guest view. Same pre-existing caveat as above.
export async function getPublicSnippets() {
  const res = await api.get("/snippets/public");
  return res.data;
}

export async function addSnippet(payload) {
  const res = await api.post("/snippets/add", payload);
  return res.data;
}

export async function generateAiSnippet({ topic, language }) {
  const res = await api.post("/snippets/generate-ai", { topic, language });
  return res.data;
}

// Used by MySnippets' visibility toggle. Preserved as-is from Mysnippets.html —
// the backend does not currently expose this route (pre-existing, not touched).
export async function updateSnippetVisibility(id, isPublic) {
  const res = await api.patch(`/snippets/${id}/visibility`, { is_public: isPublic });
  return res.data;
}

// Used by MySnippets' delete button. Same pre-existing caveat as above.
export async function deleteSnippet(id) {
  const res = await api.delete(`/snippets/${id}`);
  return res.data;
}

export async function getFavorites() {
  const res = await api.get("/favorites/me");
  return res.data;
}

export async function addFavorite(id) {
  const res = await api.post(`/favorites/${id}`);
  return res.data;
}

export async function removeFavorite(id) {
  const res = await api.delete(`/favorites/${id}`);
  return res.data;
}
