import axios from "axios";

// Vite injects this from .env.development / .env.production (or a
// .env.local override) at build time — no hostname sniffing, no hardcoded
// backend URLs in source. See frontend-react/.env.example.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  // Fail loudly at build/boot time rather than silently sending requests to
  // a broken relative URL.
  throw new Error(
    "VITE_API_BASE_URL is not set. Copy .env.example to .env.local or check .env.development/.env.production."
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the JWT (if present) to every outgoing request, mirroring the
// `Authorization: Bearer ${token}` header the vanilla JS added manually
// to each authenticated fetch() call.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized error handling so every page's `catch (err) { ... err.message }`
// gets a consistent, readable message instead of each call site re-deriving
// it from `err.response.data.detail` (FastAPI's error shape) independently.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Request never reached the server: DNS failure, backend down, CORS
      // rejection, offline, etc.
      error.message = "Network error — check your connection and that the backend is reachable.";
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);

    // Only treat this as "your session expired" when the request actually
    // carried a token and got rejected — NOT for e.g. a plain wrong-password
    // /auth/login attempt, which is also a 401 but never had a token to
    // begin with and must not clear an active guest session or bounce the
    // user off the login page they're already on.
    if (status === 401 && hadAuthHeader) {
      localStorage.removeItem("token");
      localStorage.removeItem("isGuest");
      if (window.location.pathname !== "/auth.html") {
        window.location.href = "/auth.html";
      }
    }

    const detail = data?.detail;
    if (Array.isArray(detail)) {
      // FastAPI 422 validation errors: [{ loc, msg, type }, ...]
      error.message = detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
    } else if (typeof detail === "string") {
      error.message = detail;
    } else if (status === 401) {
      error.message = "Your session has expired. Please log in again.";
    } else if (status === 403) {
      error.message = "You don't have permission to do this.";
    } else if (status === 404) {
      error.message = "Not found.";
    } else if (status >= 500) {
      error.message = "Server error — please try again later.";
    }

    return Promise.reject(error);
  }
);

export default api;
