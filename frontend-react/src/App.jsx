import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Loader from "./components/Loader/Loader";

// Route-level code splitting: each page is its own chunk, fetched only
// when that route is visited, instead of one bundle carrying every page
// (AddSnippet's AI/bulk-import logic, Dashboard's heatmap math, etc.) up
// front. The vanilla app got this for free by being separate HTML files;
// this is the SPA equivalent.
const Login = lazy(() => import("./pages/Login"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MySnippets = lazy(() => import("./pages/MySnippets"));
const Favorites = lazy(() => import("./pages/Favorites"));
const AddSnippet = lazy(() => import("./pages/AddSnippet"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Route map:
//  - "/login" and "/signup" both render Login (one combined form with both
//    actions on it — see that file's comment) so each has its own clean,
//    bookmarkable URL instead of the old shared "/auth.html". The backend's
//    Google OAuth callback redirects to `${FRONTEND_URL}/login?token=...`.
//  - "/" (Home) allows guests, same as the original's `!token && !isGuest`
//    check.
//  - Dashboard / MySnippets / Favorites / AddSnippet / Profile require a
//    real token — guests are bounced to /login.
//  - "/calendar" and "/privacy" are unguarded, same as calendar.html and
//    privacy.html originally were.
export default function App() {
  return (
    <Suspense fallback={<Loader label="Loading..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute allowGuest>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mysnippets"
          element={
            <ProtectedRoute>
              <MySnippets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add"
          element={
            <ProtectedRoute>
              <AddSnippet />
            </ProtectedRoute>
          }
        />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
