import { Component } from "react";

// The vanilla app couldn't crash mid-page — each page was its own HTML
// document. An SPA can, so one render error shouldn't blank the whole
// screen. Class component because error boundaries have no hook
// equivalent (getDerivedStateFromError/componentDidCatch are class-only).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="font-mono text-2xl font-bold text-text">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">
            An unexpected error occurred while rendering this page. Try reloading — if it keeps happening, please
            let us know.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-[#03080e] shadow-primary hover:bg-primary-hover"
          >
            🔄 Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
