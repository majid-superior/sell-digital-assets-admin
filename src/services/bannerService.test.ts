import { describe, it, expect, beforeEach } from "vitest";
import {
  bannerService,
  getBannerBadgeLabel,
  BANNER_BADGE_TYPE_LABELS,
  type BannerBadgeType,
  type CreateBannerPayload,
} from "./bannerService.ts";

describe("bannerService & badge derivation", () => {
  beforeEach(() => {
    bannerService.clearCache();
  });

  describe("getBannerBadgeLabel", () => {
    it("should correctly derive badge labels from selected badgeType", () => {
      expect(getBannerBadgeLabel("special_offer")).toBe("Special Offer");
      expect(getBannerBadgeLabel("hot_deal")).toBe("Hot Deal");
      expect(getBannerBadgeLabel("new_release")).toBe("New Release");
      expect(getBannerBadgeLabel("limited_time")).toBe("Limited Time");
      expect(getBannerBadgeLabel("announcement")).toBe("Announcement");
      expect(getBannerBadgeLabel("flash_sale")).toBe("Flash Sale");
    });

    it("should return null for badgeType 'none'", () => {
      expect(getBannerBadgeLabel("none")).toBeNull();
    });

    it("should map every badge type defined in BANNER_BADGE_TYPE_LABELS", () => {
      const types: BannerBadgeType[] = [
        "special_offer",
        "hot_deal",
        "new_release",
        "limited_time",
        "announcement",
        "flash_sale",
        "none",
      ];
      for (const t of types) {
        expect(getBannerBadgeLabel(t)).toBe(BANNER_BADGE_TYPE_LABELS[t]);
      }
    });
  });

  describe("banner cache lifecycle", () => {
    it("should start with null cached banners", () => {
      expect(bannerService.getCachedBanners()).toBeNull();
    });

    it("should clear cached banners on clearCache call", () => {
      bannerService.clearCache();
      expect(bannerService.getCachedBanners()).toBeNull();
    });
  });

  describe("CreateBannerPayload contracts", () => {
    it("should construct valid banner payload without badgeText field", () => {
      const payload: CreateBannerPayload = {
        title: "Summer Creative Deal",
        description: "Get 20% off all vector bundles",
        supportingText: "CODE: SUMMER20",
        badgeType: "hot_deal",
        ctaLabel: "Shop now",
        ctaUrl: "/explore",
        showCta: true,
        isDismissible: true,
        appearance: "primary",
        priority: 15,
        isActive: true,
        startsAt: null,
        endsAt: null,
        timezone: "UTC",
      };

      // Type-level assertion & runtime integrity
      expect(payload).not.toHaveProperty("badgeText");
      expect(payload.badgeType).toBe("hot_deal");
      expect(getBannerBadgeLabel(payload.badgeType!)).toBe("Hot Deal");
    });
  });
});

