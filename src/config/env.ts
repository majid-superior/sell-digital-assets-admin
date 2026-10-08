/**
 * Centralized application environment configuration
 */
const isProd = import.meta.env.PROD;
const envBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  (import.meta.env.API_BASE_URL as string | undefined);

if (isProd && !envBaseUrl) {
  console.warn(
    "[ENV WARNING] VITE_API_BASE_URL is not defined in production build. Requests will fallback to origin."
  );
}

const rawBaseUrl = envBaseUrl || (isProd ? "" : "http://localhost:5000");

export const API_BASE_URL: string = rawBaseUrl.replace(/\/+$/, "");
