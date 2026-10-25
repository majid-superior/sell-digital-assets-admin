import { API_BASE_URL } from "@/config/env.ts";
import type { SignInResponse, User, AuthErrorResponse } from "@/types/auth.ts";

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const USER_KEY = "user";
export const REMEMBERED_EMAIL_KEY = "remembered_email";
export const LAST_ACTIVITY_KEY = "admin_last_activity";

export class AuthError extends Error {
  statusCode?: number;
  errors?: string[] | Record<string, string>;

  constructor(message: string, statusCode?: number, errors?: string[] | Record<string, string>) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export const authService = {
  /**
   * Performs authentication against the backend API endpoint.
   */
  async signIn(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<SignInResponse> {
    const url = `${API_BASE_URL}/api/v1/auth/signin`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });
    } catch {
      throw new AuthError(
        "Unable to sign in right now. Please try again later.",
        0
      );
    }

    let data: (SignInResponse & AuthErrorResponse) | null = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok || !data || data.status === "fail") {
      const rawMessage = typeof data?.message === "string" ? data.message.trim() : "";
      let errorMessage = rawMessage;

      // Handle server and infrastructure failures safely without exposing internals
      if (response.status >= 500 || /connect|econn|timeout|database|getaddrinfo/i.test(rawMessage)) {
        errorMessage = "Unable to sign in right now. Please try again later.";
      } else if (response.status === 401) {
        errorMessage = "Incorrect email or password. Please verify your administrator credentials.";
      } else if (response.status === 403) {
        errorMessage = rawMessage || "You do not have administrative permission to access this console.";
      } else if (response.status === 429) {
        errorMessage = "Too many sign-in attempts. Please wait a few moments and try again.";
      } else if (response.status === 404) {
        errorMessage = "The authentication service is temporarily unavailable. Please try again later.";
      } else if (!errorMessage) {
        errorMessage = "Unable to sign in right now. Please try again later.";
      }

      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0 && response.status < 500) {
        errorMessage = `${errorMessage}: ${data.errors.join(", ")}`;
      }

      throw new AuthError(errorMessage, response.status, data?.errors);
    }

    // Enforce strict administrator role requirement before storing session
    const userRole = String(data.user?.role || "").toLowerCase().trim();
    if (!data.user || userRole !== "admin") {
      this.clearSession();
      throw new AuthError(
        "Access denied. Administrator privileges are required to access this console.",
        403
      );
    }

    // Determine storage target based on Remember Me preference
    this.clearSession();
    const storage = rememberMe ? localStorage : sessionStorage;

    if (data.tokens?.accessToken) {
      storage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
    }
    if (data.tokens?.refreshToken) {
      storage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
    }
    storage.setItem(USER_KEY, JSON.stringify(data.user));
    this.updateLastActivity();

    // Persist or clear remembered email preference
    if (rememberMe) {
      try {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } catch {
        // Storage access restrictions
      }
    } else {
      try {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      } catch {
        // Storage access restrictions
      }
    }

    return data as SignInResponse;
  },

  /**
   * Verifies the current authenticated administrator session against /api/v1/auth/me.
   */
  async getCurrentUser(options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<User> {
    const token = this.getStoredToken();
    if (!token) {
      throw new AuthError("Authentication required.", 401);
    }

    const url = `${API_BASE_URL}/api/v1/auth/me`;
    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 8000;
    const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        controller.abort(options.signal.reason);
      } else {
        options.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeoutId);
            controller.abort(options.signal?.reason);
          },
          { once: true }
        );
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new AuthError("Authentication verification request timed out.", 0);
      }
      throw new AuthError("Unable to reach authentication server right now.", 0);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError("Invalid or expired session.", 401);
      }
      if (response.status >= 500) {
        throw new AuthError("Server is temporarily unavailable. Please try again later.", response.status);
      }
      throw new AuthError("Unable to verify administrator session.", response.status);
    }

    const payload = (await response.json()) as { data?: User; user?: User } | User;
    const rawUser: User | undefined =
      payload && typeof payload === "object" && "data" in payload && payload.data
        ? payload.data
        : payload && typeof payload === "object" && "user" in payload && payload.user
        ? payload.user
        : (payload as User);

    if (!rawUser || String(rawUser.role || "").toLowerCase().trim() !== "admin") {
      this.clearSession();
      throw new AuthError(
        "Access denied. Administrator privileges are required to access this console.",
        403
      );
    }

    const isLocalStorage =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY));
    const storage = isLocalStorage ? localStorage : sessionStorage;
    storage.setItem(USER_KEY, JSON.stringify(rawUser));

    return rawUser;
  },

  /**
   * Updates the authenticated user's name and/or password against the backend API.
   */
  async updateProfile(payload: {
    name?: string;
    currentPassword?: string;
    password?: string;
  }): Promise<User> {
    const token = this.getStoredToken();
    if (!token) {
      throw new AuthError("You must be signed in to update your profile.", 401);
    }

    const url = `${API_BASE_URL}/api/v1/auth/me`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    } catch {
      throw new AuthError(
        "Unable to connect to the authentication server. Please check your network connection or verify that the API server is running.",
        0
      );
    }

    let data: {
      success?: boolean;
      status?: string;
      message?: string;
      data?: User;
      errors?: string[] | Record<string, string>;
    } | null = null;

    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok || !data || data.status === "fail") {
      const rawMessage = typeof data?.message === "string" ? data.message.trim() : "";
      let errorMessage = rawMessage;

      if (!errorMessage || errorMessage.startsWith("Route ") || response.status === 404) {
        if (response.status === 404) {
          errorMessage = "The user profile update endpoint could not be found. Please check backend server status.";
        } else if (response.status === 401) {
          errorMessage = "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          errorMessage = "You do not have permission to update administrator profiles.";
        } else if (response.status >= 500) {
          errorMessage = "The server encountered an error while updating your profile. Please try again shortly.";
        } else {
          errorMessage = "Failed to update administrator profile. Please verify your input and try again.";
        }
      }

      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = `${errorMessage}: ${data.errors.join(", ")}`;
      }
      throw new AuthError(errorMessage, response.status, data?.errors);
    }

    const updatedUser = data.data;
    if (updatedUser) {
      if (localStorage.getItem(USER_KEY)) {
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
      if (sessionStorage.getItem(USER_KEY)) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      }
    }

    return updatedUser as User;
  },

  /**
   * Retrieves the stored access token from localStorage or sessionStorage.
   */
  getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return (
        localStorage.getItem(ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ACCESS_TOKEN_KEY)
      );
    } catch {
      return null;
    }
  },

  /**
   * Retrieves the stored refresh token from localStorage or sessionStorage.
   */
  getStoredRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return (
        localStorage.getItem(REFRESH_TOKEN_KEY) ||
        sessionStorage.getItem(REFRESH_TOKEN_KEY)
      );
    } catch {
      return null;
    }
  },

  /**
   * Retrieves and parses stored user profile metadata from localStorage or sessionStorage.
   */
  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const raw =
        localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves last recorded admin activity timestamp (ms) across browser/PC restarts.
   */
  getLastActivity(): number | null {
    if (typeof window === "undefined") return null;
    try {
      const raw =
        localStorage.getItem(LAST_ACTIVITY_KEY) ||
        sessionStorage.getItem(LAST_ACTIVITY_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  },

  /**
   * Persists last recorded admin activity timestamp (ms) in storage.
   */
  updateLastActivity(timestamp: number = Date.now()): void {
    if (typeof window === "undefined") return;
    try {
      const isLocal = Boolean(
        localStorage.getItem(ACCESS_TOKEN_KEY) ||
          localStorage.getItem(REFRESH_TOKEN_KEY)
      );
      const storage = isLocal ? localStorage : sessionStorage;
      storage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
    } catch {
      // Ignore storage access errors
    }
  },

  /**
   * Retrieves any previously remembered email from localStorage.
   */
  getRememberedEmail(): string | null {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(REMEMBERED_EMAIL_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Refreshes the access token using the stored refresh token.
   */
  async refreshSession(options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<string | null> {
    const refreshToken = this.getStoredRefreshToken();
    const url = `${API_BASE_URL}/api/v1/auth/refresh`;

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs ?? 8000;
    const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timeoutId);
        controller.abort(options.signal.reason);
      } else {
        options.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timeoutId);
            controller.abort(options.signal?.reason);
          },
          { once: true }
        );
      }
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          this.clearSession();
        }
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.tokens?.accessToken || data.token;
      const newRefreshToken = data.tokens?.refreshToken || data.refreshToken || refreshToken;
      const refreshedUser: User | undefined = data.user || data.data?.user;

      if (!newAccessToken) {
        this.clearSession();
        return null;
      }

      if (refreshedUser && String(refreshedUser.role || "").toLowerCase().trim() !== "admin") {
        this.clearSession();
        return null;
      }

      const isLocalStorage =
        typeof window !== "undefined" &&
        Boolean(localStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY));
      const storage = isLocalStorage ? localStorage : sessionStorage;

      storage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      if (newRefreshToken) {
        storage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      if (refreshedUser) {
        storage.setItem(USER_KEY, JSON.stringify(refreshedUser));
      }
      this.updateLastActivity();

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("auth:token-refreshed", {
            detail: { token: newAccessToken, user: refreshedUser },
          })
        );
      }

      return newAccessToken;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Clears all session credentials from both localStorage and sessionStorage.
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // Storage access restrictions
    }
  },

  /**
   * Signs the user out and clears session state.
   */
  signOut(): void {
    const refreshToken = this.getStoredRefreshToken();
    const token = this.getStoredToken();
    fetch(`${API_BASE_URL}/api/v1/auth/signout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    }).catch(() => {});
    this.clearSession();
  },

  /**
   * Checks whether the user is actively authenticated as an administrator.
   */
  isAuthenticated(): boolean {
    const user = this.getStoredUser();
    return Boolean(
      this.getStoredToken() &&
        user &&
        String(user.role || "").toLowerCase().trim() === "admin"
    );
  },
};
