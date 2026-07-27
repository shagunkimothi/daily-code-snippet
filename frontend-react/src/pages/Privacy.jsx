import { Link } from "react-router-dom";

// 1:1 content port of privacy.html — same copy, same section order.
export default function Privacy() {
  return (
    <div className="mx-auto max-w-[720px] px-6 py-12 text-text">
      <Link
        to="/"
        className="mb-8 inline-block rounded-md border border-border bg-card px-[18px] py-2 text-sm text-text hover:border-primary hover:text-primary"
      >
        ← Back to App
      </Link>

      <h1 className="mb-2 text-[28px] font-bold">🔐 Privacy Policy</h1>
      <p className="mb-8 text-xs text-muted">Last updated: March 2026</p>

      <p className="mb-4 text-sm leading-[1.8] text-muted">
        Welcome to <strong>Daily Code Snippet</strong>. This Privacy Policy explains how we collect, use, and
        protect your information when you use our application.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">1. Information We Collect</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        When you sign in with Google, we collect your <strong>email address</strong> and{" "}
        <strong>Google account ID</strong> solely to create and identify your account. We do not collect your
        password, phone number, or any other personal data from Google.
      </p>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        When you use the app, we store the code snippets, tags, and favorites you create.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">2. How We Use Your Information</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        We use your email address to identify your account and associate your snippets and favorites with you. We
        do not sell, share, or rent your personal information to any third parties.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">3. Google OAuth</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        We use Google OAuth 2.0 for authentication. By signing in with Google, you agree to Google&apos;s{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noreferrer"
          className="text-primary"
        >
          Privacy Policy
        </a>
        . We only request access to your basic profile (email and name) and do not access any other Google services
        or data.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">4. Data Storage</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        Your data is stored securely in a PostgreSQL database hosted on{" "}
        <a href="https://render.com" target="_blank" rel="noreferrer" className="text-primary">
          Render
        </a>
        . We take reasonable measures to protect your data from unauthorized access.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">5. Cookies &amp; Local Storage</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        We use browser <strong>localStorage</strong> to store your authentication token so you stay logged in
        between sessions. No third-party tracking cookies are used.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">6. Data Deletion</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        You can request deletion of your account and all associated data by contacting us at{" "}
        <a href="mailto:shagunkimothi@gmail.com" className="text-primary">
          shagunkimothi@gmail.com
        </a>
        . We will delete your data within 30 days of your request.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">7. Changes to This Policy</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        We may update this Privacy Policy from time to time. Any changes will be posted on this page with an
        updated date.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-primary">8. Contact</h2>
      <p className="mb-4 text-sm leading-[1.8] text-muted">
        If you have any questions about this Privacy Policy, please contact us at{" "}
        <a href="mailto:shagunkimothi@gmail.com" className="text-primary">
          shagunkimothi@gmail.com
        </a>
        .
      </p>

      <p className="mt-8 text-xs text-muted">© 2026 Daily Code Snippet · Built by Shagun Kimothi</p>
    </div>
  );
}
