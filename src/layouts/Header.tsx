import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { Icons } from "@/lib/icons/index.ts";
import { Badge, Button, Spinner } from "@/components/ui/index.ts";
import {
  notificationService,
  formatRelativeTime,
  type AdminNotification,
  type NotificationsResult,
} from "@/services/notificationService.ts";
import { assetService } from "@/services/assetService.ts";
import type { NavTabId } from "./Sidebar.tsx";

export interface HeaderProps {
  onToggleSidebar?: () => void;
  onToggleCollapse?: () => void;
  isSidebarCollapsed?: boolean;
  onSelectTab?: (tabId: NavTabId) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onToggleCollapse,
  isSidebarCollapsed = false,
  onSelectTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>(
    () => notificationService.getCachedNotifications()?.notifications || [],
  );
  const [unreadCount, setUnreadCount] = useState<number>(
    () => notificationService.getCachedNotifications()?.unreadCount || 0,
  );
  const [isSyncingNotifs, setIsSyncingNotifs] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  useEffect(() => {
    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<NotificationsResult>;
      if (custom.detail) {
        setNotifications(custom.detail.notifications);
        setUnreadCount(custom.detail.unreadCount);
      }
    };

    window.addEventListener("notifications:updated", handleUpdated);

    notificationService
      .getNotifications({ page: 1, limit: 25 }, { silent: true })
      .catch(() => {});

    const interval = window.setInterval(() => {
      notificationService
        .getNotifications({ page: 1, limit: 25 }, { silent: true })
        .catch(() => {});
    }, 25000);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications:updated", handleUpdated);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isNotifOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleManualSync = async () => {
    setIsSyncingNotifs(true);
    try {
      const res = await notificationService.getNotifications(
        { page: 1, limit: 25 },
        { silent: false },
      );
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Handled silently or by apiClient
    } finally {
      setIsSyncingNotifs(false);
    }
  };

  const handleToggleNotif = () => {
    const nextOpen = !isNotifOpen;
    setIsNotifOpen(nextOpen);
    if (nextOpen) {
      notificationService
        .getNotifications({ page: 1, limit: 25 }, { silent: true })
        .catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      toast.success("Notifications Cleared", {
        description: "All notifications have been marked as read.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to mark notifications as read.";
      toast.error("Action Failed", { description: message });
    }
  };

  const handleSelectNotification = (item: AdminNotification) => {
    if (!item.is_read) {
      notificationService.markAsRead(item.id, { silent: true }).catch(() => {});
    }

    const assetId =
      typeof item.data?.assetId === "string" ? item.data.assetId : null;
    if (assetId) {
      setIsNotifOpen(false);
      assetService.setPendingInspectAssetId(assetId);
      onSelectTab?.("assets");
      window.dispatchEvent(
        new CustomEvent("admin:inspect-asset", { detail: { assetId } }),
      );
    }
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case "asset_submitted":
        return (
          <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <Icons.Box size={16} />
          </div>
        );
      case "asset_resubmitted":
        return (
          <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Icons.RefreshCw size={16} />
          </div>
        );
      case "asset_seller_reply":
        return (
          <div className="w-8 h-8 rounded-lg bg-tertiary/15 text-tertiary flex items-center justify-center shrink-0">
            <Icons.MessageSquare size={16} />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icons.Bell size={16} />
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface/90 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Left: Sidebar Toggle & Admin Identity */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => {
            if (window.innerWidth < 1024) {
              onToggleSidebar?.();
            } else {
              onToggleCollapse?.();
            }
          }}
          aria-label={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          className="p-1.5 -ml-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          <Icons.Menu size={20} />
        </button>

        {/* Admin Avatar / Image */}
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0 select-none shadow-xs">
          {initials}
        </div>

        {/* Name, "Signed in as", and Role with defensive fallback */}
        <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
          <span className="font-semibold text-on-surface truncate">
            {user?.name || "Administrator"}
          </span>
          <span className="text-[11px] sm:text-xs text-on-surface-variant shrink-0">
            Signed in as - {user?.role || "admin"}
          </span>
        </div>
      </div>

      {/* Right: Notification Bell & Theme Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Notification Bell & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleNotif}
            aria-label="Open notifications"
            className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icons.Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shadow-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-outline-variant/40 bg-surface-container-low text-on-surface shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/25 bg-surface-container-high/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-on-surface">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <Badge variant="primary" size="sm">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncingNotifs}
                    title="Refresh notifications"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    {isSyncingNotifs ? (
                      <Spinner size="sm" color="primary" />
                    ) : (
                      <Icons.RefreshCw size={14} />
                    )}
                  </button>

                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Icons.CheckCheck size={13} />}
                      onClick={handleMarkAllRead}
                      className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                    >
                      Mark all read
                    </Button>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/15">
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
                      <Icons.Bell size={18} />
                    </div>
                    <p className="text-xs font-semibold text-on-surface">
                      No notifications yet
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      New asset submissions and seller revision replies will appear here automatically.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      type="button"
                      key={n.id}
                      onClick={() => handleSelectNotification(n)}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        !n.is_read
                          ? "bg-primary/5 hover:bg-primary/10"
                          : "hover:bg-surface-container-high/40"
                      }`}
                    >
                      {renderNotificationIcon(n.type)}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-xs truncate ${
                              !n.is_read
                                ? "font-bold text-on-surface"
                                : "font-semibold text-on-surface/90"
                            }`}
                          >
                            {n.title}
                          </span>
                          <span className="text-[10px] text-on-surface-variant shrink-0">
                            {formatRelativeTime(n.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-3 leading-relaxed">
                          {n.message}
                        </p>

                        {n.data?.assetId && (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <span>Inspect asset in review queue</span>
                            <Icons.ChevronRight size={12} />
                          </div>
                        )}
                      </div>

                      {!n.is_read && (
                        <span
                          className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"
                          title="Unread"
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? (
            <Icons.ThemeLight size={20} className="text-primary" />
          ) : (
            <Icons.ThemeDark size={20} className="text-on-surface-variant" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
