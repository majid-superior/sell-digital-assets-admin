import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./provider/ThemeProvider.tsx";
import { AuthProvider } from "./provider/AuthProvider.tsx";
import { themeService } from "./services/index.ts";

// Bootstrap dynamic theme tokens (0ms cached paint + silent background sync)
themeService.initThemeBootstrap();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
