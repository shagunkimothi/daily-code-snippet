import { Link } from "react-router-dom";

// Two variants seen in the original app: index.html's full site-footer
// (copyright + GitHub + Privacy Policy links) and auth.html's simpler
// fixed-to-viewport-bottom copyright line.
export default function Footer({ fixed = false, showLinks = true }) {
  if (fixed) {
    return (
      <footer className="fixed bottom-0 w-full bg-transparent py-2.5 text-center text-xs text-muted">
        © 2026 Daily Code Snippet · Built by Shagun Kimothi
      </footer>
    );
  }

  return (
    <footer className="site-footer mt-8 border-t border-border pb-4 pt-6 text-center text-xs text-muted">
      © 2026 Daily Code Snippet · Built by Shagun Kimothi
      {showLinks && (
        <>
          {" · "}
          <a
            href="https://github.com/shagunkimothi/daily-code-snippet"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GitHub
          </a>
          {" · "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </>
      )}
    </footer>
  );
}
