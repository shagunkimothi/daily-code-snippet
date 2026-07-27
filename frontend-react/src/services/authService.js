import api, { API_BASE_URL } from "./api";

// POST /auth/login expects x-www-form-urlencoded { username, password }.
// Passing URLSearchParams as the axios body auto-sets that content type,
// matching the original fetch() call in auth.js exactly.
export async function login(email, password) {
  const res = await api.post(
    "/auth/login",
    new URLSearchParams({ username: email, password })
  );
  return res.data; // { access_token, ... }
}

export async function signup(email, password) {
  const res = await api.post("/auth/signup", { email, password });
  return res.data;
}

// Full-page redirect into the backend's Google OAuth flow — not an XHR call.
export function getGoogleLoginUrl() {
  return `${API_BASE_URL}/auth/google/login`;
}
