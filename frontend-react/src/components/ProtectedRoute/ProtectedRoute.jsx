import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Two guard flavors from the original app:
//  - Dashboard / MySnippets / AddSnippet / Favorites required a real token
//    (`if (!token) location.href = "auth.html"`) — guests were turned away.
//  - Home allowed guests too (`if (!token && !isGuest) ...`).
// Calendar had no guard at all, so it simply isn't wrapped in this.
export default function ProtectedRoute({ children, allowGuest = false }) {
  const { token, isGuest } = useAuth();
  const authorized = allowGuest ? Boolean(token || isGuest) : Boolean(token);

  if (!authorized) {
    return <Navigate to="/auth.html" replace />;
  }

  return children;
}
