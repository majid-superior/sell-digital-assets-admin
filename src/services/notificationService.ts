import { apiRequest, ApiError } from "./apiClient.ts";
import { assetService } from "./assetService.ts";

export interface AdminNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    assetId?: string;
    slug?: string;
    sellerId?: string;
    sellerName?: string;
    title?: string;
    isResubmit?: boolean;
    feedback?: string;
    sellerFeedback?: string | null;
    [key: string]: unknown;
  } | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationsResult {
  notifications: AdminNotification[];
  total: number;
  unreadCount: number;
}

export class NotificationServiceError extends ApiError {}

let cachedNotifications: NotificationsResult | null = null;

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 45) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function emitNotificationsUpdated(result: NotificationsResult) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("notifications:updated", { detail: result }),
    );
  }
}

export const notificationService = {
  getCachedNotifications(): NotificationsResult | null {
    return cachedNotifications;
  },

  clearCache(): void {
    cachedNotifications = null;
  },

  async getNotifications(
    params: { page?: number; limit?: number; unreadOnly?: boolean } = {},
    options?: { silent?: boolean; signal?: AbortSignal },
  ): Promise<NotificationsResult> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.unreadOnly) query.set("unreadOnly", "true");

    const endpoint = `/api/v1/notifications${query.toString() ? `?${query.toString()}` : ""}`;

    try {
      const response = await apiRequest<{
        success: boolean;
        data: AdminNotification[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          unreadCount: number;
        };
      }>(endpoint, {
        method: "GET",
        rawResponse: true,
        silent: options?.silent,
        signal: options?.signal,
      });

      const list = Array.isArray(response.data) ? response.data : [];
      const unreadCount =
        typeof response.pagination?.unreadCount === "number"
          ? response.pagination.unreadCount
          : list.filter((n) => !n.is_read).length;
      const total =
        typeof response.pagination?.total === "number"
          ? response.pagination.total
          : list.length;

      const prevUnread = cachedNotifications?.unreadCount ?? 0;
      const result: NotificationsResult = {
        notifications: list,
        total,
        unreadCount,
      };

      cachedNotifications = result;
      emitNotificationsUpdated(result);

      if (unreadCount > prevUnread) {
        assetService.getCounts({ silent: true }).catch(() => {});
      }

      return result;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new NotificationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async markAsRead(
    id: string,
    options?: { silent?: boolean },
  ): Promise<AdminNotification> {
    try {
      const updated = await apiRequest<AdminNotification>(
        `/api/v1/notifications/${encodeURIComponent(id)}/read`,
        {
          method: "PATCH",
          silent: options?.silent ?? true,
        },
      );

      if (cachedNotifications) {
        const wasUnread = cachedNotifications.notifications.some(
          (n) => n.id === id && !n.is_read,
        );
        const nextList = cachedNotifications.notifications.map((n) =>
          n.id === id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n,
        );
        cachedNotifications = {
          ...cachedNotifications,
          notifications: nextList,
          unreadCount: wasUnread
            ? Math.max(0, cachedNotifications.unreadCount - 1)
            : cachedNotifications.unreadCount,
        };
        emitNotificationsUpdated(cachedNotifications);
      }

      return updated;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new NotificationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async markAllAsRead(options?: { silent?: boolean }): Promise<void> {
    try {
      await apiRequest<{ count?: number }>("/api/v1/notifications/read-all", {
        method: "POST",
        silent: options?.silent ?? false,
      });

      if (cachedNotifications) {
        const now = new Date().toISOString();
        cachedNotifications = {
          ...cachedNotifications,
          notifications: cachedNotifications.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: n.read_at || now,
          })),
          unreadCount: 0,
        };
        emitNotificationsUpdated(cachedNotifications);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new NotificationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};

