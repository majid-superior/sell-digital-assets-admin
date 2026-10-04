import { API_BASE_URL } from "@/config/env.ts";
import type { LoginResponse, User, AuthErrorResponse } from "@/types/auth.ts";

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const USER_KEY = "user";
export const REMEMBERED_EMAIL_KEY = "remembered_email";

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
  async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<LoginResponse> {
    const url = `${API_BASE_URL}/api/auth/login`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      throw new AuthError(
        "Unable to connect to the authentication server. Please check your network connection or verify that the API server is running.",
        0
      );
    }

    let data: (LoginResponse & AuthErrorResponse) | null = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON response
    }

    if (!response.ok || !data || data.status === "fail") {
      let errorMessage = data?.message || "Authentication failed";

      if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = `${errorMessage}: ${data.errors.join(", ")}`;
      }

      throw new AuthError(errorMessage, response.status, data?.errors);
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
    if (data.user) {
      storage.setItem(USER_KEY, JSON.stringify(data.user));
    }

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

    return data as LoginResponse;
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
      throw new AuthError("You must be logged in to update your profile.", 401);
    }

    const url = `${API_BASE_URL}/api/users/me`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PATCH",
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
      let errorMessage = data?.message || "Failed to update profile";
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
   * Clears all session credentials from both localStorage and sessionStorage.
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {
      // Storage access restrictions
    }
  },

  /**
   * Signs the user out and clears session state.
   */
  signOut(): void {
    this.clearSession();
  },

  /**
   * Checks whether the user is actively authenticated.
   */
  isAuthenticated(): boolean {
    return Boolean(this.getStoredToken() && this.getStoredUser());
  },
};
