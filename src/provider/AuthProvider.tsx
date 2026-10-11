import React, { useState, useCallback, useMemo } from "react";
import type { User, SignInResponse } from "@/types/auth.ts";
import { AuthContext, type AuthContextType } from "@/context/authContext.ts";
import { authService } from "@/services/authService.ts";

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

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
