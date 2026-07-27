import { useNavigate } from "react-router-dom";

// The "← Go Back + title + right-side action" bar that was duplicated
// (with identical .top-bar / .btn-back / .page-title styling) across
// dashboard.html, Mysnippets.html and addnewsnippet.html.
export default function Header({ title, showBack = true, backTo, actions }) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            className="inline-flex items-center gap-[7px] rounded-md border border-border-card bg-card px-4 py-[0.48rem] font-sans text-[0.82rem] font-semibold text-text-secondary hover:border-border-hover hover:bg-primary-subtle hover:text-primary"
          >
            ← Go Back
          </button>
        )}
        {title && (
          <h2 className="font-mono text-[1.35rem] font-extrabold tracking-tight text-text">
            {title}
          </h2>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5">{actions}</div>}
    </div>
  );
}
