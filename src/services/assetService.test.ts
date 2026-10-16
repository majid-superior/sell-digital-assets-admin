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
  });
});
