import { API_BASE_URL } from "@/config/env.ts";
import { authService } from "./authService.ts";
import { loadingManager } from "@/lib/loadingManager.ts";

export interface ApiRequestOptions extends RequestInit {
  silent?: boolean;
  rawResponse?: boolean;
}

export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode = 0, details?: unknown) {
    super(cleanTechnicalErrorMessage(message, statusCode));
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Sanitizes technical infrastructure, database, socket, and DNS errors
 * into human-understandable guidance without exposing internals.
 */
export function cleanTechnicalErrorMessage(msg: string, status?: number): string {
  if (!msg || typeof msg !== "string") {
    return "An unexpected error occurred. Please try again.";
  }

  const trimmed = msg.trim();

  // Infrastructure connection failures & raw database errors
  if (
    /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNRESET/i.test(trimmed) ||
    /getaddrinfo/i.test(trimmed) ||
    /database system is starting up/i.test(trimmed) ||
    /terminating connection/i.test(trimmed) ||
    /password authentication failed/i.test(trimmed) ||
    /connect timeout/i.test(trimmed) ||
    /database .* does not exist/i.test(trimmed)
  ) {
    return "The backend service is temporarily unavailable. Please try again in a few moments.";
  }

  // Raw HTTP status numbers in error message text
  if (/Internal Server Error/i.test(trimmed) || (status && status >= 500 && /failed/i.test(trimmed))) {
    return "The server encountered a temporary issue. Please try again shortly.";
  }

  return trimmed;
}

// Mutex to prevent multiple concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { silent = false, headers: customHeaders, ...fetchOptions } = options;

  const execute = async (): Promise<T> => {
    let normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    if (normalizedEndpoint.startsWith("/api/") && !normalizedEndpoint.startsWith("/api/v1/")) {
      normalizedEndpoint = normalizedEndpoint.replace(/^\/api\//, "/api/v1/");
    } else if (!normalizedEndpoint.startsWith("/api/v1/") && !endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      normalizedEndpoint = `/api/v1${normalizedEndpoint}`;
    }
    const url = `${API_BASE_URL}${normalizedEndpoint}`;
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
        credentials: "include",
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
      !endpoint.includes("/auth/signin") &&
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
            credentials: "include",
            ...fetchOptions,
            headers,
          });
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            throw err;
          }
          throw new ApiError("Connection lost during token refresh retry.", 0);
        }

        // Terminal 401 check: if still unauthorized after refresh, account permissions or session was revoked
        if (response.status === 401) {
          authService.clearSession();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("auth:session-expired"));
          }
          throw new ApiError("Your administrative session has expired. Please sign in again.", 401);
        }
      } else {
        authService.clearSession();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:session-expired"));
        }
        throw new ApiError("Your administrative session has expired. Please sign in again.", 401);
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
      let message = typeof data?.message === "string" && data.message.trim() ? data.message.trim() : null;

      // Extract field validation errors if available
      if (data?.details && typeof data.details === "object") {
        const detailsObj = data.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
        if (detailsObj.fieldErrors && typeof detailsObj.fieldErrors === "object") {
          const fieldEntries = Object.entries(detailsObj.fieldErrors);
          if (fieldEntries.length > 0) {
            const firstIssues = fieldEntries
              .slice(0, 3)
              .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
              .join("; ");
            message = message ? `${message} (${firstIssues})` : firstIssues;
          }
        }
      }

      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        message = message ? `${message}: ${data.errors.join(", ")}` : data.errors.join(", ");
      }

      // Human-understandable HTTP status fallback when no server message exists
      if (!message) {
        switch (response.status) {
          case 400:
            message = "The request was rejected due to invalid input parameters. Please check your form data.";
            break;
          case 401:
            message = "Your administrative session has expired. Please sign in again.";
            break;
          case 403:
            message = "You do not have administrative permission to perform this action.";
            break;
          case 404:
            message = "The requested administrative resource could not be found.";
            break;
          case 409:
            message = "A resource conflict occurred (e.g., a record with these unique details already exists).";
            break;
          case 413:
            message = "The uploaded file exceeds the allowed upload limit (Payload Too Large). Please choose a smaller file.";
            break;
          case 415:
            message = "The submitted media format or file type is not supported.";
            break;
          case 422:
            message = "Data validation failed. Please check the required fields.";
            break;
          case 429:
            message = "Too many requests. Please wait a moment before trying again.";
            break;
          case 500:
            message = "An internal server error occurred. Please try again in a few moments.";
            break;
          case 502:
          case 503:
          case 504:
            message = "The backend service is temporarily unavailable or undergoing maintenance. Please retry shortly.";
            break;
          default:
            message = `Request failed (Server returned status ${response.status}). Please try again.`;
            break;
        }
      }

      throw new ApiError(
        message,
        response.status,
        data?.errors || data?.details
      );
    }

    if (!options.rawResponse && data && data.data !== undefined) {
      return data.data as T;
    }

    return (data || {}) as T;
  };

  return loadingManager.wrap(execute(), silent);
}

