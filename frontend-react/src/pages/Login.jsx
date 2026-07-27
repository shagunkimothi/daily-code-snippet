import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import Footer from "../components/Footer/Footer";

// 1:1 port of auth.html + auth.js. Plain buttons (not a <form> submit),
// same as the original — login/signup are two independent onClick actions.
export default function Login() {
  const { login, signup, googleLogin, continueAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!email || !password) return alert("Please fill in all fields");
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      alert(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup() {
    if (!email || !password) return alert("Please fill in all fields");
    setBusy(true);
    try {
      await signup(email, password);
      alert("Signup successful! Please log in.");
    } catch (err) {
      alert(err.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg [background-image:radial-gradient(rgba(0,212,255,0.032)_1px,transparent_1px)] [background-size:26px_26px]">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-xl border border-border-card bg-card p-10 shadow-lg animate-fadeUp">
        <h1 className="mb-2 font-mono text-2xl font-extrabold tracking-tight text-text">
          🧩 Daily Snippet
        </h1>
        <p className="mb-8 text-text-secondary">Master a new pattern every day.</p>

        <input
          type="email"
          placeholder="Email Address"
          aria-label="Email Address"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3"
        />
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3"
        />

        <div className="mb-6 flex gap-2.5">
          <button
            onClick={handleLogin}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-md bg-primary px-[1.1rem] py-[0.55rem] font-sans text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? "Please wait..." : "Login"}
          </button>
          <button
            onClick={handleSignup}
            disabled={busy}
            className="inline-flex flex-1 items-center justify-center gap-[7px] rounded-md border border-border-card bg-card px-[1.1rem] py-[0.55rem] font-sans text-[0.84rem] font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary disabled:opacity-60"
          >
            {busy ? "Please wait..." : "Signup"}
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 font-mono text-[0.74rem] font-bold uppercase tracking-wider text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          OR
        </div>

        <button
          onClick={googleLogin}
          className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-md border border-border-card bg-card-elevated px-4 py-[0.65rem] text-sm font-semibold text-text shadow-sm hover:border-border-hover hover:bg-primary-subtle"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/4a/Logo_2013_Google.png"
            width="20"
            alt="Google"
          />
          Sign in with Google
        </button>

        <button
          onClick={continueAsGuest}
          className="w-full bg-transparent text-center text-sm text-text-secondary hover:text-primary"
        >
          Skip login and continue as Guest &rarr;
        </button>
      </div>

      <Footer fixed />
    </div>
  );
}
