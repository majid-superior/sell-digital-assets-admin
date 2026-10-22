import React, { useCallback, useEffect, useState, useMemo } from "react";
import { ThemeContext, type Theme } from "@/context/themeContext";
import { themeService } from "@/services/themeService.ts";

export interface ThemeProviderProps {
  children: React.ReactNode;
  storageKey?: string;
  defaultTheme?: Theme;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  storageKey = "theme",
  defaultTheme = "dark",
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "dark" || stored === "light") return stored;
    } catch {
      // Handle private browsing storage restrictions
    }
    return defaultTheme;
  });

  // Load and apply active theme colors from PostgreSQL database
  useEffect(() => {
    themeService.getActiveTheme({ silent: true }).catch(() => {
      // Gracefully handled in themeService
    });
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Handle private browsing storage restrictions
      }
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Ignore storage access errors in private browsing modes
      }
      return next;
    });
  }, [storageKey]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    }
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key !== storageKey) return;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored === "dark" || stored === "light") {
          setThemeState(stored);
        } else {
          setThemeState(defaultTheme);
        }
      } catch {
        setThemeState(defaultTheme);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey, defaultTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
