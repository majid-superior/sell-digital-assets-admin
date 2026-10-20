/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

function htmlTemplatePlugin(orgTitle = "AssetDrop") {
  return {
    name: "html-template-transform",
    transformIndexHtml(html: string) {
      const escape = (str: string) =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");

      return html
        .replace(/\$\{escapeHtml\(organization\.title\)\}/g, escape(orgTitle))
        .replace(/\$\{escapeHtml\(organization\.name\)\}/g, escape(orgTitle))
        .replace(/\$\{escapeHtml\(organization\.shortName\)\}/g, escape(orgTitle))
        .replace(
          /\$\{escapeHtml\(organization\.description\)\}/g,
          escape("Enterprise digital assets marketplace administration."),
        )
        .replace(/\$\{escapeHtml\(organization\.favicon\.url\)\}/g, "/favicon.ico")
        .replace(/\$\{escapeHtml\(organization\.favicon\.type\)\}/g, "image/x-icon");
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  const configuredApiUrl = (
    process.env.VITE_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.VITE_API_URL ||
    env.VITE_API_BASE_URL ||
    env.API_BASE_URL ||
    env.VITE_API_URL ||
    ""
  ).trim();

  // Extract clean origin for backend proxy target (ensures no duplicate /api or /api/v1)
  const proxyTarget = (() => {
    if (!configuredApiUrl) return "http://localhost:5000";
    if (configuredApiUrl.startsWith("http://") || configuredApiUrl.startsWith("https://")) {
      try {
        return new URL(configuredApiUrl).origin;
      } catch {
        return configuredApiUrl.replace(/\/api(\/v1)?\/?$/, "");
      }
    }
    return "http://localhost:5000";
  })();

  // In production, fallback to empty string so requests route relatively to current origin/reverse proxy
  // In development, default to local backend "http://localhost:5000"
  const apiBaseUrl = (configuredApiUrl || (isProd ? "" : "http://localhost:5000"))
    .replace(/\/+$/, "")
    .replace(/\/api\/v1$/, "")
    .replace(/\/api$/, "");
  const orgTitle =
    process.env.VITE_APP_ORGANIZATION_TITLE ||
    env.VITE_APP_ORGANIZATION_TITLE ||
    "AssetDrop";

  return {
    plugins: [react(), tailwindcss(), htmlTemplatePlugin(orgTitle)],
    define: {
      "import.meta.env.API_BASE_URL": JSON.stringify(apiBaseUrl),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
      "process.env.API_BASE_URL": JSON.stringify(apiBaseUrl),
      "process.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
    },
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 5174,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  };
});
