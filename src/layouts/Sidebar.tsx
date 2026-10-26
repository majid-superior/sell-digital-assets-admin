import React, { useState, useEffect } from "react";
import { Icons } from "@/lib/icons/index.ts";
import { Badge } from "@/components/ui/index.ts";
import { assetService, type AssetCounts } from "@/services/assetService.ts";

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
  | "hero"
  | "banner"
  | "banners"
  | "security"
  | "branding"
  | "appearance"
  | "logs"
  | "organizations"
  | "settings"
  | "platform-settings"
  | "securities"
  | "admin-security"
  | "audit-logs"
  | "system-settings";

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
  onSignOut?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <Icons.LayoutGrid size={16} />,
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: <Icons.TrendingUp size={16} />,
      },
    ],
  },
  {
    title: "CATALOG",
    items: [
      {
        id: "assets",
        label: "Assets",
        icon: <Icons.Box size={16} />,
      },
      {
        id: "categories",
        label: "Categories",
        icon: <Icons.FolderTree size={16} />,
      },
      {
        id: "users",
        label: "Users",
        icon: <Icons.Users size={16} />,
      },
    ],
  },
  {
    title: "FINANCE",
    items: [
      {
        id: "orders",
        label: "Orders",
        icon: <Icons.ShoppingCart size={16} />,
      },
      {
        id: "refunds",
        label: "Refunds",
        icon: <Icons.RotateCcw size={16} />,
      },
      {
        id: "payouts",
        label: "Payouts",
        icon: <Icons.Banknote size={16} />,
      },
    ],
  },
  {
    title: "MARKETING",
    items: [
      {
        id: "hero",
        label: "Hero",
        icon: <Icons.Image size={16} />,
      },
      {
        id: "banner",
        label: "Banner",
        icon: <Icons.LayoutPanelTop size={16} />,
      },
      {
        id: "curation",
        label: "Curation",
        icon: <Icons.Sparkles size={16} />,
      },
      {
        id: "coupons",
        label: "Coupons",
        icon: <Icons.Ticket size={16} />,
      },
      {
        id: "broadcasts",
        label: "Broadcasts",
        icon: <Icons.Megaphone size={16} />,
      },
    ],
  },
  {
    title: "SAFETY",
    items: [
      {
        id: "security",
        label: "Security",
        icon: <Icons.ShieldCheck size={16} />,
      },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      {
        id: "settings",
        label: "Commerce",
        icon: <Icons.Settings size={16} />,
      },
      {
        id: "system-settings",
        label: "Policies",
        icon: <Icons.Sliders size={16} />,
      },
      {
        id: "branding",
        label: "Branding",
        icon: <Icons.Brand size={16} />,
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: <Icons.Palette size={16} />,
      },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      {
        id: "logs",
        label: "Logs",
        icon: <Icons.ScrollText size={16} />,
      },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  onSignOut,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [pendingAssetsCount, setPendingAssetsCount] = useState<number>(() => {
    return assetService.getCachedCounts()?.pending ?? 0;
  });

  // Global Ctrl+B / Cmd+B keyboard shortcut to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        onToggleCollapse?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onToggleCollapse]);

  useEffect(() => {
    if (assetService.getCachedCounts() === null) {
      assetService.getCounts({ silent: true }).catch(() => {});
    }

    const handleCountsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<AssetCounts>;
      if (customEvent.detail && typeof customEvent.detail.pending === "number") {
        setPendingAssetsCount(customEvent.detail.pending);
      }
    };

    window.addEventListener("assets:counts-updated", handleCountsUpdated);
    return () => {
      window.removeEventListener("assets:counts-updated", handleCountsUpdated);
    };
  }, []);

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
    if (itemId === "banner" && activeTab === "banners") return true;
    if (itemId === "banners" && activeTab === "banner") return true;
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-on-surface/50 dark:bg-surface-container-lowest/80 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-outline-variant/30 bg-surface-container-lowest dark:bg-surface-container-low transition-[width,transform] duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isCollapsed ? "w-60 lg:w-16" : "w-60 lg:w-56"
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="flex h-13 items-center justify-between border-b border-outline-variant/20 px-3.5 shrink-0">
          {/* Expanded Brand View */}
          <div className={`items-center gap-2.5 min-w-0 ${isCollapsed ? "hidden" : "flex"}`}>
            <img
              src="/logo.png"
              alt="AssetDrop"
              className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[15px] tracking-tight text-on-surface leading-tight flex items-center truncate">
                Asset<span className="text-primary font-extrabold">Drop</span>
              </span>
              <span className="text-[10px] text-on-surface-variant font-medium tracking-wide uppercase truncate">
                Platform Admin
              </span>
            </div>
          </div>

          {/* Collapsed Brand View (Desktop icon only) */}
          <div className={`w-full items-center justify-center ${isCollapsed ? "hidden lg:flex" : "hidden"}`}>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar (Ctrl+B)"
              title="Expand sidebar (Ctrl+B)"
              className="flex items-center justify-center p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer group"
            >
              <img
                src="/logo.png"
                alt="AssetDrop"
                className="w-7 h-7 rounded-lg object-contain shadow-xs shrink-0 group-hover:scale-105 transition-transform"
              />
            </button>
          </div>

          {/* Desktop Collapse Toggle Button (when expanded) */}
          {!isCollapsed && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar (Ctrl+B)"
              title="Collapse sidebar (Ctrl+B)"
              className="hidden lg:flex p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
            >
              <Icons.PanelLeftClose size={16} />
            </button>
          )}

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer shrink-0"
          >
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className={`flex-1 overflow-y-auto ${isCollapsed ? "px-1.5 py-2 space-y-1" : "px-2 py-2 space-y-1.5"}`}>
          {NAV_SECTIONS.map((section, idx) => (
            <div key={section.title} className="space-y-0.5">
              {/* Section Header or Divider */}
              {isCollapsed ? (
                idx > 0 && (
                  <div
                    className="my-1.5 mx-2 h-px bg-outline-variant/25 select-none"
                    role="separator"
                    title={section.title}
                  />
                )
              ) : (
                <div
                  className={`px-2.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 select-none ${
                    idx === 0 ? "pt-1" : "pt-2"
                  }`}
                >
                  {section.title}
                </div>
              )}

              {section.items.map((item) => {
                const active = isItemActive(item.id);
                const hasPendingBadge = item.id === "assets" && pendingAssetsCount > 0;
                const badgeText = hasPendingBadge ? String(pendingAssetsCount) : item.badge;

                // Collapsed item view
                if (isCollapsed) {
                  return (
                    <a
                      key={item.id}
                      href={`#/${item.id}`}
                      title={item.label}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                          return;
                        }
                        e.preventDefault();
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`group relative flex w-10 h-8.5 mx-auto items-center justify-center rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        active
                          ? "bg-primary text-on-primary shadow-xs font-semibold"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span
                        className={`shrink-0 transition-colors ${
                          active
                            ? "text-on-primary"
                            : "text-on-surface-variant/80 group-hover:text-on-surface"
                        }`}
                      >
                        {item.icon}
                      </span>

                      {/* Badge Pip Indicator */}
                      {Boolean(badgeText) && (
                        <span
                          className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                            hasPendingBadge ? "bg-warning ring-2 ring-surface-container-lowest" : "bg-primary"
                          }`}
                        />
                      )}

                      {/* Floating tooltip on hover */}
                      <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-surface-container-highest text-on-surface text-xs font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-outline-variant/30 flex items-center gap-1.5">
                        <span>{item.label}</span>
                        {Boolean(badgeText) && (
                          <span
                            className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                              hasPendingBadge
                                ? "bg-warning/20 text-warning"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {badgeText}
                          </span>
                        )}
                      </div>
                    </a>
                  );
                }

                // Expanded item view
                return (
                  <a
                    key={item.id}
                    href={`#/${item.id}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                        return;
                      }
                      e.preventDefault();
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`group flex w-full items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? "bg-primary text-on-primary shadow-xs font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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

                    {Boolean(badgeText) && (
                      <Badge
                        variant={hasPendingBadge && !active ? "warning" : active ? "outline" : "secondary"}
                        size="sm"
                        className={
                          active
                            ? "border-on-primary/40 text-on-primary text-[9px] px-1 py-0"
                            : hasPendingBadge
                            ? "bg-warning/15 text-warning border border-warning/30 text-[9px] font-bold px-1.5 py-0"
                            : "text-[9px] px-1 py-0"
                        }
                      >
                        {badgeText}
                      </Badge>
                    )}
                  </a>
                );
              })}

              {/* In the SYSTEM section, append the Sign Out button */}
              {section.title === "SYSTEM" && (
                isCollapsed ? (
                  <button
                    type="button"
                    title="Sign Out"
                    onClick={() => {
                      onSignOut?.();
                      onClose();
                    }}
                    className="group relative flex w-10 h-8.5 mx-auto items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                  >
                    <Icons.SignOut size={16} />
                    <div className="absolute left-full ml-2.5 px-2.5 py-1 bg-surface-container-highest text-error text-xs font-medium rounded-md shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-outline-variant/30">
                      Sign Out
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut?.();
                      onClose();
                    }}
                    className="group flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                  >
                    <span className="shrink-0 text-on-surface-variant/80 group-hover:text-error transition-colors">
                      <Icons.SignOut size={16} />
                    </span>
                    <span className="truncate">Sign Out</span>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
