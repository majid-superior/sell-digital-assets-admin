import { apiRequest, ApiError } from "./apiClient.ts";

export type AssetStatus =
  | "draft"
  | "pending"
  | "needs_update"
  | "published"
  | "rejected"
  | "archived"
  | "under_review";

export interface AssetTier {
  id: string;
  tier_type: "personal" | "commercial" | "extended";
  price: number;
  license_terms_summary?: string;
}

export interface AssetMedia {
  id: string;
  media_type: "thumbnail" | "screenshot" | "preview_audio" | "preview_video" | string;
  url: string;
  display_order: number;
}

export interface AssetFile {
  id: string;
  version: string;
  file_name: string;
  file_size_bytes: number;
  file_checksum_sha256: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AssetCategory {
  id: number;
  name: string;
  slug: string;
}

export interface AssetSeller {
  id: string;
  name: string;
  email: string;
}

export interface AdminAsset {
  id: string;
  seller_id: string;
  category_id: number;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  status: AssetStatus;
  admin_feedback: string | null;
  seller_feedback?: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  tags: string[];
  technical_specs: Record<string, unknown>;
  view_count: number;
  download_count: number;
  is_featured?: boolean;
  is_curated?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: AssetCategory;
  seller: AssetSeller;
  tiers: AssetTier[];
  media: AssetMedia[];
  files: AssetFile[];
}

export interface AssetCounts {
  total: number;
  pending: number;
  published: number;
  rejected: number;
  needsUpdate: number;
  draft: number;
}

export interface PaginatedAdminAssetsResult {
  assets: AdminAsset[];
  counts: AssetCounts;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminReviewPayload {
  action: "approve" | "reject" | "needs_update";
  feedback?: string;
}

export class AssetServiceError extends ApiError {}

// In-memory client cache (persists during active session across tab switches for 0ms delay)
let cachedAssetsResult: PaginatedAdminAssetsResult | null = null;
let cachedCuratedAssetsResult: PaginatedAdminAssetsResult | null = null;
let cachedCounts: AssetCounts | null = null;
let pendingInspectAssetId: string | null = null;

export function formatFileSizeBytes(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const assetService = {
  /**
   * Returns current in-memory cached assets if already fetched.
   */
  getCachedAssets(): PaginatedAdminAssetsResult | null {
    return cachedAssetsResult;
  },

  /**
   * Sets or updates in-memory cached assets.
   */
  setCachedAssets(result: PaginatedAdminAssetsResult | null): void {
    cachedAssetsResult = result;
  },

  /**
   * Returns current in-memory cached curated assets if already fetched.
   */
  getCachedCuratedAssets(): PaginatedAdminAssetsResult | null {
    return cachedCuratedAssetsResult;
  },

  /**
   * Sets or updates in-memory cached curated assets.
   */
  setCachedCuratedAssets(result: PaginatedAdminAssetsResult | null): void {
    cachedCuratedAssetsResult = result;
  },

  /**
   * Returns current in-memory cached counts if already fetched.
   */
  getCachedCounts(): AssetCounts | null {
    return cachedCounts;
  },

  /**
   * Sets in-memory cached counts.
   */
  setCachedCounts(counts: AssetCounts | null): void {
    cachedCounts = counts;
  },

  /**
   * Clears the in-memory cache (e.g. on sign out).
   */
  clearCache(): void {
    cachedAssetsResult = null;
    cachedCuratedAssetsResult = null;
    cachedCounts = null;
    pendingInspectAssetId = null;
  },

  setPendingInspectAssetId(assetId: string | null): void {
    pendingInspectAssetId = assetId;
  },

  consumePendingInspectAssetId(): string | null {
    const id = pendingInspectAssetId;
    pendingInspectAssetId = null;
    return id;
  },

  /**
   * Fetches the quick counts summary for asset review queue & sidebar badge.
   */
  async getCounts(options?: { silent?: boolean; signal?: AbortSignal }): Promise<AssetCounts> {
    try {
      const counts = await apiRequest<AssetCounts>("/api/v1/admin/assets/counts", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });

      cachedCounts = counts;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("assets:counts-updated", { detail: counts }));
      }
      return counts;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new AssetServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Fetches paginated list of assets for admin review from live PostgreSQL database.
   */
  async getAdminAssets(
    params: {
      status?: string;
      categoryId?: number;
      search?: string;
      is_curated?: boolean;
      page?: number;
      limit?: number;
    } = {},
    options?: { silent?: boolean; signal?: AbortSignal }
  ): Promise<PaginatedAdminAssetsResult> {
    const query = new URLSearchParams();
    if (params.status && params.status !== "all") query.set("status", params.status);
    if (params.categoryId) query.set("categoryId", String(params.categoryId));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.is_curated !== undefined) query.set("is_curated", String(params.is_curated));
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    const endpoint = `/api/v1/admin/assets${query.toString() ? `?${query.toString()}` : ""}`;

    try {
      const response = await apiRequest<{
        success: boolean;
        data: AdminAsset[];
        counts?: AssetCounts;
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(endpoint, {
        method: "GET",
        rawResponse: true,
        silent: options?.silent,
        signal: options?.signal,
      });

      const rawList = response.data || [];
      const pagination = response.pagination || {
        total: rawList.length,
        page: params.page || 1,
        limit: params.limit || 20,
        totalPages: 1,
      };

      const counts: AssetCounts = response.counts || {
        total: pagination.total,
        pending: rawList.filter((a) => a.status === "pending").length,
        published: rawList.filter((a) => a.status === "published").length,
        rejected: rawList.filter((a) => a.status === "rejected").length,
        needsUpdate: rawList.filter((a) => a.status === "needs_update").length,
        draft: rawList.filter((a) => a.status === "draft").length,
      };

      cachedCounts = counts;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("assets:counts-updated", { detail: counts }));
      }

      const result: PaginatedAdminAssetsResult = {
        assets: rawList,
        counts,
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      };

      if (params.is_curated === true) {
        cachedCuratedAssetsResult = result;
      } else if (!params.categoryId && !params.search) {
        cachedAssetsResult = result;
      }

      return result;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new AssetServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Fetches single asset full detail by ID.
   */
  async getAdminAssetById(
    id: string,
    options?: { silent?: boolean; signal?: AbortSignal }
  ): Promise<AdminAsset> {
    try {
      const asset = await apiRequest<AdminAsset>(`/api/v1/admin/assets/${id}`, {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });
      return asset;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new AssetServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Dispatches admin review decision (approve, reject, needs_update) to PostgreSQL and notifies seller.
   */
  async reviewAsset(
    id: string,
    payload: AdminReviewPayload,
    options?: { signal?: AbortSignal }
  ): Promise<AdminAsset> {
    try {
      const updatedAsset = await apiRequest<AdminAsset>(`/api/v1/admin/assets/${id}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
        signal: options?.signal,
      });

      // Synchronize in-memory cache immediately
      if (cachedAssetsResult) {
        cachedAssetsResult = {
          ...cachedAssetsResult,
          assets: cachedAssetsResult.assets.map((a) => {
            if (a.id === id) {
              const newStatus: AssetStatus =
                payload.action === "approve"
                  ? "published"
                  : payload.action === "reject"
                  ? "rejected"
                  : "needs_update";
              return {
                ...a,
                status: newStatus,
                admin_feedback: payload.feedback || null,
                reviewed_at: new Date().toISOString(),
              };
            }
            return a;
          }),
        };
      }

      // Re-fetch counts in background to reconcile exact aggregates
      this.getCounts({ silent: true }).catch(() => {});

      return updatedAsset;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new AssetServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Toggle curated status for an asset (Admin privilege).
   */
  async setCuratedStatus(
    id: string,
    isCurated: boolean,
    options?: { signal?: AbortSignal }
  ): Promise<AdminAsset> {
    try {
      const updatedAsset = await apiRequest<AdminAsset>(`/api/v1/admin/assets/${id}/curate`, {
        method: "PATCH",
        body: JSON.stringify({ is_curated: isCurated }),
        signal: options?.signal,
      });

      // Synchronize in-memory cache immediately
      if (cachedAssetsResult) {
        cachedAssetsResult = {
          ...cachedAssetsResult,
          assets: cachedAssetsResult.assets.map((a) => {
            if (a.id === id) {
              return {
                ...a,
                is_curated: isCurated,
              };
            }
            return a;
          }),
        };
      }

      if (cachedCuratedAssetsResult) {
        if (isCurated) {
          const exists = cachedCuratedAssetsResult.assets.some((a) => a.id === id);
          if (exists) {
            cachedCuratedAssetsResult = {
              ...cachedCuratedAssetsResult,
              assets: cachedCuratedAssetsResult.assets.map((a) =>
                a.id === id ? { ...a, is_curated: true } : a
              ),
            };
          } else {
            cachedCuratedAssetsResult = {
              ...cachedCuratedAssetsResult,
              assets: [{ ...updatedAsset, is_curated: true }, ...cachedCuratedAssetsResult.assets],
              total: cachedCuratedAssetsResult.total + 1,
            };
          }
        } else {
          cachedCuratedAssetsResult = {
            ...cachedCuratedAssetsResult,
            assets: cachedCuratedAssetsResult.assets.filter((a) => a.id !== id),
            total: Math.max(0, cachedCuratedAssetsResult.total - 1),
          };
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("assets:curated-updated", {
            detail: { id, isCurated, asset: updatedAsset },
          })
        );
      }

      return updatedAsset;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new AssetServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};

