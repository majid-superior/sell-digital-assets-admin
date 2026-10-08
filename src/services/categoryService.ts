import { apiRequest, ApiError } from "./apiClient.ts";

// In-memory client cache (persists during active session across tab switches)
let cachedCategoriesResult: PaginatedCategoriesResult | null = null;
let cachedFlatCategories: ManagedCategory[] | null = null;

export interface BackendCategory {
  id: number;
  parent_id?: number | null;
  parent_name?: string | null;
  parent_slug?: string | null;
  name: string;
  slug: string;
  depth?: number;
  path?: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ManagedCategory {
  id: number;
  parentId: number | null;
  parentName?: string | null;
  parentSlug?: string | null;
  name: string;
  slug: string;
  depth: number;
  path: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedCategoriesResult {
  categories: ManagedCategory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCategoryPayload {
  name: string;
  slug?: string;
  parentId?: number | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  parentId?: number | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export class CategoryServiceError extends ApiError {}

function normalizeCategory(c: BackendCategory): ManagedCategory {
  return {
    id: c.id,
    parentId: c.parent_id !== undefined ? c.parent_id : null,
    parentName: c.parent_name ?? null,
    parentSlug: c.parent_slug ?? null,
    name: c.name,
    slug: c.slug,
    depth: c.depth ?? 0,
    path: c.path || c.name,
    description: c.description ?? null,
    displayOrder: c.display_order ?? 0,
    isActive: c.is_active !== undefined ? c.is_active : true,
    createdAt: c.created_at
      ? new Date(c.created_at).toISOString().split("T")[0]
      : undefined,
    updatedAt: c.updated_at
      ? new Date(c.updated_at).toISOString().split("T")[0]
      : undefined,
  };
}

export const categoryService = {
  /**
   * Returns current in-memory cached categories if already fetched.
   */
  getCachedCategories(): PaginatedCategoriesResult | null {
    return cachedCategoriesResult;
  },

  /**
   * Sets or updates in-memory cached categories.
   */
  setCachedCategories(result: PaginatedCategoriesResult | null): void {
    cachedCategoriesResult = result;
  },

  /**
   * Returns cached flat list of all categories for dropdown selection.
   */
  getCachedFlatCategories(): ManagedCategory[] | null {
    return cachedFlatCategories;
  },

  /**
   * Clears all in-memory category caches (e.g., on logout).
   */
  clearCache(): void {
    cachedCategoriesResult = null;
    cachedFlatCategories = null;
  },

  /**
   * Fetches paginated categories with optional search and parent filters from the live backend API.
   * Tracks global top progress bar and saves result in memory.
   */
  async getCategories(
    params: {
      page?: number;
      limit?: number;
      search?: string;
      parentId?: number | null;
      includeInactive?: boolean;
    } = {},
    options?: { silent?: boolean; signal?: AbortSignal }
  ): Promise<PaginatedCategoriesResult> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.parentId !== undefined && params.parentId !== null) {
      query.set("parentId", String(params.parentId));
    }
    // Admin always needs access to both active and inactive categories to view and toggle statuses
    query.set("includeInactive", "true");

    const endpoint = `/api/categories${query.toString() ? `?${query.toString()}` : ""}`;

    try {
      const response = await apiRequest<{
        data?: BackendCategory[];
        pagination?: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      } | BackendCategory[]>(endpoint, {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });

      const rawList: BackendCategory[] = Array.isArray(response)
        ? response
        : response.data || [];

      const pagination = (!Array.isArray(response) && response.pagination) || {
        total: rawList.length,
        page: params.page || 1,
        limit: params.limit || rawList.length,
        totalPages: 1,
      };

      const categories: ManagedCategory[] = rawList.map(normalizeCategory);

      const paginatedResult: PaginatedCategoriesResult = {
        categories,
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
      };

      cachedCategoriesResult = paginatedResult;
      return paginatedResult;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Fetches all categories without pagination limit for parent hierarchy dropdown selection.
   */
  async getAllCategoriesList(options?: {
    silent?: boolean;
    signal?: AbortSignal;
  }): Promise<ManagedCategory[]> {
    try {
      const response = await apiRequest<{
        data?: BackendCategory[];
      } | BackendCategory[]>("/api/categories?includeInactive=true", {
        method: "GET",
        silent: options?.silent,
        signal: options?.signal,
      });

      const rawList: BackendCategory[] = Array.isArray(response)
        ? response
        : response.data || [];

      const list = rawList.map(normalizeCategory);
      cachedFlatCategories = list;
      return list;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Creates a new category on the backend server and synchronizes the memory cache.
   */
  async createCategory(
    data: CreateCategoryPayload,
    options?: { signal?: AbortSignal }
  ): Promise<ManagedCategory> {
    try {
      const response = await apiRequest<{ data: BackendCategory }>(
        "/api/categories",
        {
          method: "POST",
          body: JSON.stringify(data),
          signal: options?.signal,
        }
      );

      const created = normalizeCategory(response.data);

      if (cachedCategoriesResult) {
        cachedCategoriesResult = {
          ...cachedCategoriesResult,
          categories: [created, ...cachedCategoriesResult.categories],
          total: cachedCategoriesResult.total + 1,
        };
      }

      if (cachedFlatCategories) {
        cachedFlatCategories = [created, ...cachedFlatCategories];
      }

      return created;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Updates an existing category on the backend server and synchronizes the memory cache.
   */
  async updateCategory(
    id: number,
    data: UpdateCategoryPayload,
    options?: { signal?: AbortSignal }
  ): Promise<ManagedCategory> {
    try {
      const response = await apiRequest<{ data: BackendCategory }>(
        `/api/categories/${id}`,
        {
          method: "PATCH",
          body: JSON.stringify(data),
          signal: options?.signal,
        }
      );

      const updated = normalizeCategory(response.data);

      if (cachedCategoriesResult) {
        cachedCategoriesResult = {
          ...cachedCategoriesResult,
          categories: cachedCategoriesResult.categories.map((c) =>
            c.id === id ? updated : c
          ),
        };
      }

      if (cachedFlatCategories) {
        cachedFlatCategories = cachedFlatCategories.map((c) =>
          c.id === id ? updated : c
        );
      }

      return updated;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Soft-deletes a category by setting is_active = FALSE on backend server.
   * Architectural standard: Physical deletion is prohibited; soft delete preserves hierarchy.
   */
  async deleteCategory(
    id: number,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    try {
      await apiRequest<void>(`/api/categories/${id}`, {
        method: "DELETE",
        signal: options?.signal,
      });

      if (cachedCategoriesResult) {
        cachedCategoriesResult = {
          ...cachedCategoriesResult,
          categories: cachedCategoriesResult.categories.map((c) =>
            c.id === id ? { ...c, isActive: false } : c
          ),
        };
      }

      if (cachedFlatCategories) {
        cachedFlatCategories = cachedFlatCategories.map((c) =>
          c.id === id ? { ...c, isActive: false } : c
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  /**
   * Restores/reactivates a soft-deleted category by setting is_active = TRUE on backend server.
   */
  async restoreCategory(
    id: number,
    options?: { signal?: AbortSignal }
  ): Promise<void> {
    try {
      await apiRequest<void>(`/api/categories/${id}/restore`, {
        method: "POST",
        signal: options?.signal,
      });

      if (cachedCategoriesResult) {
        cachedCategoriesResult = {
          ...cachedCategoriesResult,
          categories: cachedCategoriesResult.categories.map((c) =>
            c.id === id ? { ...c, isActive: true } : c
          ),
        };
      }

      if (cachedFlatCategories) {
        cachedFlatCategories = cachedFlatCategories.map((c) =>
          c.id === id ? { ...c, isActive: true } : c
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new CategoryServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};

