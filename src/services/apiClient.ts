import { API_BASE_URL } from "@/config/env.ts";
import { authService } from "./authService.ts";
import { loadingManager } from "@/lib/loadingManager.ts";

export interface ApiRequestOptions extends RequestInit {
  silent?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 0, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Mutex to prevent multiple concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { silent = false, headers: customHeaders, ...fetchOptions } = options;

  const execute = async (): Promise<T> => {
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const token = authService.getStoredToken();

    const headers = new Headers(customHeaders || {});
    if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      throw new ApiError(
        "Unable to connect to the backend server. Please verify network connection and API server status.",
        0
      );
    }

    // 401 Unauthorized handling with automated token refresh rotation
    if (
      response.status === 401 &&
      !endpoint.includes("/auth/login") &&
      !endpoint.includes("/auth/refresh")
    ) {
      if (!refreshPromise) {
        refreshPromise = authService.refreshSession().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
        try {
          response = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            throw err;
          }
          throw new ApiError("Connection lost during token refresh retry.", 0);
        }
      } else {
        throw new ApiError("Session expired. Please log in again.", 401);
      }
    }

    let data: Record<string, unknown> | null = null;
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      // Non-JSON or empty response
    }

    if (
      !response.ok ||
      (data && data.success === false) ||
      (data && data.status === "fail")
    ) {
      let message =
        (typeof data?.message === "string" ? data.message : null) ||
        `Request failed with status ${response.status}`;
      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        message = `${message}: ${data.errors.join(", ")}`;
      }
      throw new ApiError(
        message,
        response.status,
        data?.errors || data?.details
      );
    }

    if (data && data.data !== undefined) {
      return data.data as T;
    }

    return (data || {}) as T;
  };

  return loadingManager.wrap(execute(), silent);
}

