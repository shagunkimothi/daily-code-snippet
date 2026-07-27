import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/dashboard", icon: "🏠", label: "Dashboard", authOnly: true },
  { to: "/calendar", icon: "📅", label: "Calendar", authOnly: false },
  { to: "/favorites", icon: "⭐", label: "Favorites", authOnly: true },
];

const navItemClass = ({ isActive }) =>
  `flex w-full items-center gap-2.5 rounded-[10px] px-[11px] py-2.5 text-left font-sans text-sm font-medium ${
    isActive
      ? "bg-primary text-white shadow-[0_3px_12px_var(--primary-glow)]"
      : "text-sidebar-text hover:bg-sidebar-hover hover:text-text"
  }`;

// Reflects the exact same three-item nav (Dashboard / Calendar / Favorites)
// that was duplicated inline into index.html, dashboard.html and
// Mysnippets.html — the standalone Sidebar.html's extra "Library" item was
// never actually wired into any real page, so it's intentionally omitted.
export default function Sidebar() {
  const { token } = useAuth();

  return (
    <aside className="sticky top-0 flex h-screen w-[240px] flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar-bg">
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-sidebar-border px-5 pb-[18px] pt-[22px]">
          <div className="flex items-center gap-[11px]">
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] bg-primary text-[13px] font-bold text-white shadow-[0_4px_12px_var(--primary-glow)]">
              {"</>"}
            </div>
            <h1 className="text-base font-bold tracking-tight text-text">DailyCode</h1>
          </div>

          <nav className="mt-3.5 flex flex-col gap-0.5">
            {navItems
              .filter((item) => !item.authOnly || token)
              .map((item) => (
                <NavLink key={item.to} to={item.to} className={navItemClass}>
                  <span className="w-5 flex-shrink-0 text-center text-[17px] leading-none">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </nav>
        </div>
      </div>

      {token && (
        <div className="mt-auto border-t border-sidebar-border px-3 pb-5 pt-3.5">
          <NavLink
            to="/add"
            className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-add-border bg-add-bg px-4 py-2.5 font-sans text-sm font-semibold text-text-secondary hover:border-primary hover:bg-add-hover hover:text-primary"
          >
            <span className="text-base leading-none">＋</span>
            Add Snippet
          </NavLink>
        </div>
      )}
    </aside>
  );
}
