import { useEffect, useState } from "react";
import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { Menu } from "lucide-react";
import Sidebar from "../Sidebar/Sidebar";
import ThemeGallery from "../ThemeGallery/ThemeGallery";

// Responsive shell wrapping every authenticated page: a persistent
// (optionally collapsed-to-rail) sidebar at >= lg, a Headless UI Dialog
// slide-out drawer with the exact same <Sidebar/> content below lg, and a
// sticky mobile top bar (hamburger + title) that only renders below lg.
// The theme trigger lives inside Sidebar itself (see onOpenThemeGallery)
// so it's reachable from both the desktop rail and the mobile drawer
// without a separate always-visible header row eating into page content.
export default function AppShell({ title, children, maxWidth = "1400px", contentClassName = "" }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 hidden h-screen flex-shrink-0 lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onOpenThemeGallery={() => setGalleryOpen(true)}
        />
      </div>

      <Dialog open={drawerOpen} onClose={setDrawerOpen} transition className="relative z-[150] lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/60 transition-opacity duration-200 data-[closed]:opacity-0"
        />
        <div className="fixed inset-y-0 left-0 flex">
          <DialogPanel
            transition
            className="h-full w-[260px] transition-transform duration-200 data-[closed]:-translate-x-full"
          >
            <Sidebar onNavigate={() => setDrawerOpen(false)} onOpenThemeGallery={() => setGalleryOpen(true)} />
          </DialogPanel>
        </div>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-2 text-text-secondary hover:bg-card-hover"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          {title && <span className="truncate font-mono text-sm font-bold text-text">{title}</span>}
        </div>

        <div
          className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-12 ${contentClassName}`}
          style={{ maxWidth }}
        >
          {children}
        </div>
      </div>

      <ThemeGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
