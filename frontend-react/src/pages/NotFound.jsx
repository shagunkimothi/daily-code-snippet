import Button from "../components/ui/Button";

// New page — the legacy multi-page site relied on the static host's own
// 404 for unknown URLs; an SPA needs an explicit catch-all route instead.
export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="font-mono text-5xl font-extrabold text-primary">404</h1>
      <p className="text-text-secondary">This page doesn&apos;t exist — but today&apos;s snippet does.</p>
      <Button as="link" to="/" variant="primary" className="mt-4">
        ← Back to today&apos;s snippet
      </Button>
    </div>
  );
}
