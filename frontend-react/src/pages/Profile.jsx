import { useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/Layout/AppShell";
import Header from "../components/Header/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { decodeJwtPayload } from "../utils/jwt";

// Wrapped in <ProtectedRoute> without allowGuest (same guard as Dashboard/
// Favorites/MySnippets/AddSnippet), so only real-token users ever reach
// this — no guest-state branch needed.
//
// There's no dedicated backend profile endpoint (only /dashboard/me's stats
// and /auth/*'s token issuance), so this reads the email straight out of the
// JWT payload every login/signup/Google callback already embeds
// ({"sub": user.id, "email": user.email}) — display-only, never used for
// auth decisions.
export default function Profile() {
  const { token, logout } = useAuth();

  const email = useMemo(() => decodeJwtPayload(token)?.email ?? null, [token]);
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <AppShell title="Profile" maxWidth="880px">
      <Header title="Profile" backTo="/" />

      <Card padding="lg">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-[#03080e] shadow-primary">
            {initial}
          </div>
          <div>
            <p className="font-mono text-base font-bold tracking-tight text-text">{email || "Signed in"}</p>
            <p className="text-xs text-muted">Email / Google account</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button as="link" to="/dashboard" variant="secondary">
            Go to Dashboard
          </Button>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-muted">
        Want to shape how DailyCode looks? <Link to="/" className="text-primary hover:underline">Pick a theme</Link> from the sidebar.
      </p>
    </AppShell>
  );
}
