import { NavLink } from "react-router-dom";
import { BarChart3, Calendar, ChevronsLeft, ChevronsRight, LayoutDashboard, Palette, Plus, Settings, Star, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Tooltip from "../ui/Tooltip";

// Dashboard / Calendar / Favorites reflect the nav that was duplicated
// inline into index.html, dashboard.html and Mysnippets.html (the standalone
// Sidebar.html's extra "Library" item was never actually wired into any real
// page, so it's intentionally omitted); Profile was added with the /profile
// route, Settings with the learning-platform features. Icons are
// lucide-react (currentColor-based, themes for free) instead of the
// original emoji.
const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", authOnly: true },
  { to: "/calendar", icon: Calendar, label: "Calendar", authOnly: false },
  { to: "/favorites", icon: Star, label: "Favorites", authOnly: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics", authOnly: true },
  { to: "/profile", icon: User, label: "Profile", authOnly: true },
  { to: "/settings", icon: Settings, label: "Settings", authOnly: true },
];

function navItemClass(collapsed) {
  return ({ isActive }) =>
    `flex w-full items-center gap-2.5 rounded-[10px] px-[11px] py-2.5 text-left font-sans text-sm font-medium ${
      collapsed ? "justify-center" : ""
    } ${
      isActive
        ? "bg-primary text-white shadow-[0_3px_12px_var(--primary-glow)]"
        : "text-sidebar-text hover:bg-sidebar-hover hover:text-text"
    }`;
}

// Shared between the persistent desktop rail and the mobile slide-out
// drawer (both rendered by AppShell) — one nav data source, no duplicated
// link config. `collapsed` (desktop icon-only rail) and `onNavigate`
// (closes the mobile drawer after a link is tapped) are optional.
export default function Sidebar({ collapsed = false, onToggleCollapse, onOpenThemeGallery, onNavigate }) {
  const { token } = useAuth();
  const visibleItems = navItems.filter((item) => !item.authOnly || token);

  return (
    <aside
      className={`flex h-full flex-col border-r border-sidebar-border bg-sidebar-bg transition-[width] duration-200 ${
        collapsed ? "w-[76px]" : "w-[240px]"
      }`}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="border-b border-sidebar-border px-5 pb-[18px] pt-[22px]">
          <div className={`flex items-center gap-[11px] ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[9px] bg-primary text-[13px] font-bold text-white shadow-[0_4px_12px_var(--primary-glow)]">
              {"</>"}
            </div>
            {!collapsed && <h1 className="text-base font-bold tracking-tight text-text">DailyCode</h1>}
          </div>

          <nav className="mt-3.5 flex flex-col gap-0.5">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const link = (
                <NavLink key={item.to} to={item.to} onClick={onNavigate} className={navItemClass(collapsed)}>
                  <Icon size={18} className="flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={item.to} label={item.label} side="right">
                  {link}
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t border-sidebar-border px-3 pb-5 pt-3.5">
        {token &&
          (collapsed ? (
            <Tooltip label="Add Snippet" side="right">
              <NavLink
                to="/add"
                onClick={onNavigate}
                className="flex w-full items-center justify-center rounded-[11px] border border-add-border bg-add-bg py-2.5 text-text-secondary hover:border-primary hover:bg-add-hover hover:text-primary"
              >
                <Plus size={18} aria-hidden="true" />
              </NavLink>
            </Tooltip>
          ) : (
            <NavLink
              to="/add"
              onClick={onNavigate}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] border border-add-border bg-add-bg px-4 py-2.5 font-sans text-sm font-semibold text-text-secondary hover:border-primary hover:bg-add-hover hover:text-primary"
            >
              <Plus size={16} aria-hidden="true" />
              Add Snippet
            </NavLink>
          ))}

        {onOpenThemeGallery &&
          (collapsed ? (
            <Tooltip label="Change theme" side="right">
              <button
                type="button"
                onClick={onOpenThemeGallery}
                aria-label="Change theme"
                className="flex w-full items-center justify-center rounded-md py-2.5 text-sidebar-text hover:bg-sidebar-hover hover:text-text"
              >
                <Palette size={18} aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onOpenThemeGallery}
              className="flex w-full items-center gap-2.5 rounded-md px-[11px] py-2.5 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text"
            >
              <Palette size={18} aria-hidden="true" />
              Theme
            </button>
          ))}

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden items-center justify-center gap-2 rounded-md py-2 text-xs font-medium text-muted hover:bg-sidebar-hover hover:text-text lg:flex"
          >
            {collapsed ? (
              <ChevronsRight size={16} aria-hidden="true" />
            ) : (
              <>
                <ChevronsLeft size={16} aria-hidden="true" /> Collapse
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
