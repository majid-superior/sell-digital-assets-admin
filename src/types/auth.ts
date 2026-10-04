export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: string;
  jti?: string;
  refreshExpiresAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface AuthErrorResponse {
  status?: string;
  message?: string;
  errors?: string[] | Record<string, string>;
}
