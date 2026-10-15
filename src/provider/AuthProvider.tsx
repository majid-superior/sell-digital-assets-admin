import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { User, SignInResponse } from "@/types/auth.ts";
import { AuthContext, type AuthContextType } from "@/context/authContext.ts";
import { authService } from "@/services/authService.ts";
import { organizationService } from "@/services/organizationService.ts";
import { toast } from "sonner";

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const handleSessionExpired = useCallback((message?: string) => {
    const hadSession = Boolean(authService.getStoredToken() || authService.getStoredRefreshToken() || userRef.current);
    authService.clearSession();
    setUser(null);
    setToken(null);

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
    toast.success("Signed out successfully", {
      description: "You have signed out of the admin console.",
    });
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  // Idle Activity Monitor: Automatically terminate session when admin is inactive beyond sessionIdleTimeoutMinutes
  useEffect(() => {
    if (!token || !user) return;

    const settings = organizationService.getCachedSystemSettings();
    const timeoutMinutes = settings?.sessionIdleTimeoutMinutes || 30;
    const timeoutMs = timeoutMinutes * 60 * 1000;

    let lastActivity = Date.now();

    const onActivity = () => {
      lastActivity = Date.now();
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const interval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime >= timeoutMs) {
        clearInterval(interval);
        handleSessionExpired("Your admin session has ended due to inactivity. Please sign in again.");
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      events.forEach((evt) => window.removeEventListener(evt, onActivity));
    };
  }, [token, user, handleSessionExpired]);

  // Synchronize when session expires in apiClient
  useEffect(() => {
    const onSessionExpired = () => {
      handleSessionExpired("Your session has ended. Please sign in again.");
    };

    window.addEventListener("auth:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", onSessionExpired);
    };
  }, [handleSessionExpired]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
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
