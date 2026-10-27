import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { User, SignInResponse } from "@/types/auth.ts";
import { AuthContext, type AuthContextType } from "@/context/authContext.ts";
import { authService, AuthError, ACCESS_TOKEN_KEY, USER_KEY } from "@/services/authService.ts";
import { organizationService } from "@/services/organizationService.ts";
import { toast } from "sonner";

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  // Only block initial render if credentials exist but stored user metadata is missing
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = Boolean(authService.getStoredToken() || authService.getStoredRefreshToken());
    const hasUser = Boolean(authService.getStoredUser());
    return hasToken && !hasUser;
  });

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Failsafe watchdog: ensure isLoading is never stuck true for more than 4 seconds
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(() => {
    return organizationService.getCachedSystemSettings()?.sessionIdleTimeoutMinutes || 30;
  });

  const isExpiringRef = React.useRef(false);

  const handleSessionExpired = useCallback((message?: string) => {
    if (isExpiringRef.current) return;
    isExpiringRef.current = true;
    setTimeout(() => {
      isExpiringRef.current = false;
    }, 1500);

    const hadSession = Boolean(
      authService.getStoredToken() ||
        authService.getStoredRefreshToken() ||
        userRef.current
    );
    authService.clearSession();
    setUser(null);
    setToken(null);
    setIsLoading(false);

    if (hadSession) {
      toast.error("Session Expired", {
        description: message || "Your session has expired. Please sign in again.",
      });
    }
  }, []);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      rememberMe = false
    ): Promise<SignInResponse> => {
      setIsLoading(true);
      try {
        const response = await authService.signIn(email, password, rememberMe);
        authService.updateLastActivity();
        setUser(response.user);
        setToken(response.tokens.accessToken);
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signOut = useCallback(() => {
    authService.signOut();
    setUser(null);
    setToken(null);
    setIsLoading(false);
    toast.success("Signed out successfully", {
      description: "You have signed out of the admin console.",
    });
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  // Verify stored session against backend on initial mount
  useEffect(() => {
    const controller = new AbortController();

    async function verifySession() {
      const storedToken = authService.getStoredToken();
      const refreshToken = authService.getStoredRefreshToken();

      if (!storedToken && !refreshToken) {
        if (!controller.signal.aborted) setIsLoading(false);
        return;
      }

      // 1. Check persisted idle timeout across browser/PC restarts
      const timeoutMs = (idleTimeoutMinutes || 30) * 60 * 1000;
      const lastActivity = authService.getLastActivity();
      if (lastActivity && Date.now() - lastActivity >= timeoutMs) {
        if (!controller.signal.aborted) {
          handleSessionExpired(
            "Your admin session has ended due to inactivity. Please sign in again."
          );
        }
        return;
      }

      let isPermanentAuthFailure = false;

      // 2. Verify current access token against /api/v1/auth/me
      if (storedToken) {
        try {
          const freshUser = await authService.getCurrentUser({ signal: controller.signal });
          if (!controller.signal.aborted) {
            authService.updateLastActivity();
            setUser(freshUser);
            setToken(authService.getStoredToken());
            setIsLoading(false);
            return;
          }
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          if (err instanceof AuthError && (err.statusCode === 401 || err.statusCode === 403)) {
            isPermanentAuthFailure = true;
          } else if (
            err instanceof AuthError &&
            (err.statusCode === 0 || (err.statusCode && err.statusCode >= 500))
          ) {
            // Infrastructure or network unavailable: preserve session per GEMINI.md standards
            setIsLoading(false);
            return;
          }
        }
      }

      // 3. Attempt silent refresh if access token expired
      if (refreshToken && isPermanentAuthFailure) {
        try {
          const newAccessToken = await authService.refreshSession({ signal: controller.signal });
          if (newAccessToken && !controller.signal.aborted) {
            const freshUser = authService.getStoredUser();
            authService.updateLastActivity();
            if (freshUser) {
              setUser(freshUser);
            }
            setToken(newAccessToken);
            setIsLoading(false);
            isPermanentAuthFailure = false;
            return;
          }
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          if (
            err instanceof AuthError &&
            (err.statusCode === 0 || (err.statusCode && err.statusCode >= 500))
          ) {
            // Network or server error during refresh: do not terminate session
            setIsLoading(false);
            return;
          }
        }
      }

      // 4. Terminate session ONLY on definitive 401/403 authorization rejection
      if (!controller.signal.aborted) {
        if (isPermanentAuthFailure) {
          handleSessionExpired("Your admin session has ended. Please sign in again.");
        } else {
          setIsLoading(false);
        }
      }
    }

    verifySession()
      .catch(() => {
        // Prevent unhandled promise rejection
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [handleSessionExpired, idleTimeoutMinutes]);

  // Bootstrap system settings from server when authenticated to enforce accurate organizational policy
  useEffect(() => {
    if (!token || !user || isLoading) return;
    const controller = new AbortController();

    organizationService
      .getSystemSettings({ silent: true, signal: controller.signal })
      .then((settings) => {
        if (
          settings?.sessionIdleTimeoutMinutes &&
          typeof settings.sessionIdleTimeoutMinutes === "number"
        ) {
          setIdleTimeoutMinutes(settings.sessionIdleTimeoutMinutes);
        }
      })
      .catch(() => {});

    return () => {
      controller.abort();
    };
  }, [token, user, isLoading]);

  // Reactive listener for system settings changes across tabs/modals
  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ sessionIdleTimeoutMinutes?: number }>;
      if (
        customEvent.detail &&
        typeof customEvent.detail.sessionIdleTimeoutMinutes === "number"
      ) {
        setIdleTimeoutMinutes(customEvent.detail.sessionIdleTimeoutMinutes);
      }
    };

    window.addEventListener("system-settings:updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("system-settings:updated", handleSettingsUpdated);
    };
  }, []);

  // Tab revisit listener: smoothly validate and refresh expired tokens when switching back to tab
  useEffect(() => {
    if (!token || !user) return;

    const handleTabRevisit = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;

      const timeoutMs = (idleTimeoutMinutes || 30) * 60 * 1000;
      const lastActivity = authService.getLastActivity();
      if (lastActivity && Date.now() - lastActivity >= timeoutMs) {
        handleSessionExpired(
          "Your admin session has ended due to inactivity. Please sign in again."
        );
        return;
      }

      // Record activity on tab focus
      authService.updateLastActivity();

      // Silently check session validity or refresh in background
      try {
        await authService.getCurrentUser({ timeoutMs: 5000 });
      } catch (err: unknown) {
        if (err instanceof AuthError && (err.statusCode === 401 || err.statusCode === 403)) {
          // Token expired while away: silently refresh
          const newToken = await authService.refreshSession({ timeoutMs: 5000 });
          if (newToken) {
            const updatedUser = authService.getStoredUser();
            setToken(newToken);
            if (updatedUser) setUser(updatedUser);
          } else {
            handleSessionExpired("Your admin session has ended. Please sign in again.");
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleTabRevisit);
    window.addEventListener("focus", handleTabRevisit);

    return () => {
      document.removeEventListener("visibilitychange", handleTabRevisit);
      window.removeEventListener("focus", handleTabRevisit);
    };
  }, [token, user, idleTimeoutMinutes, handleSessionExpired]);

  // Idle Activity Monitor: Automatically terminate session when admin is inactive beyond idleTimeoutMinutes
  useEffect(() => {
    if (!token || !user || isLoading) return;

    const timeoutMs = idleTimeoutMinutes * 60 * 1000;
    let lastRecorded = authService.getLastActivity() || Date.now();
    authService.updateLastActivity(lastRecorded);

    const onActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 10000) {
        lastRecorded = now;
        authService.updateLastActivity(now);
      }
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "focus"];
    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    );

    const interval = setInterval(() => {
      const persistedLastActivity = authService.getLastActivity() || lastRecorded;
      const idleTime = Date.now() - persistedLastActivity;
      if (idleTime >= timeoutMs) {
        clearInterval(interval);
        handleSessionExpired(
          "Your admin session has ended due to inactivity. Please sign in again."
        );
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [token, user, isLoading, idleTimeoutMinutes, handleSessionExpired]);

  // Synchronize when session expires or refreshes in apiClient or across tabs
  useEffect(() => {
    const onSessionExpired = () => {
      handleSessionExpired("Your session has ended. Please sign in again.");
    };

    const onTokenRefreshed = (e: Event) => {
      const custom = e as CustomEvent<{ token?: string; user?: User }>;
      if (custom.detail?.token) {
        setToken(custom.detail.token);
      }
      if (custom.detail?.user) {
        setUser(custom.detail.user);
      }
    };

    const onStorageChange = (e: StorageEvent) => {
      if (e.key === ACCESS_TOKEN_KEY && !e.newValue) {
        authService.clearSession();
        setUser(null);
        setToken(null);
        setIsLoading(false);
      } else if (e.key === USER_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue) as User);
        } catch {
          // Ignore malformed JSON
        }
      }
    };

    window.addEventListener("auth:session-expired", onSessionExpired);
    window.addEventListener("auth:token-refreshed", onTokenRefreshed);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener("auth:session-expired", onSessionExpired);
      window.removeEventListener("auth:token-refreshed", onTokenRefreshed);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [handleSessionExpired]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated:
        !isLoading &&
        Boolean(
          token &&
            user &&
            String(user.role || "").toLowerCase().trim() === "admin"
        ),
      isLoading,
      signIn,
      signOut,
      updateUser,
    }),
    [user, token, isLoading, signIn, signOut, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
