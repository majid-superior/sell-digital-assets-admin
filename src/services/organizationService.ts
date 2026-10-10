import { apiRequest, ApiError } from "./apiClient.ts";

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
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

// In-memory client cache (persists during active session across tab switches)
let cachedOrganization: OrganizationInfo | null = null;
let cachedCurrencies: CurrencyOption[] | null = null;

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
   * Clears the in-memory cache (e.g., on logout).
   */
  clearCache(): void {
    cachedOrganization = null;
    cachedCurrencies = null;
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
        "/api/organizations/currencies",
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
        "/api/organizations",
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
        "/api/organizations",
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
};

export default organizationService;
