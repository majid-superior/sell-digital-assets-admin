import { apiRequest, ApiError } from "./apiClient.ts";
import type { CompanyInfo } from "@/pages/Company.tsx";

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

// In-memory client cache (persists during active session across tab switches)
let cachedCompany: CompanyInfo | null = null;
let cachedCurrencies: CurrencyOption[] | null = null;

export interface BackendCompanyPayload {
  id?: number;
  company_name: string;
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

export class CompanyServiceError extends ApiError {}

export const KNOWN_CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "₨",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  AED: "AED",
  INR: "₹",
};

export function resolveCurrencySymbol(
  code?: string,
  rawSymbol?: string | null
): string {
  if (rawSymbol && rawSymbol.trim()) return rawSymbol.trim();
  if (!code) return "₨";
  const upper = code.toUpperCase().trim();
  return KNOWN_CURRENCY_SYMBOLS[upper] || upper;
}

export function formatCurrencyAmount(
  amount: number | string,
  symbol = "₨"
): string {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

function mapBackendToCompanyInfo(b: BackendCompanyPayload): CompanyInfo {
  const addressParts = [b.address_line1, b.city, b.state, b.country].filter(Boolean);
  const address = addressParts.join(", ") || b.address_line1 || "";
  const website =
    b.metadata?.links?.website || b.support_url || "https://selldigitalassets.com";
  const defaultCurrency = b.default_currency || "PKR";
  const currencySymbol = resolveCurrencySymbol(
    defaultCurrency,
    b.currency?.symbol || b.currency_symbol
  );

  return {
    name: b.legal_name || b.company_name,
    shortName: b.company_name,
    title: b.company_name,
    tagline: b.tagline || "",
    description: b.description || "",
    address: address || "Ring Road, Lahore, Pakistan",
    website: website,
    supportEmail: b.support_email || b.contact_email || "support@selldigitalassets.com",
    defaultCurrency: defaultCurrency,
    currencySymbol: currencySymbol,
    feePercentage: Number(b.platform_fee_percent) || 5.0,
    minPayout: Number(b.payout_minimum) || 50.0,
  };
}

export const companyService = {
  /**
   * Returns current in-memory cached company details if already fetched.
   */
  getCachedCompany(): CompanyInfo | null {
    return cachedCompany;
  },

  /**
   * Sets or updates in-memory cached company data.
   */
  setCachedCompany(info: CompanyInfo | null): void {
    cachedCompany = info;
  },

  /**
   * Clears the in-memory cache (e.g., on logout).
   */
  clearCache(): void {
    cachedCompany = null;
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
      const list = await apiRequest<CurrencyOption[]>("/api/company/currencies", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });
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
        })
      );
      cachedCurrencies = fallback;
      return fallback;
    }
  },

  /**
   * Fetches real company metadata directly from the backend server.
   * Tracks global top progress bar and saves result in memory.
   */
  async getCompany(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<CompanyInfo> {
    try {
      const raw = await apiRequest<BackendCompanyPayload>("/api/company", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });
      const mapped = mapBackendToCompanyInfo(raw);
      cachedCompany = mapped;
      return mapped;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CompanyServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Updates company metadata directly on the backend server.
   */
  async updateCompany(
    info: CompanyInfo,
    options?: { signal?: AbortSignal }
  ): Promise<CompanyInfo> {
    const currencyCode =
      info.defaultCurrency.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() ||
      "USD";

    const payload = {
      company_name: info.shortName || info.name,
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
      const raw = await apiRequest<BackendCompanyPayload>("/api/company", {
        method: "PATCH",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });
      const mapped = mapBackendToCompanyInfo(raw);
      cachedCompany = mapped;
      return mapped;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CompanyServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};
