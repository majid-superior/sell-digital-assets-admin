/**
 * Centralized application environment configuration
 */
const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.API_BASE_URL as string | undefined) ||
  "http://localhost:5000";

export const API_BASE_URL: string = rawBaseUrl.replace(/\/+$/, "");
