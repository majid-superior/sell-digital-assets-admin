import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { Badge } from "@/components/ui/index.ts";

export type NavTabId =
  | "dashboard"
  | "analytics"
  | "assets"
  | "categories"
  | "users"
  | "orders"
  | "refunds"
  | "payouts"
  | "curation"
  | "coupons"
  | "broadcasts"
  | "security"
  | "branding"
  | "appearance"
  | "logs"
  | "organizations"
  | "settings"
  | "platform-settings"
  | "securities"
  | "admin-security"
  | "audit-logs";

export interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface SidebarProps {
  activeTab: NavTabId;
  onSelectTab: (tabId: NavTabId) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <Icons.LayoutGrid size={18} />,
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: <Icons.TrendingUp size={18} />,
      },
    ],
  },
  {
    title: "CATALOG",
    items: [
      {
        id: "assets",
        label: "Assets",
        icon: <Icons.Box size={18} />,
      },
      {
        id: "categories",
        label: "Categories",
        icon: <Icons.FolderTree size={18} />,
      },
      {
        id: "users",
        label: "Users",
        icon: <Icons.Users size={18} />,
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        id: "orders",
        label: "Orders",
        icon: <Icons.ShoppingCart size={18} />,
      },
      {
        id: "refunds",
        label: "Refunds",
        icon: <Icons.RotateCcw size={18} />,
      },
      {
        id: "payouts",
        label: "Payouts",
        icon: <Icons.Banknote size={18} />,
      },
    ],
  },
  {
    title: "MARKETING",
    items: [
      {
        id: "curation",
        label: "Curation",
        icon: <Icons.Sparkles size={18} />,
      },
      {
        id: "coupons",
        label: "Coupons",
        icon: <Icons.Ticket size={18} />,
      },
      {
        id: "broadcasts",
        label: "Broadcasts",
        icon: <Icons.Megaphone size={18} />,
      },
    ],
  },
  {
    title: "SAFETY",
    items: [
      {
        id: "security",
        label: "Security",
        icon: <Icons.ShieldCheck size={18} />,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        id: "branding",
        label: "Branding",
        icon: <Icons.Brand size={18} />,
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: <Icons.Palette size={18} />,
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        id: "logs",
        label: "Logs",
        icon: <Icons.ScrollText size={18} />,
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onLogout,
}) => {
  const isItemActive = (itemId: NavTabId) => {
    if (activeTab === itemId) return true;
    if (itemId === "branding" && activeTab === "organizations") return true;
    if (itemId === "organizations" && activeTab === "branding") return true;
    if (itemId === "settings" && activeTab === "platform-settings") return true;
    if (itemId === "platform-settings" && activeTab === "settings") return true;
    if (itemId === "security" && (activeTab === "securities" || activeTab === "admin-security")) return true;
    if ((itemId === "securities" || itemId === "admin-security") && activeTab === "security") return true;
    if (itemId === "logs" && activeTab === "audit-logs") return true;
    if (itemId === "audit-logs" && activeTab === "logs") return true;
    return false;
  };

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
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-outline-variant/30 bg-white dark:bg-surface-container-low transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="flex h-18 items-center justify-between border-b border-outline-variant/20 px-5">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AssetDrop"
              className="w-10 h-10 rounded-xl object-contain shadow-xs shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-bold text-[17px] tracking-tight text-on-surface leading-tight flex items-center">
                Asset<span className="text-primary font-extrabold">Drop</span>
              </span>
              <span className="text-xs text-on-surface-variant font-normal">
                Platform Admin
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

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {NAV_SECTIONS.map((section, idx) => (
            <div key={section.title} className="space-y-1">
              <div
                className={`px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70 select-none ${
                  idx === 0 ? "pt-1" : "pt-3"
                }`}
              >
                {section.title}
              </div>

              {section.items.map((item) => {
                const active = isItemActive(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`group flex w-full items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? "bg-primary text-on-primary shadow-xs font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 transition-colors ${
                          active
                            ? "text-on-primary"
                            : "text-on-surface-variant/80 group-hover:text-on-surface"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <Badge
                        variant={active ? "outline" : "secondary"}
                        size="sm"
                        className={
                          active
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

              {/* In the SYSTEM section, append the Log out button */}
              {section.title === "SYSTEM" && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout?.();
                    onClose();
                  }}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                >
                  <span className="shrink-0 text-on-surface-variant/80 group-hover:text-error transition-colors">
                    <Icons.LogOut size={18} />
                  </span>
                  <span className="truncate">Logout</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
