import { API_BASE_URL } from "@/config/env.ts";
import { authService } from "./authService.ts";
import { loadingManager } from "@/lib/loadingManager.ts";
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

export class UserServiceError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "UserServiceError";
    this.statusCode = statusCode;
  }
}

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
    options?: { silent?: boolean }
  ): Promise<PaginatedUsersResult> {
    const fetchOperation = async (): Promise<PaginatedUsersResult> => {
      const token = authService.getStoredToken();
      const query = new URLSearchParams();
      if (params.page) query.set("page", String(params.page));
      if (params.limit) query.set("limit", String(params.limit));

      const url = `${API_BASE_URL}/api/users${query.toString() ? `?${query.toString()}` : ""}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch {
        throw new UserServiceError(
          "Unable to connect to the backend server. Please verify the API server is running on http://localhost:5000.",
          0
        );
      }

      if (!response.ok) {
        let errorMessage = `Failed to fetch users from server (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch {
          // Fallback
        }
        throw new UserServiceError(errorMessage, response.status);
      }

      const result = await response.json();
      const rawList: BackendUser[] = result.data || [];
      const pagination = result.pagination || {
        total: rawList.length,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: 1,
      };

      const users: ManagedUser[] = rawList.map((u) => {
        // Map database status ('suspended' -> 'deactive')
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
    };

    return loadingManager.wrap(fetchOperation(), options?.silent);
  },

  /**
   * Updates user name, role, or status on the backend server and synchronizes memory cache.
   */
  async updateUser(
    id: string,
    data: { name?: string; email?: string; role?: string; status?: string }
  ): Promise<ManagedUser> {
    const updateOperation = async (): Promise<ManagedUser> => {
      const token = authService.getStoredToken();
      const url = `${API_BASE_URL}/api/users/${id}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        });
      } catch {
        throw new UserServiceError(
          "Unable to reach the backend API server. Please check your network connection.",
          0
        );
      }

      if (!response.ok) {
        let errorMessage = `Failed to update user on server (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch {
          // Fallback
        }
        throw new UserServiceError(errorMessage, response.status);
      }

      const result = await response.json();
      const u: BackendUser = result.data;
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

      // Synchronize in-memory cache
      if (cachedUsersResult) {
        cachedUsersResult = {
          ...cachedUsersResult,
          users: cachedUsersResult.users.map((item) =>
            item.id === id ? { ...item, ...updatedUser } : item
          ),
        };
      }

      return updatedUser;
    };

    return loadingManager.wrap(updateOperation());
  },

  /**
   * Deactivates a user account on the backend server and synchronizes memory cache.
   */
  async deactivateUser(id: string): Promise<void> {
    const deactivateOperation = async (): Promise<void> => {
      const token = authService.getStoredToken();
      const url = `${API_BASE_URL}/api/users/${id}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "DELETE",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch {
        throw new UserServiceError(
          "Unable to reach the backend API server to deactivate user.",
          0
        );
      }

      if (!response.ok) {
        let errorMessage = `Failed to deactivate user (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch {
          // Fallback
        }
        throw new UserServiceError(errorMessage, response.status);
      }

      // Synchronize in-memory cache
      if (cachedUsersResult) {
        cachedUsersResult = {
          ...cachedUsersResult,
          users: cachedUsersResult.users.map((item) =>
            item.id === id ? { ...item, status: "deactive" } : item
          ),
        };
      }
    };

    return loadingManager.wrap(deactivateOperation());
  },
};
