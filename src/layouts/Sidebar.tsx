import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { Badge } from "@/components/ui/index.ts";

export type NavTabId = "dashboard" | "company" | "users" | "setting";

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tabId: NavTabId) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <Icons.Categories size={18} />,
  },
  {
    id: "company",
    label: "Company",
    icon: <Icons.Building size={18} />,
  },
  {
    id: "users",
    label: "Users",
    icon: <Icons.Users size={18} />,
  },
  {
    id: "setting",
    label: "Setting",
    icon: <Icons.Settings size={18} />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onLogout,
}) => {
  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant/30 bg-surface-container-low transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="flex h-16 items-center justify-between border-b border-outline-variant/30 px-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-xs">
              <Icons.Brand size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-on-surface leading-tight">
                Asset<span className="text-primary-container font-extrabold">Drop</span>
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium">
                Admin Console
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
            Navigation
          </div>

          {/* 1st: Dashboard & 2nd: Company */}
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "bg-primary text-on-primary shadow-xs font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={isActive ? "outline" : "secondary"}
                    size="sm"
                    className={
                      isActive
                        ? "border-on-primary/40 text-on-primary text-[10px]"
                        : "text-[10px]"
                    }
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* 3rd: Log out button */}
          <button
            type="button"
            onClick={() => {
              onLogout?.();
              onClose();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-error/10 hover:text-error transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
          >
            <span className="shrink-0">
              <Icons.LogOut size={18} />
            </span>
            <span className="truncate">Log out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
