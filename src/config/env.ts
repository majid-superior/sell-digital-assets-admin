/**
 * Centralized application environment configuration
 */
const isProd = import.meta.env.PROD;
const envBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.API_BASE_URL as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  "";

if (isProd && !envBaseUrl) {
  console.warn(
    "[ENV WARNING] VITE_API_BASE_URL is not defined in production build. Requests will fallback to origin.",
  );
}

const rawBaseUrl = envBaseUrl || (isProd ? "" : "http://localhost:5000");

/**
 * Base origin / host URL (without trailing slashes and without redundant API version paths)
 */
export const API_BASE_URL: string = rawBaseUrl
  .replace(/\/+$/, "")
  .replace(/\/api\/v1$/, "")
  .replace(/\/api$/, "");
