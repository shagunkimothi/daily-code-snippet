import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Prism from "../utils/prismSetup";
import { difficultyVariant } from "../utils/difficultyVariant";
import { useAuth } from "../hooks/useAuth";
import { useFetch } from "../hooks/useFetch";
import { useToast } from "../hooks/useToast";
import * as snippetService from "../services/snippetService";
import Footer from "../components/Footer/Footer";
import Toast from "../components/Toast/Toast";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Switch from "../components/ui/Switch";
import Badge from "../components/ui/Badge";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The panel that used to be a marketing pitch ("Learn one snippet a day.
// Build real habits.") is now the product itself: today's actual snippet,
// syntax-highlighted, right there — because the answer to "why would I sign
// up" should be the snippet in front of you, not ad copy about it.
function TodaysConceptPreview() {
  const { data, loading } = useFetch(() => snippetService.getDailySnippet(), []);
  const codeRef = useRef(null);

  useEffect(() => {
    if (data && codeRef.current) Prism.highlightElement(codeRef.current);
  }, [data]);

  const lang = (data?.language || "javascript").toLowerCase();

  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-primary">
        Today&apos;s concept
      </p>

      {loading ? (
        <div className="h-44 animate-pulse rounded-lg bg-card-elevated" />
      ) : data ? (
        <>
          <h2 className="mb-2.5 font-mono text-lg font-bold leading-snug text-text lg:text-xl">{data.title}</h2>
          <div className="relative overflow-hidden rounded-lg border border-border-card">
            <pre className="!m-0 max-h-[190px] overflow-hidden !rounded-lg">
              <code ref={codeRef} className={`language-${lang}`}>
                {data.code}
              </code>
            </pre>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-bg-secondary to-transparent" />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="primary" size="sm">
              {data.language}
            </Badge>
            <Badge variant={difficultyVariant(data.difficulty)} size="sm">
              {data.difficulty}
            </Badge>
            <span className="text-xs text-muted">☕ {data.reading_time_minutes} min read</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">A new concept lands here every morning.</p>
      )}
    </div>
  );
}

// Ported from the original auth.html + auth.js, which had both login and
// signup as independent onClick actions on one screen rather than a single
// form submit — preserved here as one primary action + a secondary "do the
// other thing instead" link.
export default function Login() {
  const { login, signup, googleLogin, continueAsGuest } = useAuth();
  const location = useLocation();
  const isSignup = location.pathname === "/signup";
  const { toast, showToast, dismissToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setBusy(true);
    try {
      await login(email, password, remember);
    } catch (err) {
      showToast(err.message || "Login failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!validate()) return;
    setBusy(true);
    try {
      await signup(email, password);
      showToast("Account created — please log in.", "success");
    } catch (err) {
      showToast(err.message || "Signup failed", "error");
    } finally {
      setBusy(false);
    }
  }

  const primaryAction = isSignup ? handleSignup : handleLogin;
  const primaryLabel = isSignup ? "Sign Up" : "Login";
  const secondaryAction = isSignup ? handleLogin : handleSignup;
  const secondaryLabel = isSignup ? "Log in instead" : "Create an account instead";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* What you get every morning — shown, not described. Visible at every
          breakpoint (stacked above the form on mobile) since it's the
          actual answer to "why sign up," not decoration to hide when space
          is tight. */}
      <div className="flex flex-col justify-center bg-bg-secondary px-6 py-10 sm:px-10 lg:w-1/2 lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-bold text-[#03080e] shadow-primary lg:h-12 lg:w-12 lg:text-xl">
            {"</>"}
          </div>
          <TodaysConceptPreview />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px] rounded-2xl border border-border-card bg-card p-8 shadow-lg sm:p-10"
        >
          <h1 className="mb-1.5 font-mono text-2xl font-extrabold tracking-tight text-text">DailyCode</h1>
          <p className="mb-7 text-sm text-text-secondary">
            {isSignup ? "Start your streak today." : "Pick up where your streak left off."}
          </p>

          <div className="mb-4 flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="text-muted hover:text-text"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              }
            />
          </div>

          {!isSignup && (
            <div className="mb-5">
              <Switch checked={remember} onChange={setRemember} label="Remember me" />
            </div>
          )}

          <Button variant="primary" size="lg" loading={busy} onClick={primaryAction} className="mb-3 w-full">
            {primaryLabel}
          </Button>
          <button
            type="button"
            onClick={secondaryAction}
            disabled={busy}
            className="mb-5 w-full text-center text-sm font-medium text-text-secondary hover:text-primary disabled:opacity-60"
          >
            {secondaryLabel}
          </button>

          <p className="mb-6 text-center text-[0.8rem] text-text-secondary">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Log in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </p>

          <div className="my-6 flex items-center gap-3 font-mono text-[0.7rem] font-bold uppercase tracking-wider text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            OR
          </div>

          <Button variant="secondary" size="lg" onClick={googleLogin} className="mb-4 w-full gap-2.5">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png"
              width="18"
              alt=""
              aria-hidden="true"
            />
            {isSignup ? "Sign up with Google" : "Sign in with Google"}
          </Button>

          <button
            type="button"
            onClick={continueAsGuest}
            className="w-full bg-transparent text-center text-sm text-text-secondary hover:text-primary"
          >
            Skip login and continue as Guest &rarr;
          </button>
        </motion.div>
      </div>

      <Footer showLinks={false} />
      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
