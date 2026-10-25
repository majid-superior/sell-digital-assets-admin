import { apiRequest } from "./apiClient.ts";

export interface HeroImage {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  storageKey: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RawHeroImage {
  id?: string;
  title?: string;
  subtitle?: string | null;
  image_url?: string;
  imageUrl?: string;
  storage_key?: string | null;
  storageKey?: string | null;
  sort_order?: number;
  sortOrder?: number;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

let cachedHeroImages: HeroImage[] | null = null;

function extractRawItem(data: unknown): RawHeroImage | null {
  if (!data || typeof data !== "object") return null;
  if ("data" in data && data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return data.data as RawHeroImage;
  }
  return data as RawHeroImage;
}

function normalizeHeroImage(raw: unknown): HeroImage {
  const item = extractRawItem(raw);
  const fallbackId = crypto.randomUUID();

  if (!item) {
    return {
      id: fallbackId,
      title: "Hero Slide",
      subtitle: null,
      imageUrl: "",
      storageKey: null,
      sortOrder: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: item.id || fallbackId,
    title: item.title || "Hero Slide",
    subtitle: item.subtitle ?? null,
    imageUrl: item.imageUrl || item.image_url || "",
    storageKey: item.storageKey ?? item.storage_key ?? null,
    sortOrder: Number.isFinite(item.sortOrder)
      ? Number(item.sortOrder)
      : Number(item.sort_order || 0),
    isActive:
      item.isActive !== undefined
        ? Boolean(item.isActive)
        : Boolean(item.is_active ?? true),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

export const heroService = {
  getCachedHeroImages(): HeroImage[] | null {
    return cachedHeroImages;
  },

  clearCache(): void {
    cachedHeroImages = null;
  },

  async getHeroImages(options?: { silent?: boolean }): Promise<HeroImage[]> {
    try {
      const response = await apiRequest<unknown>(
        "/api/v1/hero",
        { silent: options?.silent ?? false },
      );

      let rawList: unknown[] = [];
      if (Array.isArray(response)) {
        rawList = response;
      } else if (
        response &&
        typeof response === "object" &&
        "data" in response &&
        Array.isArray((response as { data: unknown[] }).data)
      ) {
        rawList = (response as { data: unknown[] }).data;
      }

      const normalized = rawList
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map(normalizeHeroImage);

      cachedHeroImages = normalized;
      return normalized;
    } catch (error) {
      if (cachedHeroImages) {
        return cachedHeroImages;
      }
      throw error;
    }
  },

  async uploadHeroImage(formData: FormData): Promise<HeroImage> {
    const response = await apiRequest<unknown>(
      "/api/v1/hero",
      {
        method: "POST",
        body: formData,
      },
    );

    const created = normalizeHeroImage(response);
    if (cachedHeroImages) {
      cachedHeroImages = [created, ...cachedHeroImages];
    }
    return created;
  },

  async toggleHeroStatus(id: string, isActive: boolean): Promise<HeroImage> {
    const response = await apiRequest<unknown>(
      `/api/v1/hero/${id}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      },
    );

    const updated = normalizeHeroImage(response);
    if (cachedHeroImages) {
      cachedHeroImages = cachedHeroImages.map((img) =>
        img.id === id ? updated : img,
      );
    }
    return updated;
  },

  async updateHeroImage(id: string, data: Partial<HeroImage>): Promise<HeroImage> {
    const payload: Record<string, unknown> = {};
    if (data.title !== undefined) payload.title = data.title;
    if (data.subtitle !== undefined) payload.subtitle = data.subtitle;
    if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder;
    if (data.isActive !== undefined) payload.is_active = data.isActive;

    const response = await apiRequest<unknown>(
      `/api/v1/hero/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );

    const updated = normalizeHeroImage(response);
    if (cachedHeroImages) {
      cachedHeroImages = cachedHeroImages.map((img) =>
        img.id === id ? updated : img,
      );
    }
    return updated;
  },

  async deleteHeroImage(id: string): Promise<void> {
    await apiRequest(`/api/v1/hero/${id}`, {
      method: "DELETE",
    });

    if (cachedHeroImages) {
      cachedHeroImages = cachedHeroImages.filter((img) => img.id !== id);
    }
  },
};
