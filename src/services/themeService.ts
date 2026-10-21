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
let cachedDbTheme: ActiveThemeData | null = null;

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
    .toLowerCase();
}

function parseHexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Blends hexA toward hexB by weightB (0.0 = 100% hexA, 1.0 = 100% hexB).
 */
export function mixHex(hexA: string, hexB: string, weightB: number): string {
  const rgbA = parseHexToRgb(hexA);
  const rgbB = parseHexToRgb(hexB);
  if (!rgbA) return hexB;
  if (!rgbB) return hexA;
  const w = Math.max(0, Math.min(1, weightB));
  return rgbToHex(
    rgbA[0] * (1 - w) + rgbB[0] * w,
    rgbA[1] * (1 - w) + rgbB[1] * w,
    rgbA[2] * (1 - w) + rgbB[2] * w
  );
}

function getRelativeLuminance(hex: string): number {
  const rgb = parseHexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastOnColor(
  bgHex: string,
  lightText = "#ffffff",
  darkText = "#141313"
): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.34 ? darkText : lightText;
}

/**
 * Derives a complete, hue-harmonized Material 3 token map for both Light and Dark modes
 * from core palette colors (primary, primaryContainer, secondary, tertiary) so that all
 * surfaces, borders, outlines, badges, muted text, and interactive states adapt to any
 * database or preset palette.
 */
export function deriveFullPalette(
  rawLight: Record<string, string> = {},
  rawDark: Record<string, string> = {}
): ColorHexMap {
  const lPrimary = rawLight.primary || COLOR_HEX_MAP.light.primary;
  const lPrimaryContainer =
    rawLight.primaryContainer || mixHex(lPrimary, "#ffffff", 0.2);
  const lSecondary = rawLight.secondary || COLOR_HEX_MAP.light.secondary;
  const lTertiary = rawLight.tertiary || COLOR_HEX_MAP.light.tertiary;

  const dPrimary = rawDark.primary || COLOR_HEX_MAP.dark.primary;
  const dPrimaryContainer =
    rawDark.primaryContainer || mixHex(dPrimary, "#000000", 0.45);
  const dSecondary = rawDark.secondary || COLOR_HEX_MAP.dark.secondary;
  const dTertiary = rawDark.tertiary || COLOR_HEX_MAP.dark.tertiary;

  const isDefaultLight =
    lPrimary.toLowerCase() === COLOR_HEX_MAP.light.primary.toLowerCase() &&
    lSecondary.toLowerCase() === COLOR_HEX_MAP.light.secondary.toLowerCase() &&
    lTertiary.toLowerCase() === COLOR_HEX_MAP.light.tertiary.toLowerCase();

  const isDefaultDark =
    dPrimary.toLowerCase() === COLOR_HEX_MAP.dark.primary.toLowerCase() &&
    dSecondary.toLowerCase() === COLOR_HEX_MAP.dark.secondary.toLowerCase() &&
    dTertiary.toLowerCase() === COLOR_HEX_MAP.dark.tertiary.toLowerCase();

  const lSecondaryContainer =
    rawLight.secondaryContainer ||
    (isDefaultLight
      ? COLOR_HEX_MAP.light.secondaryContainer
      : mixHex(lSecondary, "#ffffff", 0.82));
  const lOnSecondary =
    rawLight.onSecondary ||
    getContrastOnColor(lSecondary, "#ffffff", mixHex(lSecondary, "#000000", 0.8));
  const lOnSecondaryContainer =
    rawLight.onSecondaryContainer ||
    getContrastOnColor(
      lSecondaryContainer,
      "#ffffff",
      mixHex(lSecondary, "#000000", 0.55)
    );

  const lTertiaryContainer =
    rawLight.tertiaryContainer ||
    (isDefaultLight
      ? COLOR_HEX_MAP.light.tertiaryContainer
      : mixHex(lTertiary, "#ffffff", 0.82));
  const lOnTertiary =
    rawLight.onTertiary ||
    getContrastOnColor(lTertiary, "#ffffff", mixHex(lTertiary, "#000000", 0.8));
  const lOnTertiaryContainer =
    rawLight.onTertiaryContainer ||
    getContrastOnColor(
      lTertiaryContainer,
      "#ffffff",
      mixHex(lTertiary, "#000000", 0.55)
    );

  const light: Record<string, string> = isDefaultLight
    ? {
        ...COLOR_HEX_MAP.light,
        ...rawLight,
        success: lSecondary,
        successContainer: lSecondaryContainer,
        onSuccess: lOnSecondary,
        onSuccessContainer: lOnSecondaryContainer,
      }
    : {
        ...COLOR_HEX_MAP.light,
        ...rawLight,
        primary: lPrimary,
        primaryContainer: lPrimaryContainer,
        onPrimary:
          rawLight.onPrimary ||
          getContrastOnColor(lPrimary, "#ffffff", mixHex(lPrimary, "#000000", 0.8)),
        onPrimaryContainer:
          rawLight.onPrimaryContainer ||
          getContrastOnColor(
            lPrimaryContainer,
            "#ffffff",
            mixHex(lPrimary, "#000000", 0.72)
          ),
        primaryFixed: mixHex(lPrimary, "#ffffff", 0.85),
        primaryFixedDim: mixHex(lPrimary, "#ffffff", 0.7),
        onPrimaryFixed: mixHex(lPrimary, "#000000", 0.8),
        onPrimaryFixedVariant: mixHex(lPrimary, "#000000", 0.35),
        inversePrimary: dPrimary,

        secondary: lSecondary,
        secondaryContainer: lSecondaryContainer,
        onSecondary: lOnSecondary,
        onSecondaryContainer: lOnSecondaryContainer,
        secondaryFixed: mixHex(lSecondary, "#ffffff", 0.82),
        secondaryFixedDim: mixHex(lSecondary, "#ffffff", 0.65),
        onSecondaryFixed: mixHex(lSecondary, "#000000", 0.8),
        onSecondaryFixedVariant: mixHex(lSecondary, "#000000", 0.35),

        tertiary: lTertiary,
        tertiaryContainer: lTertiaryContainer,
        onTertiary: lOnTertiary,
        onTertiaryContainer: lOnTertiaryContainer,
        tertiaryFixed: mixHex(lTertiary, "#ffffff", 0.85),
        tertiaryFixedDim: mixHex(lTertiary, "#ffffff", 0.7),
        onTertiaryFixed: mixHex(lTertiary, "#000000", 0.8),
        onTertiaryFixedVariant: mixHex(lTertiary, "#000000", 0.35),

        background: mixHex("#fafafa", lPrimary, 0.015),
        onBackground: mixHex("#18181b", lPrimary, 0.04),
        surface: mixHex("#fafafa", lPrimary, 0.015),
        surfaceDim: mixHex("#dadadd", lPrimary, 0.03),
        surfaceBright: mixHex("#fafafa", lPrimary, 0.015),
        surfaceContainerLowest: "#ffffff",
        surfaceContainerLow: mixHex("#f4f4f6", lPrimary, 0.02),
        surfaceContainer: mixHex("#eeeeef", lPrimary, 0.025),
        surfaceContainerHigh: mixHex("#e8e8ea", lPrimary, 0.03),
        surfaceContainerHighest: mixHex("#e2e2e5", lPrimary, 0.035),
        surfaceVariant: mixHex("#e2e2e5", lPrimary, 0.045),
        onSurface: mixHex("#18181b", lPrimary, 0.04),
        onSurfaceVariant: mixHex("#4a4a52", lPrimary, 0.14),
        surfaceTint: lPrimary,

        outline: mixHex("#767680", lPrimary, 0.14),
        outlineVariant: mixHex("#c8c8d0", lPrimary, 0.16),

        inverseSurface: mixHex("#2f2f32", lPrimary, 0.04),
        inverseOnSurface: mixHex("#f2f2f4", lPrimary, 0.02),

        success: lSecondary,
        successContainer: lSecondaryContainer,
        onSuccess: lOnSecondary,
        onSuccessContainer: lOnSecondaryContainer,
        warning: rawLight.warning || COLOR_HEX_MAP.light.warning,
        warningContainer:
          rawLight.warningContainer || COLOR_HEX_MAP.light.warningContainer,
        onWarning: rawLight.onWarning || COLOR_HEX_MAP.light.onWarning,
        onWarningContainer:
          rawLight.onWarningContainer || COLOR_HEX_MAP.light.onWarningContainer,
      };

  const dSecondaryContainer =
    rawDark.secondaryContainer ||
    (isDefaultDark
      ? COLOR_HEX_MAP.dark.secondaryContainer
      : mixHex(dSecondary, "#000000", 0.62));
  const dOnSecondary =
    rawDark.onSecondary ||
    getContrastOnColor(dSecondary, "#ffffff", mixHex(dSecondary, "#000000", 0.8));
  const dOnSecondaryContainer =
    rawDark.onSecondaryContainer ||
    getContrastOnColor(
      dSecondaryContainer,
      mixHex(dSecondary, "#ffffff", 0.75),
      mixHex(dSecondary, "#000000", 0.8)
    );

  const dTertiaryContainer =
    rawDark.tertiaryContainer ||
    (isDefaultDark
      ? COLOR_HEX_MAP.dark.tertiaryContainer
      : mixHex(dTertiary, "#000000", 0.62));
  const dOnTertiary =
    rawDark.onTertiary ||
    getContrastOnColor(dTertiary, "#ffffff", mixHex(dTertiary, "#000000", 0.8));
  const dOnTertiaryContainer =
    rawDark.onTertiaryContainer ||
    getContrastOnColor(
      dTertiaryContainer,
      mixHex(dTertiary, "#ffffff", 0.75),
      mixHex(dTertiary, "#000000", 0.8)
    );

  const dark: Record<string, string> = isDefaultDark
    ? {
        ...COLOR_HEX_MAP.dark,
        ...rawDark,
        success: dSecondary,
        successContainer: dSecondaryContainer,
        onSuccess: dOnSecondary,
        onSuccessContainer: dOnSecondaryContainer,
      }
    : {
        ...COLOR_HEX_MAP.dark,
        ...rawDark,
        primary: dPrimary,
        primaryContainer: dPrimaryContainer,
        onPrimary:
          rawDark.onPrimary ||
          getContrastOnColor(dPrimary, "#ffffff", mixHex(dPrimary, "#000000", 0.8)),
        onPrimaryContainer:
          rawDark.onPrimaryContainer ||
          getContrastOnColor(
            dPrimaryContainer,
            mixHex(dPrimary, "#ffffff", 0.78),
            mixHex(dPrimary, "#000000", 0.8)
          ),
        primaryFixed: mixHex(dPrimary, "#ffffff", 0.75),
        primaryFixedDim: dPrimary,
        onPrimaryFixed: mixHex(dPrimary, "#000000", 0.85),
        onPrimaryFixedVariant: mixHex(dPrimary, "#000000", 0.55),
        inversePrimary: lPrimary,

        secondary: dSecondary,
        secondaryContainer: dSecondaryContainer,
        onSecondary: dOnSecondary,
        onSecondaryContainer: dOnSecondaryContainer,
        secondaryFixed: mixHex(dSecondary, "#ffffff", 0.75),
        secondaryFixedDim: dSecondary,
        onSecondaryFixed: mixHex(dSecondary, "#000000", 0.85),
        onSecondaryFixedVariant: mixHex(dSecondary, "#000000", 0.6),

        tertiary: dTertiary,
        tertiaryContainer: dTertiaryContainer,
        onTertiary: dOnTertiary,
        onTertiaryContainer: dOnTertiaryContainer,
        tertiaryFixed: mixHex(dTertiary, "#ffffff", 0.75),
        tertiaryFixedDim: dTertiary,
        onTertiaryFixed: mixHex(dTertiary, "#000000", 0.85),
        onTertiaryFixedVariant: mixHex(dTertiary, "#000000", 0.6),

        background: mixHex("#121316", dPrimary, 0.025),
        onBackground: mixHex("#e4e4e7", dPrimary, 0.03),
        surface: mixHex("#121316", dPrimary, 0.025),
        surfaceDim: mixHex("#121316", dPrimary, 0.025),
        surfaceBright: mixHex("#38393e", dPrimary, 0.04),
        surfaceContainerLowest: mixHex("#0d0e11", dPrimary, 0.02),
        surfaceContainerLow: mixHex("#1a1b1f", dPrimary, 0.03),
        surfaceContainer: mixHex("#1e1f24", dPrimary, 0.035),
        surfaceContainerHigh: mixHex("#282a2f", dPrimary, 0.04),
        surfaceContainerHighest: mixHex("#33353b", dPrimary, 0.045),
        surfaceVariant: mixHex("#44464e", dPrimary, 0.12),
        onSurface: mixHex("#e4e4e7", dPrimary, 0.03),
        onSurfaceVariant: mixHex("#c4c5ce", dPrimary, 0.14),
        surfaceTint: dPrimary,

        outline: mixHex("#8e9099", dPrimary, 0.14),
        outlineVariant: mixHex("#44464e", dPrimary, 0.15),

        inverseSurface: mixHex("#e4e4e7", dPrimary, 0.03),
        inverseOnSurface: mixHex("#2f3033", dPrimary, 0.04),

        success: dSecondary,
        successContainer: dSecondaryContainer,
        onSuccess: dOnSecondary,
        onSuccessContainer: dOnSecondaryContainer,
        warning: rawDark.warning || COLOR_HEX_MAP.dark.warning,
        warningContainer:
          rawDark.warningContainer || COLOR_HEX_MAP.dark.warningContainer,
        onWarning: rawDark.onWarning || COLOR_HEX_MAP.dark.onWarning,
        onWarningContainer:
          rawDark.onWarningContainer || COLOR_HEX_MAP.dark.onWarningContainer,
      };

  return { light, dark };
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
      colorHexMap: deriveFullPalette(COLOR_HEX_MAP.light, COLOR_HEX_MAP.dark),
    };
  }

  const obj = res as Record<string, unknown>;
  const raw = (obj.data && typeof obj.data === "object" ? obj.data : obj) as Record<string, unknown>;

  const rawMap = (raw.colorHexMap || raw.color_hex_map || {}) as Record<string, unknown>;
  const lightMap = (rawMap.light && typeof rawMap.light === "object" ? rawMap.light : {}) as Record<string, string>;
  const darkMap = (rawMap.dark && typeof rawMap.dark === "object" ? rawMap.dark : {}) as Record<string, string>;

  const derivedMap = deriveFullPalette(lightMap, darkMap);

  return {
    id: typeof raw.id === "number" ? raw.id : 1,
    name: typeof raw.name === "string" ? raw.name : "Active Theme",
    slug: typeof raw.slug === "string" ? raw.slug : "active-theme",
    isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
    colorHexMap: derivedMap,
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

  const derived = deriveFullPalette(colorHexMap.light || {}, colorHexMap.dark || {});
  const light = derived.light;
  const dark = derived.dark;

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

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("theme:updated", { detail: derived }));
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
        cachedDbTheme = normalized;
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
   * Returns last-known persisted database theme (unaffected by unsaved local previews).
   */
  getCachedDatabaseTheme(): ActiveThemeData | null {
    return cachedDbTheme ?? cachedTheme;
  },

  /**
   * Updates in-memory cached theme and DOM variables immediately (e.g. when selecting a palette preset).
   */
  setLocalThemePreview(colorHexMap: ColorHexMap, name = "Custom Brand Theme"): ActiveThemeData {
    const normalized = unwrapThemeResponse({
      id: cachedTheme?.id ?? 1,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
      colorHexMap,
    });
    cachedTheme = normalized;
    try {
      localStorage.setItem("sda_active_theme", JSON.stringify(normalized));
    } catch {
      // Ignore storage errors
    }
    applyThemeToDom(normalized.colorHexMap);
    return normalized;
  },

  /**
   * Restores the in-memory and DOM theme to the last-known database theme.
   */
  resetToDatabaseTheme(): ActiveThemeData | null {
    const target = cachedDbTheme ?? cachedTheme;
    if (!target) return null;
    cachedTheme = target;
    try {
      localStorage.setItem("sda_active_theme", JSON.stringify(target));
    } catch {
      // Ignore storage errors
    }
    applyThemeToDom(target.colorHexMap);
    return target;
  },

  /**
   * Clears in-memory theme cache and re-synchronizes with the active database theme.
   */
  clearCache(): void {
    cachedTheme = cachedDbTheme;
    if (cachedDbTheme) {
      applyThemeToDom(cachedDbTheme.colorHexMap);
    } else {
      try {
        localStorage.removeItem("sda_active_theme");
        localStorage.removeItem("theme_css");
      } catch {
        // Ignore storage errors
      }
      this.getActiveTheme({ silent: true }).catch(() => {
        // Ignore background errors
      });
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
      const res = await apiRequest<unknown>("/api/v1/theme/active", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      }).catch(async (err: unknown) => {
        if (err instanceof ApiError && (err.statusCode === 404 || err.statusCode === 0)) {
          return apiRequest<unknown>("/api/v1/theme", {
            method: "GET",
            silent: options?.silent,
            signal: options?.signal,
          });
        }
        throw err;
      });

      const themeData = unwrapThemeResponse(res);
      cachedTheme = themeData;
      cachedDbTheme = themeData;

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
        colorHexMap: deriveFullPalette(COLOR_HEX_MAP.light, COLOR_HEX_MAP.dark),
      };
      cachedTheme = fallback;
      cachedDbTheme = fallback;
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
      const derivedPayload: UpdateThemePayload = payload.color_hex_map
        ? {
            ...payload,
            color_hex_map: deriveFullPalette(
              payload.color_hex_map.light || {},
              payload.color_hex_map.dark || {}
            ),
          }
        : payload;

      const res = await apiRequest<unknown>("/api/v1/theme", {
        method: "PUT",
        body: JSON.stringify(derivedPayload),
        signal: options?.signal,
      });

      const updated = unwrapThemeResponse(res);
      cachedTheme = updated;
      cachedDbTheme = updated;

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
