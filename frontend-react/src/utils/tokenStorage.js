// Backs the Login page's "Remember Me" toggle. The token can live in either
// localStorage (persists across browser restarts — the default, and the
// only behavior that existed before this) or sessionStorage (cleared when
// the tab/browser closes) depending on the user's choice at login. Every
// reader of the token (api.js's request interceptor, AuthContext's initial
// state) must check both, or an unchecked "Remember Me" session would
// silently stop authenticating because the token "isn't in localStorage".
export function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function setToken(token, remember) {
  if (remember) {
    localStorage.setItem("token", token);
    sessionStorage.removeItem("token");
  } else {
    sessionStorage.setItem("token", token);
    localStorage.removeItem("token");
  }
}

export function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}
