import { createContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as authService from "../services/authService";
import * as userService from "../services/userService";
import { clearToken as clearStoredToken, getToken as getStoredToken, setToken as storeToken } from "../utils/tokenStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem("isGuest") === "true"
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Runs once right after a real (non-guest) login/signup session starts —
  // not on every app load — since onboarding, once completed, stays
  // completed forever. Fails open (lands on "/") rather than blocking
  // access if the check itself errors; onboarding is meant to reduce
  // friction, not gate the product.
  async function redirectAfterAuth() {
    try {
      const me = await userService.getMe();
      navigate(me.onboarding_completed ? "/" : "/onboarding", { replace: true });
    } catch {
      navigate("/", { replace: true });
    }
  }

  // Consolidates two pieces of legacy logic that used to live in separate
  // files: auth.js's IIFE (Google OAuth ?token= handoff + auth-page guard)
  // and Sidebar.js's DOMContentLoaded handler (also caught ?token= on other
  // pages). Runs once per navigation so it works no matter which route the
  // OAuth redirect (or a stale bookmark) lands on.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get("token");

    if (googleToken) {
      // OAuth is a full-page redirect with no "Remember Me" checkbox in the
      // flow, so it always persists (matches the prior always-localStorage
      // behavior).
      storeToken(googleToken, true);
      localStorage.removeItem("isGuest");
      setToken(googleToken);
      setIsGuest(false);
      window.history.replaceState({}, document.title, location.pathname);
      redirectAfterAuth();
      return;
    }

    const authed = !!getStoredToken() || localStorage.getItem("isGuest") === "true";
    const onAuthPage = location.pathname === "/login" || location.pathname === "/signup";
    if (onAuthPage && authed && !params.has("force")) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Bridges api.js's response interceptor (outside the component tree, no
  // access to useNavigate) back into an in-SPA redirect instead of the hard
  // window.location.href reload it used to do.
  useEffect(() => {
    function handleSessionExpired() {
      setToken(null);
      setIsGuest(false);
      navigate("/login");
    }
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () =>
      window.removeEventListener("auth:session-expired", handleSessionExpired);
  }, [navigate]);

  async function login(email, password, remember = true) {
    const data = await authService.login(email, password);
    storeToken(data.access_token, remember);
    localStorage.removeItem("isGuest");
    setToken(data.access_token);
    setIsGuest(false);
    await redirectAfterAuth();
  }

  async function signup(email, password) {
    return authService.signup(email, password);
  }

  function continueAsGuest() {
    localStorage.setItem("isGuest", "true");
    clearStoredToken();
    setIsGuest(true);
    setToken(null);
    navigate("/");
  }

  function logout() {
    clearStoredToken();
    localStorage.removeItem("isGuest");
    setToken(null);
    setIsGuest(false);
    navigate("/login");
  }

  function googleLogin() {
    window.location.href = authService.getGoogleLoginUrl();
  }

  const value = {
    token,
    isGuest,
    isAuthenticated: !!token || isGuest,
    login,
    signup,
    continueAsGuest,
    logout,
    googleLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
