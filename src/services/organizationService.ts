import { apiRequest, ApiError } from "./apiClient.ts";

export interface SystemSettings {
  sessionIdleTimeoutMinutes: number;
  accessTokenTtlMinutes: number;
  refreshTokenTtlDays: number;
  rememberMeTtlDays: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  requireSpecialChar: boolean;
  allowUserRegistration: boolean;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
}

export const defaultSystemSettings: SystemSettings = {
  sessionIdleTimeoutMinutes: 30,
  accessTokenTtlMinutes: 15,
  refreshTokenTtlDays: 7,
  rememberMeTtlDays: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  passwordMinLength: 8,
  requireSpecialChar: false,
  allowUserRegistration: true,
  requireEmailVerification: false,
  maintenanceMode: false,
};

export interface OrganizationInfo {
  name: string;
  shortName: string;
  title: string;
  tagline: string;
  description: string;
  address: string;
  website: string;
  supportEmail: string;
  defaultCurrency: string;
  currencySymbol: string;
  feePercentage: number;
  minPayout: number;
  logoUrl?: string;
  logoDarkUrl?: string;
  faviconUrl?: string;
  systemSettings?: SystemSettings;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export interface SystemHealthData {
  overallStatus: "operational" | "degraded";
  backendWorking: boolean;
  s3Working: boolean;
  statusMessage: string;
  server: {
    status: string;
    uptimeFormatted?: string;
  };
  database: {
    connected: boolean;
  };
  s3: {
    connected: boolean;
    message?: string;
  };
}

// In-memory client cache (persists during active session across tab switches)
let cachedOrganization: OrganizationInfo | null = null;
let cachedCurrencies: CurrencyOption[] | null = null;
let cachedSystemSettings: SystemSettings | null = null;
let cachedHealth: SystemHealthData | null = null;

export interface BackendOrganizationPayload {
  id?: number;
  organization_name: string;
  legal_name: string;
  tagline?: string | null;
  description?: string | null;
  logo_url?: string | null;
  logo_dark_url?: string | null;
  favicon_url?: string | null;
  cover_banner_url?: string | null;
  support_email: string;
  contact_email?: string | null;
  support_phone?: string | null;
  support_url?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  tax_id?: string | null;
  default_currency: string;
  currency?: {
    code: string;
    name: string;
    symbol: string;
  } | null;
  currency_name?: string | null;
  currency_symbol?: string | null;
  platform_fee_percent: string | number;
  payout_minimum: string | number;
  metadata?: {
    links?: {
      website?: string;
    };
  } | null;
}

export class OrganizationServiceError extends ApiError {}

export const KNOWN_CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
  CNY: "¥",
};

export function resolveCurrencySymbol(
  code?: string,
  rawSymbol?: string | null,
): string {
  if (rawSymbol && rawSymbol.trim()) return rawSymbol.trim();
  if (!code) return "₨";
  const upper = code.toUpperCase().trim();
  return KNOWN_CURRENCY_SYMBOLS[upper] || upper;
}

export function formatCurrencyAmount(
  amount: number | string,
  symbol = "₨",
): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

function mapBackendToOrganizationInfo(
  b: BackendOrganizationPayload,
): OrganizationInfo {
  const addressParts = [b.address_line1, b.city, b.state, b.country].filter(
    Boolean,
  );
  const address = addressParts.join(", ") || b.address_line1 || "";
  const website = b.metadata?.links?.website || b.support_url || "";
  const defaultCurrency = b.default_currency || "PKR";
  const currencySymbol = resolveCurrencySymbol(
    defaultCurrency,
    b.currency?.symbol || b.currency_symbol,
  );

  const orgName = b.organization_name || b.legal_name || "";

  return {
    name: b.legal_name || orgName || "",
    shortName: orgName || "",
    title: orgName || b.legal_name || "",
    tagline: b.tagline || "",
    description: b.description || "",
    address: address || "",
    website: website,
    supportEmail: b.support_email || b.contact_email || "",
    defaultCurrency: defaultCurrency,
    currencySymbol: currencySymbol,
    feePercentage: Number(b.platform_fee_percent) || 5.0,
    minPayout: Number(b.payout_minimum) || 50.0,
    logoUrl: b.logo_url || undefined,
    logoDarkUrl: b.logo_dark_url || undefined,
    faviconUrl: b.favicon_url || undefined,
  };
}

export const STORAGE_KEY_ORGANIZATION_TITLE = "organization_title";
export const STORAGE_KEY_ORGANIZATION_FAVICON = "organization_favicon";

export function updateDocumentTitle(title?: string | null): void {
  if (typeof document === "undefined") return;
  const orgTitle = title?.trim() || "AssetDrop";
  document.title = `${orgTitle} | Admin`;
}

export function updateFavicon(faviconUrl?: string | null): void {
  if (typeof document === "undefined" || !faviconUrl) return;
  const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
  if (link) {
    link.href = faviconUrl;
  }
}

export function applyOrganizationMetadata(info: OrganizationInfo | null): void {
  if (!info) return;
  const title = info.title || info.shortName || info.name || "AssetDrop";
  updateDocumentTitle(title);
  try {
    localStorage.setItem(STORAGE_KEY_ORGANIZATION_TITLE, title);
    if (info.faviconUrl) {
      localStorage.setItem(STORAGE_KEY_ORGANIZATION_FAVICON, info.faviconUrl);
      updateFavicon(info.faviconUrl);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export const organizationService = {
  /**
   * Fast bootstrap called at application launch (main.tsx).
   * Reads from localStorage cache if available for instant 0ms title paint, then silently syncs with PostgreSQL.
   */
  initOrganizationBootstrap(): void {
    if (typeof window === "undefined") return;
    try {
      const cachedTitle = localStorage.getItem(STORAGE_KEY_ORGANIZATION_TITLE);
      if (cachedTitle) {
        updateDocumentTitle(cachedTitle);
      }
      const cachedFavicon = localStorage.getItem(STORAGE_KEY_ORGANIZATION_FAVICON);
      if (cachedFavicon) {
        updateFavicon(cachedFavicon);
      }
    } catch {
      // Ignore storage errors
    }

    // Silent background SWR sync with PostgreSQL database
    this.getOrganization({ silent: true }).catch(() => {
      // Handled silently
    });
  },

  /**
   * Returns current in-memory cached organization details if already fetched.
   */
  getCachedOrganization(): OrganizationInfo | null {
    return cachedOrganization;
  },

  /**
   * Sets or updates in-memory cached organization data.
   */
  setCachedOrganization(info: OrganizationInfo | null): void {
    cachedOrganization = info;
  },

  /**
   * Clears the in-memory cache (e.g., on sign out).
   */
  clearCache(): void {
    cachedOrganization = null;
    cachedCurrencies = null;
    cachedSystemSettings = null;
    cachedHealth = null;
  },

  /**
   * Returns current in-memory cached currencies list.
   */
  getCachedCurrencies(): CurrencyOption[] | null {
    return cachedCurrencies;
  },

  /**
   * Fetches supported currencies directly from the PostgreSQL currencies table via REST endpoint.
   * Tracks global top progress bar and caches the result.
   */
  async getCurrencies(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<CurrencyOption[]> {
    if (cachedCurrencies && !options?.silent) {
      return cachedCurrencies;
    }

    try {
      const list = await apiRequest<CurrencyOption[]>(
        "/api/v1/organizations/currencies",
        {
          method: "GET",
          silent: options?.silent,
          signal: options?.signal,
        },
      );
      cachedCurrencies = list;
      return list;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      if (cachedCurrencies) return cachedCurrencies;
      const fallback = Object.entries(KNOWN_CURRENCY_SYMBOLS).map(
        ([code, symbol]) => ({
          code,
          name: code,
          symbol,
        }),
      );
      cachedCurrencies = fallback;
      return fallback;
    }
  },

  /**
   * Fetches real organization metadata directly from the backend server.
   * Tracks global top progress bar and saves result in memory.
   */
  async getOrganization(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<OrganizationInfo> {
    try {
      const raw = await apiRequest<BackendOrganizationPayload>(
        "/api/v1/organizations",
        {
          method: "GET",
          silent: options?.silent,
          signal: options?.signal,
        },
      );
      const mapped = mapBackendToOrganizationInfo(raw);
      cachedOrganization = mapped;
      applyOrganizationMetadata(mapped);
      return mapped;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new OrganizationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Updates organization metadata directly on the backend server.
   */
  async updateOrganization(
    info: OrganizationInfo,
    options?: { signal?: AbortSignal },
  ): Promise<OrganizationInfo> {
    const currencyCode =
      info.defaultCurrency
        .replace(/[^A-Za-z]/g, "")
        .slice(0, 3)
        .toUpperCase() || "USD";

    const payload = {
      organization_name: info.shortName || info.name,
      legal_name: info.name,
      tagline: info.tagline,
      description: info.description,
      support_email: info.supportEmail,
      address_line1: info.address,
      default_currency: currencyCode,
      platform_fee_percent: Number(info.feePercentage),
      payout_minimum: Number(info.minPayout),
      metadata: {
        links: {
          website: info.website,
        },
      },
    };

    try {
      const raw = await apiRequest<BackendOrganizationPayload>(
        "/api/v1/organizations",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
          signal: options?.signal,
        },
      );
      const mapped = mapBackendToOrganizationInfo(raw);
      cachedOrganization = mapped;
      applyOrganizationMetadata(mapped);
      return mapped;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new OrganizationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Retrieves active system settings from memory if available.
   */
  getCachedSystemSettings(): SystemSettings | null {
    return cachedSystemSettings;
  },

  /**
   * Fetches system configuration (session timeouts, token TTLs, security) from backend.
   */
  async getSystemSettings(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<SystemSettings> {
    try {
      const res = await apiRequest<{ success?: boolean; data: SystemSettings }>(
        "/api/v1/organizations/settings/system",
        {
          method: "GET",
          silent: options?.silent,
          signal: options?.signal,
        },
      );
      const data = res.data || (res as unknown as SystemSettings);
      cachedSystemSettings = data;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("system-settings:updated", { detail: data })
        );
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new OrganizationServiceError(err.message, err.statusCode);
      }
      if (cachedSystemSettings) return cachedSystemSettings;
      return defaultSystemSettings;
    }
  },

  /**
   * Updates system settings (session timeouts, token TTLs, security) in PostgreSQL.
   */
  async updateSystemSettings(
    settings: Partial<SystemSettings>,
    options?: { signal?: AbortSignal },
  ): Promise<SystemSettings> {
    try {
      const res = await apiRequest<{ success?: boolean; message?: string; data: SystemSettings }>(
        "/api/v1/organizations/settings/system",
        {
          method: "PATCH",
          body: JSON.stringify(settings),
          signal: options?.signal,
        },
      );
      const data = res.data || (res as unknown as SystemSettings);
      cachedSystemSettings = data;
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("system-settings:updated", { detail: data })
        );
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new OrganizationServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Returns current in-memory cached health status if already checked.
   */
  getCachedHealth(): SystemHealthData | null {
    return cachedHealth;
  },

  /**
   * Fetches the live backend server, PostgreSQL database, and S3 asset storage health status.
   */
  async getSystemHealth(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<SystemHealthData> {
    let backendWorking: boolean;
    let dbConnected: boolean;
    let serverStatus: string;
    let uptimeFormatted: string | undefined;
    let s3Working = true;
    let s3ExplicitlyChecked = false;
    let s3ErrorMessage: string | undefined;

    try {
      const res = await apiRequest<Record<string, unknown>>("/api/v1/health", {
        method: "GET",
        silent: options?.silent ?? true,
        signal: options?.signal,
      });

      const raw =
        res && typeof res.data === "object" && res.data !== null
          ? (res.data as Record<string, unknown>)
          : res || {};

      const srv = (raw.server as Record<string, unknown> | undefined) || {};
      const db = (raw.database as Record<string, unknown> | undefined) || {};
      const s3Raw =
        (raw.s3 as Record<string, unknown> | undefined) ||
        (raw.storage as Record<string, unknown> | undefined);

      serverStatus =
        typeof srv.status === "string"
          ? srv.status
          : typeof raw.status === "string"
          ? raw.status
          : "online";
      uptimeFormatted =
        typeof srv.uptimeFormatted === "string" ? srv.uptimeFormatted : undefined;

      const isServerUp =
        serverStatus.toLowerCase() === "online" ||
        serverStatus.toLowerCase() === "ok" ||
        serverStatus.toLowerCase() === "healthy" ||
        raw.overallStatus === "operational";

      dbConnected =
        db.connected !== undefined
          ? Boolean(db.connected)
          : db.status !== undefined
          ? String(db.status).toLowerCase() === "connected" ||
            String(db.status).toLowerCase() === "online"
          : true;

      backendWorking = isServerUp && dbConnected;

      if (s3Raw && typeof s3Raw === "object") {
        s3ExplicitlyChecked = true;
        const s3Status = typeof s3Raw.status === "string" ? s3Raw.status.toLowerCase() : "";
        s3Working =
          s3Raw.connected !== undefined
            ? Boolean(s3Raw.connected)
            : s3Status === "online" ||
              s3Status === "connected" ||
              s3Status === "healthy" ||
              s3Status === "operational" ||
              s3Status === "ok";
        if (!s3Working && typeof s3Raw.message === "string") {
          s3ErrorMessage = s3Raw.message;
        }
      }
    } catch {
      backendWorking = false;
      dbConnected = false;
      serverStatus = "offline";
    }

    // Verify S3 asset storage reachability if not already explicitly reported by /health
    if (backendWorking && !s3ExplicitlyChecked) {
      try {
        const assetsRes = await apiRequest<{
          data?: Array<{ media?: Array<{ url?: string }> }>;
        }>("/api/v1/admin/assets?limit=1", {
          method: "GET",
          rawResponse: true,
          silent: true,
          signal: options?.signal,
        });

        const sampleUrl = assetsRes?.data?.[0]?.media?.find((m) => m?.url)?.url;
        if (sampleUrl && /^https?:\/\//i.test(sampleUrl)) {
          try {
            await fetch(sampleUrl, {
              method: "HEAD",
              mode: "no-cors",
              cache: "no-store",
              signal: options?.signal,
            });
            s3Working = true;
          } catch {
            s3Working = false;
            s3ErrorMessage = "S3 Asset Server unreachable";
          }
        } else {
          s3Working = true;
        }
      } catch {
        s3Working = false;
        s3ErrorMessage = "Asset storage service check failed";
      }
    } else if (!backendWorking && !s3ExplicitlyChecked) {
      s3Working = false;
    }

    let statusMessage = "System is Healthy";
    if (!backendWorking && !s3Working) {
      statusMessage = "Backend Server & S3 Asset Server Not Working";
    } else if (!backendWorking) {
      statusMessage = !dbConnected && serverStatus === "online"
        ? "Backend Database Not Working"
        : "Backend Server Not Working";
    } else if (!s3Working) {
      statusMessage = s3ErrorMessage || "S3 Asset Server Not Working";
    }

    const result: SystemHealthData = {
      overallStatus: backendWorking && s3Working ? "operational" : "degraded",
      backendWorking,
      s3Working,
      statusMessage,
      server: {
        status: serverStatus,
        uptimeFormatted,
      },
      database: {
        connected: dbConnected,
      },
      s3: {
        connected: s3Working,
        message: s3ErrorMessage,
      },
    };

    cachedHealth = result;
    return result;
  },
};

export default organizationService;

