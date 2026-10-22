import { apiRequest, ApiError } from "./apiClient.ts";

export type BannerBadgeType =
  | "special_offer"
  | "hot_deal"
  | "new_release"
  | "limited_time"
  | "announcement"
  | "flash_sale"
  | "none";

export const BANNER_BADGE_TYPE_LABELS: Record<BannerBadgeType, string | null> = {
  special_offer: "Special Offer",
  hot_deal: "Hot Deal",
  new_release: "New Release",
  limited_time: "Limited Time",
  announcement: "Announcement",
  flash_sale: "Flash Sale",
  none: null,
};

export function getBannerBadgeLabel(badgeType: BannerBadgeType): string | null {
  return BANNER_BADGE_TYPE_LABELS[badgeType] ?? null;
}

export type BannerAppearance =
  | "primary"
  | "secondary"
  | "tertiary"
  | "inverse"
  | "surface"
  | "accent";

export type ComputedBannerStatus =
  | "active"
  | "scheduled"
  | "expired"
  | "inactive";

export interface BackendBanner {
  id: string;
  title: string;
  description?: string | null;
  supporting_text?: string | null;
  supportingText?: string | null;
  badge_type?: BannerBadgeType;
  badgeType?: BannerBadgeType;
  cta_label?: string | null;
  ctaLabel?: string | null;
  cta_url?: string | null;
  ctaUrl?: string | null;
  show_cta?: boolean;
  showCta?: boolean;
  is_dismissible?: boolean;
  isDismissible?: boolean;
  appearance?: BannerAppearance;
  priority?: number;
  is_active?: boolean;
  isActive?: boolean;
  status?: ComputedBannerStatus;
  starts_at?: string | null;
  startsAt?: string | null;
  ends_at?: string | null;
  endsAt?: string | null;
  timezone?: string;
  created_by?: string | null;
  createdBy?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface ManagedBanner {
  id: string;
  title: string;
  description: string | null;
  supportingText: string | null;
  badgeType: BannerBadgeType;
  ctaLabel: string | null;
  ctaUrl: string | null;
  showCta: boolean;
  isDismissible: boolean;
  appearance: BannerAppearance;
  priority: number;
  isActive: boolean;
  status: ComputedBannerStatus;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BannerMetrics {
  total: number;
  activeCount: number;
  scheduledCount: number;
  expiredCount: number;
  inactiveCount: number;
}

export interface PaginatedBannersResult {
  banners: ManagedBanner[];
  metrics: BannerMetrics;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateBannerPayload {
  title: string;
  description?: string | null;
  supportingText?: string | null;
  badgeType?: BannerBadgeType;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  showCta?: boolean;
  isDismissible?: boolean;
  appearance?: BannerAppearance;
  priority?: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string;
}

export type UpdateBannerPayload = Partial<CreateBannerPayload>;

export class BannerServiceError extends ApiError {}

let cachedBannersResult: PaginatedBannersResult | null = null;

function computeClientStatus(
  isActive: boolean,
  startsAt: string | null,
  endsAt: string | null,
): ComputedBannerStatus {
  if (!isActive) return "inactive";
  const nowMs = Date.now();
  if (startsAt) {
    const startMs = new Date(startsAt).getTime();
    if (!Number.isNaN(startMs) && startMs > nowMs) {
      return "scheduled";
    }
  }
  if (endsAt) {
    const endMs = new Date(endsAt).getTime();
    if (!Number.isNaN(endMs) && endMs <= nowMs) {
      return "expired";
    }
  }
  return "active";
}

function normalizeBanner(raw: BackendBanner): ManagedBanner {
  if (!raw || !raw.id) {
    throw new BannerServiceError(
      "Invalid promotional banner data received from backend server.",
      500,
    );
  }

  const isActive =
    raw.isActive !== undefined
      ? raw.isActive
      : raw.is_active !== undefined
        ? raw.is_active
        : true;
  const startsAt = raw.startsAt ?? raw.starts_at ?? null;
  const endsAt = raw.endsAt ?? raw.ends_at ?? null;

  return {
    id: raw.id,
    title: raw.title || "",
    description: raw.description ?? null,
    supportingText: raw.supportingText ?? raw.supporting_text ?? null,
    badgeType: raw.badgeType ?? raw.badge_type ?? "special_offer",
    ctaLabel: raw.ctaLabel ?? raw.cta_label ?? null,
    ctaUrl: raw.ctaUrl ?? raw.cta_url ?? null,
    showCta:
      raw.showCta !== undefined
        ? raw.showCta
        : raw.show_cta !== undefined
          ? raw.show_cta
          : true,
    isDismissible:
      raw.isDismissible !== undefined
        ? raw.isDismissible
        : raw.is_dismissible !== undefined
          ? raw.is_dismissible
          : true,
    appearance: raw.appearance ?? "primary",
    priority: Number(raw.priority ?? 0) || 0,
    isActive,
    status: raw.status ?? computeClientStatus(isActive, startsAt, endsAt),
    startsAt,
    endsAt,
    timezone: raw.timezone || "UTC",
    createdBy: raw.createdBy ?? raw.created_by ?? null,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
  };
}

function recalculateMetrics(banners: ManagedBanner[]): BannerMetrics {
  return {
    total: banners.length,
    activeCount: banners.filter((b) => b.status === "active").length,
    scheduledCount: banners.filter((b) => b.status === "scheduled").length,
    expiredCount: banners.filter((b) => b.status === "expired").length,
    inactiveCount: banners.filter((b) => b.status === "inactive").length,
  };
}

export const bannerService = {
  getCachedBanners(): PaginatedBannersResult | null {
    return cachedBannersResult;
  },

  clearCache(): void {
    cachedBannersResult = null;
  },

  async getBanners(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {},
    options?: { silent?: boolean; signal?: AbortSignal },
  ): Promise<PaginatedBannersResult> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.status && params.status !== "all") {
      query.set("status", params.status);
    }

    const endpoint = `/api/v1/banners${query.toString() ? `?${query.toString()}` : ""}`;

    try {
      const response = await apiRequest<
        | {
            data?: BackendBanner[];
            metrics?: BannerMetrics;
            pagination?: {
              total: number;
              page: number;
              limit: number;
              totalPages: number;
            };
          }
        | BackendBanner[]
      >(endpoint, {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });

      const rawList: BackendBanner[] = Array.isArray(response)
        ? response
        : response.data || [];

      const banners = rawList.map(normalizeBanner);
      const metrics =
        (!Array.isArray(response) && response.metrics) ||
        recalculateMetrics(banners);
      const pagination = (!Array.isArray(response) && response.pagination) || {
        total: banners.length,
        page: params.page || 1,
        limit: params.limit || banners.length || 50,
        totalPages: 1,
      };

      const result: PaginatedBannersResult = {
        banners,
        metrics,
        pagination,
      };

      cachedBannersResult = result;
      return result;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new BannerServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async createBanner(payload: CreateBannerPayload): Promise<ManagedBanner> {
    try {
      const response = await apiRequest<{ data?: BackendBanner } | BackendBanner>(
        "/api/v1/banners",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      const raw =
        response && "data" in response && response.data
          ? response.data
          : (response as BackendBanner);
      const created = normalizeBanner(raw);

      if (cachedBannersResult) {
        const nextList = [created, ...cachedBannersResult.banners].sort(
          (a, b) =>
            b.priority - a.priority ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        cachedBannersResult = {
          ...cachedBannersResult,
          banners: nextList,
          metrics: recalculateMetrics(nextList),
        };
      }

      return created;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new BannerServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async updateBanner(
    id: string,
    payload: UpdateBannerPayload,
  ): Promise<ManagedBanner> {
    try {
      const response = await apiRequest<{ data?: BackendBanner } | BackendBanner>(
        `/api/v1/banners/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      const raw =
        response && "data" in response && response.data
          ? response.data
          : (response as BackendBanner);
      const updated = normalizeBanner(raw);

      if (cachedBannersResult) {
        const nextList = cachedBannersResult.banners
          .map((b) => (b.id === updated.id ? updated : b))
          .sort(
            (a, b) =>
              b.priority - a.priority ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        cachedBannersResult = {
          ...cachedBannersResult,
          banners: nextList,
          metrics: recalculateMetrics(nextList),
        };
      }

      return updated;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new BannerServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async toggleBannerStatus(
    id: string,
    isActive: boolean,
  ): Promise<ManagedBanner> {
    try {
      const response = await apiRequest<{ data?: BackendBanner } | BackendBanner>(
        `/api/v1/banners/${encodeURIComponent(id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        },
      );

      const raw =
        response && "data" in response && response.data
          ? response.data
          : (response as BackendBanner);
      const updated = normalizeBanner(raw);

      if (cachedBannersResult) {
        const nextList = cachedBannersResult.banners.map((b) =>
          b.id === updated.id ? updated : b,
        );
        cachedBannersResult = {
          ...cachedBannersResult,
          banners: nextList,
          metrics: recalculateMetrics(nextList),
        };
      }

      return updated;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new BannerServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async deleteBanner(id: string): Promise<void> {
    try {
      await apiRequest(`/api/v1/banners/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (cachedBannersResult) {
        const nextList = cachedBannersResult.banners.filter((b) => b.id !== id);
        cachedBannersResult = {
          ...cachedBannersResult,
          banners: nextList,
          metrics: recalculateMetrics(nextList),
        };
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new BannerServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};

export default bannerService;

