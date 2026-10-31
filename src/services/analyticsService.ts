import { apiRequest, ApiError } from "./apiClient.ts";
import { API_BASE_URL } from "@/config/env.ts";
import { authService } from "./authService.ts";

export type AnalyticsPeriod =
  | "today"
  | "7d"
  | "30d"
  | "90d"
  | "ytd"
  | "1y"
  | "all";

export interface FinancialSummaryData {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  currency: {
    code: string;
    symbol: string;
  };
  metrics: {
    gmv: number;
    netRevenue: number;
    creatorEarnings: number;
    discountTotal: number;
    taxTotal: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    refundRate: number;
    refundsCount: number;
    refundsTotalAmount: number;
  };
}

export interface RevenueTrendPoint {
  date: string;
  gmv: number;
  netRevenue: number;
  creatorEarnings: number;
  ordersCount: number;
}

export interface RevenueTrendData {
  period: string;
  interval: "day" | "week" | "month";
  currency: {
    code: string;
    symbol: string;
  };
  timeline: RevenueTrendPoint[];
}

export interface LicenseTierStat {
  tierType: string;
  name: string;
  salesCount: number;
  gmv: number;
  platformFeeAmount: number;
  creatorEarnings: number;
  percentageOfGmv: number;
}

export interface LicenseTierStatsData {
  period: string;
  totalGmv: number;
  tiers: LicenseTierStat[];
}

export interface TopCreatorStat {
  sellerId: string;
  name: string;
  email: string;
  salesCount: number;
  grossSales: number;
  creatorEarnings: number;
  platformFeePaid: number;
}

export interface TopCreatorsData {
  period: string;
  creators: TopCreatorStat[];
}

export interface CatalogLeaderboardItem {
  assetId: string;
  title: string;
  slug: string;
  previewUrl: string | null;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  categoryId: number;
  categoryName: string;
  unitsSold: number;
  grossRevenue: number;
  platformFeeCut: number;
  viewCount: number;
  downloadCount: number;
}

export interface CatalogLeaderboardData {
  period: string;
  metric: string;
  currency: {
    code: string;
    symbol: string;
  };
  leaderboard: CatalogLeaderboardItem[];
}

export interface CategoryDistributionItem {
  categoryId: number;
  name: string;
  slug: string;
  assetCount: number;
  unitsSold: number;
  grossRevenue: number;
  percentageOfRevenue: number;
}

export interface CategoryDistributionData {
  period: string;
  totalCategoryRevenue: number;
  categories: CategoryDistributionItem[];
}

export interface CatalogVelocityData {
  totalPublishedAssets: number;
  activeSellingAssets: number;
  catalogLiquidityRate: number;
  firstSale30dRate: number;
  deadInventoryCount: number;
  deadInventoryRate: number;
}

export interface CreatorConcentrationData {
  totalActiveCreators: number;
  totalPlatformCreatorEarnings: number;
  unsettledEarnings: number;
  pendingPayoutsTotal: number;
  completedPayoutsTotal: number;
  currency: {
    code: string;
    symbol: string;
  };
}

export interface TrendingSearchQueryItem {
  query: string;
  searchCount: number;
  clickedCount: number;
  conversionsCount: number;
  ctr: number;
  avgResults: number;
  lastSearchedAt: string;
}

export interface TrendingSearchQueriesData {
  period: string;
  queries: TrendingSearchQueryItem[];
}

export interface ZeroResultSearchItem {
  query: string;
  searchCount: number;
  lastSearchedAt: string;
}

export interface ZeroResultSearchesData {
  period: string;
  unmetDemandCount: number;
  queries: ZeroResultSearchItem[];
}

export interface SearchConversionFunnelData {
  period: string;
  funnel: {
    totalSearches: number;
    searchesWithResults: number;
    searchesWithClicks: number;
    searchesConverted: number;
    resultsRate: number;
    ctr: number;
    conversionRate: number;
  };
}

export interface FunnelStage {
  stage: string;
  count: number;
  dropOffRate: number;
  conversionRate: number;
}

export interface StorefrontFunnelData {
  period: string;
  totalVisitors: number;
  stages: FunnelStage[];
}

export interface BuyerCohort {
  cohort: string;
  totalBuyers: number;
  month0: { count: number; retentionPct: number };
  month1: { count: number; retentionPct: number };
  month2: { count: number; retentionPct: number };
  month3: { count: number; retentionPct: number };
}

export interface BuyerCohortRetentionData {
  cohorts: BuyerCohort[];
}

export interface DownloadsOverviewData {
  period: string;
  totalDownloads: number;
  totalBytesTransferred: number;
  totalGigabytesTransferred: number;
  uniqueDownloaders: number;
  totalLicensedItems: number;
  downloadedLicensedItems: number;
  fulfillmentRate: number;
  activeLicensesCount: number;
  totalActivationsCount: number;
}

export interface DownloadAnomaly {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  ipAddress: string;
  licenseKey: string | null;
  downloadCount: number;
  lastDownloadAt: string;
  anomalyType: string;
  description: string;
}

export interface DownloadAnomaliesData {
  anomalies: DownloadAnomaly[];
}

export interface TopCouponItem {
  couponId: string;
  code: string;
  discountPercent: number;
  sellerId: string;
  sellerName: string;
  redemptionsCount: number;
  discountBurned: number;
  grossRevenue: number;
  netRevenue: number;
}

export interface CouponsSummaryData {
  period: string;
  currency: {
    code: string;
    symbol: string;
  };
  metrics: {
    totalRedemptions: number;
    totalDiscountBurned: number;
    promoGmv: number;
    promoNetRevenue: number;
    roiMultiple: number;
    avgDiscountPercent: number;
  };
  topCoupons: TopCouponItem[];
}

export interface MarketingBannerPerformanceItem {
  campaignType: string;
  campaignId: string;
  title: string;
  imageUrl: string | null;
  badgeType: string | null;
  isActive: boolean;
  impressionsCount: number;
  clicksCount: number;
  ctr: number;
  directConversions: number;
  attributedGmv: number;
}

export interface MarketingBannersData {
  period: string;
  campaigns: MarketingBannerPerformanceItem[];
}

export interface CurationImpactData {
  curatedAssetCount: number;
  standardAssetCount: number;
  curatedUnitsSold: number;
  standardUnitsSold: number;
  curatedGmv: number;
  standardGmv: number;
  curatedAvgSalesPerAsset: number;
  standardAvgSalesPerAsset: number;
  curatedConversionMultiplier: number;
  curatedGmvSharePct: number;
}

export interface GrowthTriggerItem {
  id: string;
  triggerType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendedAction: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface GrowthTriggersData {
  triggers: GrowthTriggerItem[];
}

// In-Memory Stale-While-Revalidate Caches (GEMINI.md Standard: 0ms tab switching)
let cachedSummary: { key: string; data: FinancialSummaryData } | null = null;
let cachedTrend: { key: string; data: RevenueTrendData } | null = null;
let cachedTiers: { key: string; data: LicenseTierStatsData } | null = null;
let cachedLeaderboard: { key: string; data: CatalogLeaderboardData } | null = null;
let cachedCategories: { key: string; data: CategoryDistributionData } | null = null;
let cachedVelocity: CatalogVelocityData | null = null;
let cachedConcentration: CreatorConcentrationData | null = null;
let cachedTrendingSearches: { key: string; data: TrendingSearchQueriesData } | null = null;
let cachedZeroResults: { key: string; data: ZeroResultSearchesData } | null = null;
let cachedSearchFunnel: { key: string; data: SearchConversionFunnelData } | null = null;
let cachedBuyerFunnel: { key: string; data: StorefrontFunnelData } | null = null;
let cachedCohortRetention: BuyerCohortRetentionData | null = null;
let cachedDownloadsOverview: { key: string; data: DownloadsOverviewData } | null = null;
let cachedDownloadAnomalies: DownloadAnomaliesData | null = null;
let cachedCouponsSummary: { key: string; data: CouponsSummaryData } | null = null;
let cachedMarketingBanners: { key: string; data: MarketingBannersData } | null = null;
let cachedCurationImpact: CurationImpactData | null = null;
let cachedGrowthTriggers: GrowthTriggersData | null = null;

export const analyticsService = {
  getCachedSummary(period: string = "30d"): FinancialSummaryData | null {
    if (cachedSummary && cachedSummary.key === period) {
      return cachedSummary.data;
    }
    return cachedSummary?.data ?? null;
  },

  getCachedTrend(period: string = "30d"): RevenueTrendData | null {
    if (cachedTrend && cachedTrend.key === period) {
      return cachedTrend.data;
    }
    return cachedTrend?.data ?? null;
  },

  getCachedTiers(period: string = "30d"): LicenseTierStatsData | null {
    if (cachedTiers && cachedTiers.key === period) {
      return cachedTiers.data;
    }
    return cachedTiers?.data ?? null;
  },

  getCachedLeaderboard(period: string = "30d"): CatalogLeaderboardData | null {
    if (cachedLeaderboard && cachedLeaderboard.key === period) {
      return cachedLeaderboard.data;
    }
    return cachedLeaderboard?.data ?? null;
  },

  getCachedCategories(period: string = "30d"): CategoryDistributionData | null {
    if (cachedCategories && cachedCategories.key === period) {
      return cachedCategories.data;
    }
    return cachedCategories?.data ?? null;
  },

  getCachedVelocity(): CatalogVelocityData | null {
    return cachedVelocity;
  },

  getCachedConcentration(): CreatorConcentrationData | null {
    return cachedConcentration;
  },

  getCachedTrendingSearches(period: string = "30d"): TrendingSearchQueriesData | null {
    if (cachedTrendingSearches && cachedTrendingSearches.key === period) {
      return cachedTrendingSearches.data;
    }
    return cachedTrendingSearches?.data ?? null;
  },

  getCachedZeroResults(period: string = "30d"): ZeroResultSearchesData | null {
    if (cachedZeroResults && cachedZeroResults.key === period) {
      return cachedZeroResults.data;
    }
    return cachedZeroResults?.data ?? null;
  },

  getCachedSearchFunnel(period: string = "30d"): SearchConversionFunnelData | null {
    if (cachedSearchFunnel && cachedSearchFunnel.key === period) {
      return cachedSearchFunnel.data;
    }
    return cachedSearchFunnel?.data ?? null;
  },

  getCachedBuyerFunnel(period: string = "30d"): StorefrontFunnelData | null {
    if (cachedBuyerFunnel && cachedBuyerFunnel.key === period) {
      return cachedBuyerFunnel.data;
    }
    return cachedBuyerFunnel?.data ?? null;
  },

  getCachedCohortRetention(): BuyerCohortRetentionData | null {
    return cachedCohortRetention;
  },

  getCachedDownloadsOverview(period: string = "30d"): DownloadsOverviewData | null {
    if (cachedDownloadsOverview && cachedDownloadsOverview.key === period) {
      return cachedDownloadsOverview.data;
    }
    return cachedDownloadsOverview?.data ?? null;
  },

  getCachedDownloadAnomalies(): DownloadAnomaliesData | null {
    return cachedDownloadAnomalies;
  },

  getCachedCouponsSummary(period: string = "30d"): CouponsSummaryData | null {
    if (cachedCouponsSummary && cachedCouponsSummary.key === period) {
      return cachedCouponsSummary.data;
    }
    return cachedCouponsSummary?.data ?? null;
  },

  getCachedMarketingBanners(period: string = "30d"): MarketingBannersData | null {
    if (cachedMarketingBanners && cachedMarketingBanners.key === period) {
      return cachedMarketingBanners.data;
    }
    return cachedMarketingBanners?.data ?? null;
  },

  getCachedCurationImpact(): CurationImpactData | null {
    return cachedCurationImpact;
  },

  getCachedGrowthTriggers(): GrowthTriggersData | null {
    return cachedGrowthTriggers;
  },

  clearCache(): void {
    cachedSummary = null;
    cachedTrend = null;
    cachedTiers = null;
    cachedLeaderboard = null;
    cachedCategories = null;
    cachedVelocity = null;
    cachedConcentration = null;
    cachedTrendingSearches = null;
    cachedZeroResults = null;
    cachedSearchFunnel = null;
    cachedBuyerFunnel = null;
    cachedCohortRetention = null;
    cachedDownloadsOverview = null;
    cachedDownloadAnomalies = null;
    cachedCouponsSummary = null;
    cachedMarketingBanners = null;
    cachedCurationImpact = null;
    cachedGrowthTriggers = null;
  },

  async getFinancialSummary(
    period: AnalyticsPeriod = "30d",
    from?: string,
    to?: string,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<FinancialSummaryData> {
    const params = new URLSearchParams();
    params.set("period", period);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const key = `${period}_${from || ""}_${to || ""}`;
    const response = await apiRequest<{ success: boolean; data: FinancialSummaryData }>(
      `/analytics/financial/summary?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedSummary = { key, data: response.data };
    return response.data;
  },

  async getRevenueTrend(
    period: AnalyticsPeriod = "30d",
    interval: "day" | "week" | "month" = "day",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<RevenueTrendData> {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("interval", interval);

    const key = `${period}_${interval}`;
    const response = await apiRequest<{ success: boolean; data: RevenueTrendData }>(
      `/analytics/financial/revenue-trend?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedTrend = { key, data: response.data };
    return response.data;
  },

  async getLicenseTierStats(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<LicenseTierStatsData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: LicenseTierStatsData }>(
      `/analytics/financial/license-tiers?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedTiers = { key: period, data: response.data };
    return response.data;
  },

  async getTopCreators(
    period: AnalyticsPeriod = "30d",
    limit: number = 10,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<TopCreatorsData> {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("limit", String(limit));

    const response = await apiRequest<{ success: boolean; data: TopCreatorsData }>(
      `/analytics/financial/top-creators?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    return response.data;
  },

  async getCatalogLeaderboard(
    period: AnalyticsPeriod = "30d",
    limit: number = 25,
    metric: "revenue" | "sales" | "views" | "downloads" = "revenue",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CatalogLeaderboardData> {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("limit", String(limit));
    params.set("metric", metric);

    const response = await apiRequest<{ success: boolean; data: CatalogLeaderboardData }>(
      `/analytics/catalog/leaderboard?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedLeaderboard = { key: period, data: response.data };
    return response.data;
  },

  async getCategoryDistribution(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CategoryDistributionData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: CategoryDistributionData }>(
      `/analytics/catalog/category-distribution?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedCategories = { key: period, data: response.data };
    return response.data;
  },

  async getCatalogVelocityStats(
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CatalogVelocityData> {
    const response = await apiRequest<{ success: boolean; data: CatalogVelocityData }>(
      `/analytics/catalog/velocity-stats`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedVelocity = response.data;
    return response.data;
  },

  async getCreatorConcentration(
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CreatorConcentrationData> {
    const response = await apiRequest<{ success: boolean; data: CreatorConcentrationData }>(
      `/analytics/creators/concentration-curve`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedConcentration = response.data;
    return response.data;
  },

  async getTrendingSearchQueries(
    period: AnalyticsPeriod = "30d",
    limit: number = 25,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<TrendingSearchQueriesData> {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("limit", String(limit));

    const response = await apiRequest<{ success: boolean; data: TrendingSearchQueriesData }>(
      `/analytics/search/trending-queries?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedTrendingSearches = { key: period, data: response.data };
    return response.data;
  },

  async getZeroResultSearches(
    period: AnalyticsPeriod = "30d",
    limit: number = 25,
    minQueries: number = 1,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<ZeroResultSearchesData> {
    const params = new URLSearchParams();
    params.set("period", period);
    params.set("limit", String(limit));
    params.set("minQueries", String(minQueries));

    const response = await apiRequest<{ success: boolean; data: ZeroResultSearchesData }>(
      `/analytics/search/zero-results?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedZeroResults = { key: period, data: response.data };
    return response.data;
  },

  async getSearchConversionFunnel(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<SearchConversionFunnelData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: SearchConversionFunnelData }>(
      `/analytics/search/conversion-funnel?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedSearchFunnel = { key: period, data: response.data };
    return response.data;
  },

  async getStorefrontFunnel(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<StorefrontFunnelData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: StorefrontFunnelData }>(
      `/analytics/buyers/funnel?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedBuyerFunnel = { key: period, data: response.data };
    return response.data;
  },

  async getBuyerCohortRetention(
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<BuyerCohortRetentionData> {
    const response = await apiRequest<{ success: boolean; data: BuyerCohortRetentionData }>(
      `/analytics/buyers/cohort-retention`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedCohortRetention = response.data;
    return response.data;
  },

  async getDownloadsOverview(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<DownloadsOverviewData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: DownloadsOverviewData }>(
      `/analytics/downloads/overview?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedDownloadsOverview = { key: period, data: response.data };
    return response.data;
  },

  async getDownloadAnomalies(
    limit: number = 10,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<DownloadAnomaliesData> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));

    const response = await apiRequest<{ success: boolean; data: DownloadAnomaliesData }>(
      `/analytics/downloads/anomalies?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedDownloadAnomalies = response.data;
    return response.data;
  },

  async getCouponsSummary(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CouponsSummaryData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: CouponsSummaryData }>(
      `/analytics/marketing/coupons-summary?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedCouponsSummary = { key: period, data: response.data };
    return response.data;
  },

  async getBannersPerformance(
    period: AnalyticsPeriod = "30d",
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<MarketingBannersData> {
    const params = new URLSearchParams();
    params.set("period", period);

    const response = await apiRequest<{ success: boolean; data: MarketingBannersData }>(
      `/analytics/marketing/banners-performance?${params.toString()}`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedMarketingBanners = { key: period, data: response.data };
    return response.data;
  },

  async getCurationImpact(
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<CurationImpactData> {
    const response = await apiRequest<{ success: boolean; data: CurationImpactData }>(
      `/analytics/marketing/curation-impact`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedCurationImpact = response.data;
    return response.data;
  },

  async getGrowthTriggers(
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<GrowthTriggersData> {
    const response = await apiRequest<{ success: boolean; data: GrowthTriggersData }>(
      `/analytics/insights/automated-triggers`,
      { silent: options.silent ?? false, signal: options.signal },
    );

    cachedGrowthTriggers = response.data;
    return response.data;
  },

  async dismissGrowthTrigger(
    id: string,
    options: { silent?: boolean; signal?: AbortSignal } = {},
  ): Promise<void> {
    await apiRequest<{ success: boolean; message: string }>(
      `/analytics/insights/${id}/dismiss`,
      {
        method: "POST",
        silent: options.silent ?? false,
        signal: options.signal,
      },
    );

    if (cachedGrowthTriggers) {
      cachedGrowthTriggers = {
        triggers: cachedGrowthTriggers.triggers.filter((t) => t.id !== id),
      };
    }
  },

  async exportCsvReport(
    reportType: "financial" | "catalog" | "coupons" = "financial",
    period: AnalyticsPeriod = "30d",
    from?: string,
    to?: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const params = new URLSearchParams();
    params.set("reportType", reportType);
    params.set("period", period);
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const token = authService.getStoredToken();
    const normalizedUrl = `${API_BASE_URL}/api/v1/analytics/reports/export-csv?${params.toString()}`;

    const response = await fetch(normalizedUrl, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: options.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        "Failed to generate and download CSV export report.",
        response.status,
      );
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition");
    let filename = `assetdrop_${reportType}_${period}.csv`;
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};

