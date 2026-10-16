import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  authService,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
  REMEMBERED_EMAIL_KEY,
  AuthError,
} from "./authService.ts";
import type { User } from "@/types/auth.ts";

const mockUser: User = {
  id: "usr-123",
  email: "admin@platform.internal",
  name: "Platform Administrator",
  role: "admin",
  status: "active",
};

describe("authService", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    authService.clearSession();
  });

  describe("Session Storage and Token Retrieval", () => {
    it("should return null when no token is stored", () => {
      expect(authService.getStoredToken()).toBeNull();
      expect(authService.getStoredRefreshToken()).toBeNull();
      expect(authService.getStoredUser()).toBeNull();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("should retrieve stored access token from localStorage", () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, "jwt-access-token-local");
      expect(authService.getStoredToken()).toBe("jwt-access-token-local");
    });

    it("should retrieve stored access token from sessionStorage", () => {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, "jwt-access-token-session");
      expect(authService.getStoredToken()).toBe("jwt-access-token-session");
    });

    it("should retrieve and parse stored user correctly", () => {
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      expect(authService.getStoredUser()).toEqual(mockUser);
    });

    it("should return null for malformed stored user JSON", () => {
      localStorage.setItem(USER_KEY, "{ invalid json");
      expect(authService.getStoredUser()).toBeNull();
    });

    it("should return true for isAuthenticated when both token and user are present", () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, "test-token");
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
      expect(authService.isAuthenticated()).toBe(true);
    });

    it("should return false for isAuthenticated if user is missing even if token exists", () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, "test-token");
      expect(authService.isAuthenticated()).toBe(false);
    });

    it("should retrieve remembered email from localStorage", () => {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, "saved@platform.internal");
      expect(authService.getRememberedEmail()).toBe("saved@platform.internal");
    });

    it("should purge all stored credentials across both storage engines on clearSession", () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, "acc-local");
      localStorage.setItem(REFRESH_TOKEN_KEY, "ref-local");
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));

      sessionStorage.setItem(ACCESS_TOKEN_KEY, "acc-sess");
      sessionStorage.setItem(REFRESH_TOKEN_KEY, "ref-sess");
      sessionStorage.setItem(USER_KEY, JSON.stringify(mockUser));

      authService.clearSession();

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(USER_KEY)).toBeNull();
      expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
      expect(sessionStorage.getItem(USER_KEY)).toBeNull();
    });
  });

  describe("signIn workflow & Remember Me persistence", () => {
    it("should store credentials in localStorage when rememberMe is true", async () => {
      const mockResponse = {
        success: true,
        tokens: {
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        },
        user: mockUser,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await authService.signIn(
        "admin@platform.internal",
        "secret-pass",
        true
      );

      expect(result.tokens?.accessToken).toBe("new-access-token");
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("new-access-token");
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh-token");
      expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBe(
        "admin@platform.internal"
      );
      expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    });

    it("should store credentials in sessionStorage when rememberMe is false", async () => {
      const mockResponse = {
        success: true,
        tokens: {
          accessToken: "session-access-token",
          refreshToken: "session-refresh-token",
        },
        user: mockUser,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      // Pre-set remembered email to ensure it is cleared when rememberMe is false
      localStorage.setItem(REMEMBERED_EMAIL_KEY, "old@platform.internal");

      const result = await authService.signIn(
        "admin@platform.internal",
        "secret-pass",
        false
      );

      expect(result.tokens?.accessToken).toBe("session-access-token");
      expect(sessionStorage.getItem(ACCESS_TOKEN_KEY)).toBe("session-access-token");
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REMEMBERED_EMAIL_KEY)).toBeNull();
    });

    it("should throw AuthError on failed response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          status: "fail",
          message: "Invalid email or password",
        }),
      } as Response);

      await expect(
        authService.signIn("admin@platform.internal", "wrong-pass")
      ).rejects.toThrow(AuthError);
    });
  });

  describe("signOut", () => {
    it("should trigger backend signout and clear session storage", () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      localStorage.setItem(ACCESS_TOKEN_KEY, "active-token");
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser));

      authService.signOut();

      expect(fetchSpy).toHaveBeenCalled();
      expect(authService.getStoredToken()).toBeNull();
      expect(authService.getStoredUser()).toBeNull();
    });
  });
});

