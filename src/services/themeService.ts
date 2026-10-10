import { apiRequest, ApiError } from "./apiClient.ts";
import { COLOR_HEX_MAP } from "@/theme/tokens/colors.ts";

export interface ColorHexMap {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface ActiveThemeData {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  colorHexMap: ColorHexMap;
  colorTokens?: Record<string, string>;
  updatedAt?: string;
  etag?: string;
}

export interface ThemeApiResponse {
  success: boolean;
  data: ActiveThemeData;
  message?: string;
}

export interface UpdateThemePayload {
  color_hex_map?: {
    light?: Record<string, string>;
    dark?: Record<string, string>;
  };
  color_tokens?: Record<string, string>;
  name?: string;
}

export class ThemeServiceError extends ApiError {}

let cachedTheme: ActiveThemeData | null = null;

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Robust response normalizer: handles both raw payload and { success, data } structures.
 */
function unwrapThemeResponse(res: unknown): ActiveThemeData {
  if (!res || typeof res !== "object") {
    return {
      id: 1,
      name: "Default Theme",
      slug: "default",
      isActive: true,
      colorHexMap: {
        light: { ...COLOR_HEX_MAP.light },
        dark: { ...COLOR_HEX_MAP.dark },
      },
    };
  }

  const obj = res as Record<string, unknown>;
  const raw = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<string, unknown>;

  const rawMap = (raw.colorHexMap || raw.color_hex_map || {}) as Record<string, unknown>;
  const lightMap = (rawMap.light && typeof rawMap.light === "object" ? rawMap.light : {}) as Record<string, string>;
  const darkMap = (rawMap.dark && typeof rawMap.dark === "object" ? rawMap.dark : {}) as Record<string, string>;

  const mergedLight: Record<string, string> = {
    ...COLOR_HEX_MAP.light,
    ...lightMap,
  };
  const mergedDark: Record<string, string> = {
    ...COLOR_HEX_MAP.dark,
    ...darkMap,
  };

  return {
    id: typeof raw.id === "number" ? raw.id : 1,
    name: typeof raw.name === "string" ? raw.name : "Active Theme",
    slug: typeof raw.slug === "string" ? raw.slug : "active-theme",
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    colorHexMap: {
      light: mergedLight,
      dark: mergedDark,
    },
    colorTokens: (raw.colorTokens || raw.color_tokens || {}) as Record<string, string>,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    etag: typeof raw.etag === "string" ? raw.etag : undefined,
  };
}

/**
 * Applies dynamic color CSS variables into document head so all Tailwind @theme tokens re-render in real time.
 */
export function applyThemeToDom(colorHexMap?: ColorHexMap | null): void {
  if (typeof document === "undefined" || !colorHexMap) return;

  const light = colorHexMap.light || {};
  const dark = colorHexMap.dark || {};

  const lightRules: string[] = [];
  for (const [key, val] of Object.entries(light)) {
    if (val && typeof val === "string") {
      const kebab = camelToKebab(key);
      lightRules.push(`  --color-${kebab}: ${val} !important;`);
    }
  }

  const darkRules: string[] = [];
  for (const [key, val] of Object.entries(dark)) {
    if (val && typeof val === "string") {
      const kebab = camelToKebab(key);
      darkRules.push(`  --color-${kebab}: ${val} !important;`);
    }
  }

  const css = `
:root {
${lightRules.join("\n")}
}
.dark, [data-theme="dark"] {
${darkRules.join("\n")}
}
`;

  let styleTag = document.getElementById("dynamic-theme-vars") as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "dynamic-theme-vars";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = css;

  try {
    localStorage.setItem("theme_css", css);
  } catch {
    // Ignore storage errors
  }
}

export const themeService = {
  /**
   * Fast bootstrap called at application launch (main.tsx).
   * Reads from localStorage cache if available for instant 0ms paint, then silently syncs with PostgreSQL.
   */
  initThemeBootstrap(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("sda_active_theme");
      if (stored) {
        const parsed = JSON.parse(stored) as ActiveThemeData;
        const normalized = unwrapThemeResponse(parsed);
        cachedTheme = normalized;
        applyThemeToDom(normalized.colorHexMap);
      }
    } catch {
      // Ignore parse errors
    }

    // Silent background sync with backend database
    this.getActiveTheme({ silent: true }).catch(() => {
      // Handled internally
    });
  },

  /**
   * Returns current in-memory cached theme if already fetched.
   */
  getCachedTheme(): ActiveThemeData | null {
    return cachedTheme;
  },

  /**
   * Clears in-memory theme cache.
   */
  clearCache(): void {
    cachedTheme = null;
    try {
      localStorage.removeItem("sda_active_theme");
      localStorage.removeItem("theme_css");
    } catch {
      // Ignore storage errors
    }
  },

  /**
   * Fetches active theme from backend PostgreSQL database and applies to DOM.
   */
  async getActiveTheme(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<ActiveThemeData> {
    try {
      const res = await apiRequest<unknown>("/api/theme/active", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      }).catch(async (err: unknown) => {
        if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 0)) {
          return apiRequest<unknown>("/api/theme", {
            method: "GET",
            silent: options?.silent,
            signal: options?.signal,
          });
        }
        throw err;
      });

      const themeData = unwrapThemeResponse(res);
      cachedTheme = themeData;

      try {
        localStorage.setItem("sda_active_theme", JSON.stringify(themeData));
      } catch {
        // Ignore storage errors
      }

      applyThemeToDom(themeData.colorHexMap);
      return themeData;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      if (cachedTheme) return cachedTheme;

      // Fallback to default design tokens if API is unreachable
      const fallback: ActiveThemeData = {
        id: 1,
        name: "Default Theme",
        slug: "default",
        isActive: true,
        colorHexMap: {
          light: { ...COLOR_HEX_MAP.light },
          dark: { ...COLOR_HEX_MAP.dark },
        },
      };
      cachedTheme = fallback;
      applyThemeToDom(fallback.colorHexMap);
      return fallback;
    }
  },

  /**
   * Updates active theme colors directly in PostgreSQL database and re-applies to DOM.
   */
  async updateActiveTheme(
    payload: UpdateThemePayload,
    options?: { signal?: AbortSignal }
  ): Promise<ActiveThemeData> {
    try {
      const res = await apiRequest<unknown>("/api/theme", {
        method: "PUT",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      const updated = unwrapThemeResponse(res);
      cachedTheme = updated;

      try {
        localStorage.setItem("sda_active_theme", JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }

      applyThemeToDom(updated.colorHexMap);
      return updated;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new ThemeServiceError(err.message, err.statusCode, err.details);
      }
      throw err;
    }
  },
};

export default themeService;
