import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl =
    process.env.VITE_API_BASE_URL ||
    process.env.API_BASE_URL ||
    env.VITE_API_BASE_URL ||
    env.API_BASE_URL ||
    "http://localhost:5000";

  return {
    plugins: [react(), tailwindcss()],
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
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
