import { Link } from "react-router-dom";

// New page — the legacy multi-page site relied on the static host's own
// 404 for unknown URLs; an SPA needs an explicit catch-all route instead.
export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="font-mono text-5xl font-extrabold text-primary">404</h1>
      <p className="text-text-secondary">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center gap-[7px] rounded-md bg-primary px-[1.1rem] py-[0.55rem] text-[0.84rem] font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
