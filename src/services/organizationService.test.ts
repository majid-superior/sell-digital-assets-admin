import { describe, it, expect, beforeEach } from "vitest";
import {
  organizationService,
  resolveCurrencySymbol,
  formatCurrencyAmount,
  defaultSystemSettings,
} from "./organizationService.ts";

describe("organizationService utilities", () => {
  beforeEach(() => {
    organizationService.clearCache();
  });

  describe("resolveCurrencySymbol", () => {
    it("should resolve known currency codes to their symbols", () => {
      expect(resolveCurrencySymbol("USD")).toBe("$");
      expect(resolveCurrencySymbol("EUR")).toBe("€");
      expect(resolveCurrencySymbol("GBP")).toBe("£");
      expect(resolveCurrencySymbol("JPY")).toBe("¥");
      expect(resolveCurrencySymbol("INR")).toBe("₹");
      expect(resolveCurrencySymbol("CNY")).toBe("¥");
    });

    it("should default to ₨ when code is missing", () => {
      expect(resolveCurrencySymbol()).toBe("₨");
      expect(resolveCurrencySymbol("")).toBe("₨");
    });

    it("should prioritize rawSymbol when provided", () => {
      expect(resolveCurrencySymbol("USD", "US$")).toBe("US$");
      expect(resolveCurrencySymbol("EUR", "€uro")).toBe("€uro");
    });

    it("should fallback to uppercase code for unknown currencies", () => {
      expect(resolveCurrencySymbol("cad")).toBe("CAD");
      expect(resolveCurrencySymbol("aud")).toBe("AUD");
    });
  });

  describe("formatCurrencyAmount", () => {
    it("should format numerical amounts with thousands separators and 2 decimal places", () => {
      expect(formatCurrencyAmount(1234.56, "$")).toBe("$ 1,234.56");
      expect(formatCurrencyAmount(1000000, "€")).toBe("€ 1,000,000.00");
      expect(formatCurrencyAmount(0, "₨")).toBe("₨ 0.00");
    });

    it("should handle string representations of numbers gracefully", () => {
      expect(formatCurrencyAmount("4500.5", "$")).toBe("$ 4,500.50");
      expect(formatCurrencyAmount("invalid", "$")).toBe("$ 0.00");
    });

    it("should default to ₨ when no symbol is passed", () => {
      expect(formatCurrencyAmount(50)).toBe("₨ 50.00");
    });
  });

  describe("in-memory caching and clearance", () => {
    it("should return null initially for cached data after clearCache", () => {
      expect(organizationService.getCachedOrganization()).toBeNull();
      expect(organizationService.getCachedCurrencies()).toBeNull();
      expect(organizationService.getCachedSystemSettings()).toBeNull();
      expect(organizationService.getCachedHealth()).toBeNull();
    });

    it("should provide valid default system settings", () => {
      expect(defaultSystemSettings.sessionIdleTimeoutMinutes).toBe(30);
      expect(defaultSystemSettings.passwordMinLength).toBe(8);
      expect(defaultSystemSettings.allowUserRegistration).toBe(true);
    });
  });
});

