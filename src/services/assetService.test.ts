import { describe, it, expect, beforeEach } from "vitest";
import { assetService, formatFileSizeBytes } from "./assetService.ts";

describe("assetService utilities", () => {
  beforeEach(() => {
    assetService.clearCache();
  });

  describe("formatFileSizeBytes", () => {
    it("should format bytes to human-readable units", () => {
      expect(formatFileSizeBytes(500)).toBe("500 B");
      expect(formatFileSizeBytes(1024)).toBe("1.0 KB");
      expect(formatFileSizeBytes(2048)).toBe("2.0 KB");
      expect(formatFileSizeBytes(1048576)).toBe("1.0 MB");
      expect(formatFileSizeBytes(1073741824)).toBe("1.00 GB");
    });

    it("should return a neutral dash for null, undefined, 0, or negative values", () => {
      expect(formatFileSizeBytes(null)).toBe("—");
      expect(formatFileSizeBytes(undefined)).toBe("—");
      expect(formatFileSizeBytes(0)).toBe("—");
      expect(formatFileSizeBytes(-50)).toBe("—");
    });
  });

  describe("in-memory caching", () => {
    it("should return null after clearCache", () => {
      expect(assetService.getCachedAssets()).toBeNull();
      expect(assetService.getCachedCounts()).toBeNull();
    });

    it("should allow setting and reading cached counts", () => {
      const mockCounts = {
        total: 10,
        pending: 2,
        published: 5,
        rejected: 1,
        needsUpdate: 1,
        draft: 1,
      };
      assetService.setCachedCounts(mockCounts);
      expect(assetService.getCachedCounts()).toEqual(mockCounts);

      assetService.clearCache();
      expect(assetService.getCachedCounts()).toBeNull();
    });

    it("should allow setting and caching assets result with is_curated status", () => {
      const mockResult = {
        assets: [
          {
            id: "asset-1",
            seller_id: "seller-1",
            category_id: 1,
            title: "Neon Shader Pack",
            slug: "neon-shader-pack",
            short_description: "Futuristic shaders",
            full_description: "Full description",
            status: "published" as const,
            admin_feedback: null,
            reviewed_by: "admin-1",
            reviewed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            tags: ["3d", "shaders"],
            technical_specs: {},
            view_count: 100,
            download_count: 20,
            is_curated: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            category: { id: 1, name: "3D Models", slug: "3d-models" },
            seller: { id: "seller-1", name: "ProArtist", email: "artist@example.com" },
            tiers: [],
            media: [],
            files: [],
          },
        ],
        counts: { total: 1, pending: 0, published: 1, rejected: 0, needsUpdate: 0, draft: 0 },
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      assetService.setCachedAssets(mockResult);
      expect(assetService.getCachedAssets()).toEqual(mockResult);
      expect(assetService.getCachedAssets()?.assets[0].is_curated).toBe(true);

      assetService.clearCache();
      expect(assetService.getCachedAssets()).toBeNull();
    });

    it("should allow setting and caching curated assets result", () => {
      const mockCuratedResult = {
        assets: [],
        counts: { total: 0, pending: 0, published: 0, rejected: 0, needsUpdate: 0, draft: 0 },
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      assetService.setCachedCuratedAssets(mockCuratedResult);
      expect(assetService.getCachedCuratedAssets()).toEqual(mockCuratedResult);

      assetService.clearCache();
      expect(assetService.getCachedCuratedAssets()).toBeNull();
    });
  });
});
