import { apiRequest, ApiError } from "./apiClient.ts";
import type { ManagedUser } from "@/pages/Users.tsx";

// In-memory client cache (persists during active session across tab switches)
let cachedUsersResult: PaginatedUsersResult | null = null;

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: string;
  role_name?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export interface PaginatedUsersResult {
  users: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class UserServiceError extends ApiError {}

export const userService = {
  /**
   * Returns current in-memory cached users if already fetched.
   */
  getCachedUsers(): PaginatedUsersResult | null {
    return cachedUsersResult;
  },

  /**
   * Sets or updates in-memory cached users.
   */
  setCachedUsers(result: PaginatedUsersResult | null): void {
    cachedUsersResult = result;
  },

  /**
   * Clears the in-memory cache (e.g., on logout).
   */
  clearCache(): void {
    cachedUsersResult = null;
  },

  /**
   * Fetches the paginated list of all registered users from the backend API.
   * Tracks global top progress bar and saves result in memory.
   */
  async getAllUsers(
    params: { page?: number; limit?: number } = {},
    options?: { silent?: boolean; signal?: AbortSignal }
  ): Promise<PaginatedUsersResult> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const endpoint = `/api/users${query.toString() ? `?${query.toString()}` : ""}`;

    try {
      const response = await apiRequest<{
        data?: BackendUser[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      } | BackendUser[]>(endpoint, {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });

      const rawList: BackendUser[] = Array.isArray(response)
        ? response
        : response.data || [];

      const pagination = (!Array.isArray(response) && response.pagination) || {
        total: rawList.length,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: 1,
      };

      const users: ManagedUser[] = rawList.map((u) => {
        const normalizedStatus =
          u.status === "suspended" || u.status === "deactive"
            ? "deactive"
            : u.status || "active";

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || "buyer",
          status: normalizedStatus,
          createdAt: u.created_at
            ? new Date(u.created_at).toISOString().split("T")[0]
            : "2026-01-01",
        };
      });

      const paginatedResult: PaginatedUsersResult = {
        users,
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      };

      cachedUsersResult = paginatedResult;
      return paginatedResult;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new UserServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Updates user name, role, or status on the backend server and synchronizes memory cache.
   */
  async updateUser(
    id: string,
    data: { name?: string; email?: string; role?: string; status?: string },
    options?: { signal?: AbortSignal }
  ): Promise<ManagedUser> {
    try {
      const u = await apiRequest<BackendUser>(`/api/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        signal: options?.signal,
      });

      const normalizedStatus =
        u.status === "suspended" || u.status === "deactive"
          ? "deactive"
          : u.status || "active";

      const updatedUser: ManagedUser = {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || "buyer",
        status: normalizedStatus,
        createdAt: u.created_at
          ? new Date(u.created_at).toISOString().split("T")[0]
          : "2026-01-01",
      };

      if (cachedUsersResult) {
        cachedUsersResult = {
          ...cachedUsersResult,
          users: cachedUsersResult.users.map((item) =>
            item.id === id ? { ...item, ...updatedUser } : item
          ),
        };
      }

      return updatedUser;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new UserServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Deactivates a user account on the backend server and synchronizes memory cache.
   */
  async deactivateUser(
    id: string,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    try {
      await apiRequest<void>(`/api/users/${id}`, {
        method: "DELETE",
        signal: options?.signal,
      });

      if (cachedUsersResult) {
        cachedUsersResult = {
          ...cachedUsersResult,
          users: cachedUsersResult.users.map((item) =>
            item.id === id ? { ...item, status: "deactive" } : item
          ),
        };
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new UserServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};
