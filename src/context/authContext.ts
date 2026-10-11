import { createContext } from "react";
import type { User, SignInResponse } from "@/types/auth.ts";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<SignInResponse>;
  signOut: () => void;
  updateUser: (updatedUser: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
