import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { User, SignInResponse } from "@/types/auth.ts";
import { AuthContext, type AuthContextType } from "@/context/authContext.ts";
import { authService, ACCESS_TOKEN_KEY, USER_KEY } from "@/services/authService.ts";
import { organizationService } from "@/services/organizationService.ts";
import { toast } from "sonner";

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  // Keep isLoading = true on startup when stored tokens exist until verified against /api/v1/auth/me
  const [isLoading, setIsLoading] = useState<boolean>(() =>
    Boolean(authService.getStoredToken() || authService.getStoredRefreshToken())
  );

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const hasVerifiedOnMount = React.useRef(false);

  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState<number>(() => {
    return organizationService.getCachedSystemSettings()?.sessionIdleTimeoutMinutes || 30;
  });

  const handleSessionExpired = useCallback((message?: string) => {
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
        description: message || "Your session has ended. Please sign in again.",
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
        hasVerifiedOnMount.current = true;
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
    if (hasVerifiedOnMount.current) return;
    hasVerifiedOnMount.current = true;

    let isMounted = true;

    async function verifySession() {
      const storedToken = authService.getStoredToken();
      const refreshToken = authService.getStoredRefreshToken();

      if (!storedToken && !refreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // 1. Check persisted idle timeout across browser/PC restarts
      const timeoutMs = (idleTimeoutMinutes || 30) * 60 * 1000;
      const lastActivity = authService.getLastActivity();
      if (lastActivity && Date.now() - lastActivity >= timeoutMs) {
        if (isMounted) {
          handleSessionExpired(
            "Your admin session has ended due to inactivity. Please sign in again."
          );
        }
        return;
      }

      // 2. Verify current access token against /api/v1/auth/me
      if (storedToken) {
        try {
          const freshUser = await authService.getCurrentUser();
          if (isMounted) {
            authService.updateLastActivity();
            setUser(freshUser);
            setToken(authService.getStoredToken());
            setIsLoading(false);
            return;
          }
        } catch {
          // Fall through to refresh attempt
        }
      }

      // 3. Attempt silent refresh if access token expired
      if (refreshToken) {
        try {
          const newAccessToken = await authService.refreshSession();
          if (newAccessToken) {
            const freshUser = await authService.getCurrentUser();
            if (isMounted) {
              authService.updateLastActivity();
              setUser(freshUser);
              setToken(newAccessToken);
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // Refresh or verification failed
        }
      }

      // 4. Both access token and refresh failed (or role is not admin / server unreachable): clear session
      if (isMounted) {
        handleSessionExpired("Your admin session has ended. Please sign in again.");
      }
    }

    void verifySession();

    return () => {
      isMounted = false;
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

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
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
