import { API_BASE_URL } from "@/config/env.ts";
import { authService } from "./authService.ts";
import { loadingManager } from "@/lib/loadingManager.ts";
import type { CompanyInfo } from "@/pages/Company.tsx";

// In-memory client cache (persists during active session across tab switches)
let cachedCompany: CompanyInfo | null = null;

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
  platform_fee_percent: string | number;
  payout_minimum: string | number;
  metadata?: {
    links?: {
      website?: string;
    };
  } | null;
}

export class CompanyServiceError extends Error {
  statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = "CompanyServiceError";
    this.statusCode = statusCode;
  }
}

function mapBackendToCompanyInfo(b: BackendCompanyPayload): CompanyInfo {
  const addressParts = [b.address_line1, b.city, b.state, b.country].filter(Boolean);
  const address = addressParts.join(", ") || b.address_line1 || "";
  const website =
    b.metadata?.links?.website || b.support_url || "https://selldigitalassets.com";

  return {
    name: b.legal_name || b.company_name,
    shortName: b.company_name,
    title: b.company_name,
    tagline: b.tagline || "",
    description: b.description || "",
    address: address || "Ring Road, Lahore, Pakistan",
    website: website,
    supportEmail: b.support_email || b.contact_email || "support@selldigitalassets.com",
    defaultCurrency: b.default_currency || "USD",
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
  },

  /**
   * Fetches real company metadata directly from the backend server.
   * Tracks global top progress bar and saves result in memory.
   */
  async getCompany(options?: { silent?: boolean }): Promise<CompanyInfo> {
    const fetchOperation = async (): Promise<CompanyInfo> => {
      const url = `${API_BASE_URL}/api/company`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch {
        throw new CompanyServiceError(
          "Unable to connect to the backend server. Please verify the API server is running on http://localhost:5000.",
          0
        );
      }

      if (!response.ok) {
        let errorMessage = `Failed to fetch company details (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch {
          // Fallback
        }
        throw new CompanyServiceError(errorMessage, response.status);
      }

      const json = await response.json();
      const mapped = mapBackendToCompanyInfo(json.data);
      cachedCompany = mapped;
      return mapped;
    };

    return loadingManager.wrap(fetchOperation(), options?.silent);
  },

  /**
   * Updates company metadata directly on the backend server.
   */
  async updateCompany(info: CompanyInfo): Promise<CompanyInfo> {
    const updateOperation = async (): Promise<CompanyInfo> => {
      const token = authService.getStoredToken();
      const url = `${API_BASE_URL}/api/company`;

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

      let response: Response;
      try {
        response = await fetch(url, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch {
        throw new CompanyServiceError(
          "Unable to reach the backend API server. Please check your network connection.",
          0
        );
      }

      if (!response.ok) {
        let errorMessage = `Failed to update company configuration (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch {
          // Fallback
        }
        throw new CompanyServiceError(errorMessage, response.status);
      }

      const json = await response.json();
      const mapped = mapBackendToCompanyInfo(json.data);
      cachedCompany = mapped;
      return mapped;
    };

    return loadingManager.wrap(updateOperation());
  },
};

