import { createContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as authService from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem("isGuest") === "true"
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Consolidates two pieces of legacy logic that used to live in separate
  // files: auth.js's IIFE (Google OAuth ?token= handoff + auth.html guard)
  // and Sidebar.js's DOMContentLoaded handler (also caught ?token= on other
  // pages). Runs once per navigation so it works no matter which route the
  // OAuth redirect (or a stale bookmark) lands on.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get("token");

    if (googleToken) {
      localStorage.setItem("token", googleToken);
      localStorage.removeItem("isGuest");
      setToken(googleToken);
      setIsGuest(false);
      window.history.replaceState({}, document.title, location.pathname);
      navigate("/", { replace: true });
      return;
    }

    const authed = !!localStorage.getItem("token") || localStorage.getItem("isGuest") === "true";
    if (
      location.pathname === "/auth.html" &&
      authed &&
      !params.has("force")
    ) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  async function login(email, password) {
    const data = await authService.login(email, password);
    localStorage.setItem("token", data.access_token);
    localStorage.removeItem("isGuest");
    setToken(data.access_token);
    setIsGuest(false);
    navigate("/");
  }

  async function signup(email, password) {
    return authService.signup(email, password);
  }

  function continueAsGuest() {
    localStorage.setItem("isGuest", "true");
    localStorage.removeItem("token");
    setIsGuest(true);
    setToken(null);
    navigate("/");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("isGuest");
    setToken(null);
    setIsGuest(false);
    navigate("/auth.html");
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
