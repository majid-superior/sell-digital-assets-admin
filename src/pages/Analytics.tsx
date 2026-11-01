import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Spinner,
  EmptyState,
} from "@/components/ui/index.ts";
import {
  analyticsService,
  type AnalyticsPeriod,
  type FinancialSummaryData,
  type RevenueTrendData,
  type LicenseTierStatsData,
  type CatalogLeaderboardData,
  type CategoryDistributionData,
  type CatalogVelocityData,
  type CreatorConcentrationData,
  type TrendingSearchQueriesData,
  type ZeroResultSearchesData,
  type SearchConversionFunnelData,
  type StorefrontFunnelData,
  type BuyerCohortRetentionData,
  type DownloadsOverviewData,
  type DownloadAnomaliesData,
  type CouponsSummaryData,
  type MarketingBannersData,
  type CurationImpactData,
  type GrowthTriggersData,
  type GrowthTriggerItem,
  type DwellTimesLeaderboardRow,
  type InterestMatrixRow,
  type VisitorRetentionData,
  type BuyerSellerInteractionRow,
} from "@/services/index.ts";
import type { NavTabId } from "@/layouts/Sidebar.tsx";

export type AnalyticsViewTab =
  | "monetization"
  | "supply"
  | "search"
  | "behavior"
  | "retention"
  | "marketing"
  | "growth";

function navTabToAnalyticsView(tab?: string): AnalyticsViewTab {
  switch (tab) {
    case "analytics-supply":
      return "supply";
    case "analytics-search":
      return "search";
    case "analytics-behavior":
      return "behavior";
    case "analytics-retention":
      return "retention";
    case "analytics-marketing":
      return "marketing";
    case "analytics-growth":
      return "growth";
    case "analytics":
    case "analytics-revenue":
    default:
      return "monetization";
  }
}

export interface AnalyticsProps {
  activeSubTab?: NavTabId;
  onSelectSubTab?: (tabId: NavTabId) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ activeSubTab }) => {
  const activeTab: AnalyticsViewTab = navTabToAnalyticsView(activeSubTab);

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>("30d");
  const [leaderboardMetric, setLeaderboardMetric] = useState<
    "revenue" | "sales" | "views" | "downloads"
  >("revenue");

  // In-memory initial states for instant 0ms tab switching
  const [summary, setSummary] = useState<FinancialSummaryData | null>(() =>
    analyticsService.getCachedSummary("30d"),
  );
  const [trend, setTrend] = useState<RevenueTrendData | null>(() =>
    analyticsService.getCachedTrend("30d"),
  );
  const [tiers, setTiers] = useState<LicenseTierStatsData | null>(() =>
    analyticsService.getCachedTiers("30d"),
  );
  const [leaderboard, setLeaderboard] = useState<CatalogLeaderboardData | null>(() =>
    analyticsService.getCachedLeaderboard("30d"),
  );
  const [categories, setCategories] = useState<CategoryDistributionData | null>(() =>
    analyticsService.getCachedCategories("30d"),
  );
  const [velocity, setVelocity] = useState<CatalogVelocityData | null>(() =>
    analyticsService.getCachedVelocity(),
  );
  const [concentration, setConcentration] = useState<CreatorConcentrationData | null>(() =>
    analyticsService.getCachedConcentration(),
  );
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearchQueriesData | null>(() =>
    analyticsService.getCachedTrendingSearches("30d"),
  );
  const [zeroResults, setZeroResults] = useState<ZeroResultSearchesData | null>(() =>
    analyticsService.getCachedZeroResults("30d"),
  );
  const [searchFunnel, setSearchFunnel] = useState<SearchConversionFunnelData | null>(() =>
    analyticsService.getCachedSearchFunnel("30d"),
  );
  const [buyerFunnel, setBuyerFunnel] = useState<StorefrontFunnelData | null>(() =>
    analyticsService.getCachedBuyerFunnel("30d"),
  );
  const [cohorts, setCohorts] = useState<BuyerCohortRetentionData | null>(() =>
    analyticsService.getCachedCohortRetention(),
  );
  const [downloads, setDownloads] = useState<DownloadsOverviewData | null>(() =>
    analyticsService.getCachedDownloadsOverview("30d"),
  );
  const [anomalies, setAnomalies] = useState<DownloadAnomaliesData | null>(() =>
    analyticsService.getCachedDownloadAnomalies(),
  );
  const [couponsSummary, setCouponsSummary] = useState<CouponsSummaryData | null>(() =>
    analyticsService.getCachedCouponsSummary("30d"),
  );
  const [marketingBanners, setMarketingBanners] = useState<MarketingBannersData | null>(() =>
    analyticsService.getCachedMarketingBanners("30d"),
  );
  const [curationImpact, setCurationImpact] = useState<CurationImpactData | null>(() =>
    analyticsService.getCachedCurationImpact(),
  );
  const [growthTriggers, setGrowthTriggers] = useState<GrowthTriggersData | null>(() =>
    analyticsService.getCachedGrowthTriggers(),
  );
  const [dwellTimes, setDwellTimes] = useState<DwellTimesLeaderboardRow[] | null>(() =>
    analyticsService.getCachedDwellTimes("30d"),
  );
  const [interestMatrix, setInterestMatrix] = useState<InterestMatrixRow[] | null>(() =>
    analyticsService.getCachedInterestMatrix("30d"),
  );
  const [retentionStats, setRetentionStats] = useState<VisitorRetentionData | null>(() =>
    analyticsService.getCachedRetentionStats("30d"),
  );
  const [buyerSellerInteractions, setBuyerSellerInteractions] = useState<BuyerSellerInteractionRow[] | null>(() =>
    analyticsService.getCachedBuyerSellerInteractions("30d"),
  );

  const [isLoading, setIsLoading] = useState<boolean>(
    () => !analyticsService.getCachedSummary("30d"),
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setSelectedPeriod(period);
    if (!analyticsService.getCachedSummary(period)) {
      setIsLoading(true);
    }
  };

  const handleCopyQuery = (queryText: string) => {
    navigator.clipboard.writeText(queryText);
    toast.success("Keyword Copied", {
      description: `"${queryText}" copied to clipboard to share with creators.`,
    });
  };

  const handleDismissTrigger = async (id: string) => {
    try {
      await analyticsService.dismissGrowthTrigger(id);
      setGrowthTriggers((prev) =>
        prev ? { triggers: prev.triggers.filter((t) => t.id !== id) } : null,
      );
      toast.success("Trigger Acknowledged", {
        description: "Insight dismissed and removed from active list.",
      });
    } catch (err: unknown) {
      toast.error("Action Failed", {
        description:
          err instanceof Error ? err.message : "Unable to dismiss growth trigger.",
      });
    }
  };

  const handleExportCsv = async (reportType: "financial" | "catalog" | "coupons") => {
    try {
      setIsExportingCsv(true);
      await analyticsService.exportCsvReport(reportType, selectedPeriod);
      toast.success("CSV Export Completed", {
        description: `Exported ${reportType} report for period: ${selectedPeriod}.`,
      });
    } catch (err: unknown) {
      toast.error("Export Failed", {
        description:
          err instanceof Error ? err.message : "Failed to generate CSV export.",
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Initial load and period changes with AbortController & resilient allSettled
  useEffect(() => {
    const controller = new AbortController();
    const hasCached = Boolean(analyticsService.getCachedSummary(selectedPeriod));

    Promise.allSettled([
      analyticsService.getFinancialSummary(selectedPeriod, undefined, undefined, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getRevenueTrend(selectedPeriod, "day", {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getLicenseTierStats(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCatalogLeaderboard(selectedPeriod, 25, leaderboardMetric, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCategoryDistribution(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCatalogVelocityStats({
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCreatorConcentration({
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getTrendingSearchQueries(selectedPeriod, 25, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getZeroResultSearches(selectedPeriod, 25, 1, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getSearchConversionFunnel(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getStorefrontFunnel(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getBuyerCohortRetention({
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getDownloadsOverview(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getDownloadAnomalies(10, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCouponsSummary(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getBannersPerformance(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getCurationImpact({
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getGrowthTriggers({
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getDwellTimes(selectedPeriod, 25, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getInterestMatrix(selectedPeriod, 25, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getVisitorRetention(selectedPeriod, {
        silent: hasCached,
        signal: controller.signal,
      }),
      analyticsService.getBuyerSellerInteractions(selectedPeriod, 25, {
        silent: hasCached,
        signal: controller.signal,
      }),
    ])
      .then((results) => {
        if (results[0].status === "fulfilled") setSummary(results[0].value);
        if (results[1].status === "fulfilled") setTrend(results[1].value);
        if (results[2].status === "fulfilled") setTiers(results[2].value);
        if (results[3].status === "fulfilled") setLeaderboard(results[3].value);
        if (results[4].status === "fulfilled") setCategories(results[4].value);
        if (results[5].status === "fulfilled") setVelocity(results[5].value);
        if (results[6].status === "fulfilled") setConcentration(results[6].value);
        if (results[7].status === "fulfilled") setTrendingSearches(results[7].value);
        if (results[8].status === "fulfilled") setZeroResults(results[8].value);
        if (results[9].status === "fulfilled") setSearchFunnel(results[9].value);
        if (results[10].status === "fulfilled") setBuyerFunnel(results[10].value);
        if (results[11].status === "fulfilled") setCohorts(results[11].value);
        if (results[12].status === "fulfilled") setDownloads(results[12].value);
        if (results[13].status === "fulfilled") setAnomalies(results[13].value);
        if (results[14].status === "fulfilled") setCouponsSummary(results[14].value);
        if (results[15].status === "fulfilled") setMarketingBanners(results[15].value);
        if (results[16].status === "fulfilled") setCurationImpact(results[16].value);
        if (results[17].status === "fulfilled") setGrowthTriggers(results[17].value);
        if (results[18].status === "fulfilled") setDwellTimes(results[18].value);
        if (results[19].status === "fulfilled") setInterestMatrix(results[19].value);
        if (results[20].status === "fulfilled") setRetentionStats(results[20].value);
        if (results[21].status === "fulfilled") setBuyerSellerInteractions(results[21].value);

        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to load platform analytics. Please try again.";
        toast.error("Analytics Sync Failed", {
          description: errorMsg,
        });
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedPeriod, leaderboardMetric]);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const results = await Promise.allSettled([
        analyticsService.getFinancialSummary(selectedPeriod, undefined, undefined, { silent: false }),
        analyticsService.getRevenueTrend(selectedPeriod, "day", { silent: false }),
        analyticsService.getLicenseTierStats(selectedPeriod, { silent: false }),
        analyticsService.getCatalogLeaderboard(selectedPeriod, 25, leaderboardMetric, { silent: false }),
        analyticsService.getCategoryDistribution(selectedPeriod, { silent: false }),
        analyticsService.getCatalogVelocityStats({ silent: false }),
        analyticsService.getCreatorConcentration({ silent: false }),
        analyticsService.getTrendingSearchQueries(selectedPeriod, 25, { silent: false }),
        analyticsService.getZeroResultSearches(selectedPeriod, 25, 1, { silent: false }),
        analyticsService.getSearchConversionFunnel(selectedPeriod, { silent: false }),
        analyticsService.getStorefrontFunnel(selectedPeriod, { silent: false }),
        analyticsService.getBuyerCohortRetention({ silent: false }),
        analyticsService.getDownloadsOverview(selectedPeriod, { silent: false }),
        analyticsService.getDownloadAnomalies(10, { silent: false }),
        analyticsService.getCouponsSummary(selectedPeriod, { silent: false }),
        analyticsService.getBannersPerformance(selectedPeriod, { silent: false }),
        analyticsService.getCurationImpact({ silent: false }),
        analyticsService.getGrowthTriggers({ silent: false }),
        analyticsService.getDwellTimes(selectedPeriod, 25, { silent: false }),
        analyticsService.getInterestMatrix(selectedPeriod, 25, { silent: false }),
        analyticsService.getVisitorRetention(selectedPeriod, { silent: false }),
        analyticsService.getBuyerSellerInteractions(selectedPeriod, 25, { silent: false }),
      ]);

      if (results[0].status === "fulfilled") setSummary(results[0].value);
      if (results[1].status === "fulfilled") setTrend(results[1].value);
      if (results[2].status === "fulfilled") setTiers(results[2].value);
      if (results[3].status === "fulfilled") setLeaderboard(results[3].value);
      if (results[4].status === "fulfilled") setCategories(results[4].value);
      if (results[5].status === "fulfilled") setVelocity(results[5].value);
      if (results[6].status === "fulfilled") setConcentration(results[6].value);
      if (results[7].status === "fulfilled") setTrendingSearches(results[7].value);
      if (results[8].status === "fulfilled") setZeroResults(results[8].value);
      if (results[9].status === "fulfilled") setSearchFunnel(results[9].value);
      if (results[10].status === "fulfilled") setBuyerFunnel(results[10].value);
      if (results[11].status === "fulfilled") setCohorts(results[11].value);
      if (results[12].status === "fulfilled") setDownloads(results[12].value);
      if (results[13].status === "fulfilled") setAnomalies(results[13].value);
      if (results[14].status === "fulfilled") setCouponsSummary(results[14].value);
      if (results[15].status === "fulfilled") setMarketingBanners(results[15].value);
      if (results[16].status === "fulfilled") setCurationImpact(results[16].value);
      if (results[17].status === "fulfilled") setGrowthTriggers(results[17].value);
      if (results[18].status === "fulfilled") setDwellTimes(results[18].value);
      if (results[19].status === "fulfilled") setInterestMatrix(results[19].value);
      if (results[20].status === "fulfilled") setRetentionStats(results[20].value);
      if (results[21].status === "fulfilled") setBuyerSellerInteractions(results[21].value);

      toast.success("Analytics Updated", {
        description: "Metrics successfully synchronized with live PostgreSQL records.",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to synchronize analytics. Please try again.";
      toast.error("Analytics Sync Failed", {
        description: errorMsg,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const currencySymbol = summary?.currency.symbol || "$";
  const metrics = summary?.metrics;
  const funnel = searchFunnel?.funnel;

  const periods: { label: string; value: AnalyticsPeriod }[] = [
    { label: "Today", value: "today" },
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "90D", value: "90d" },
    { label: "YTD", value: "ytd" },
    { label: "1Y", value: "1y" },
    { label: "All", value: "all" },
  ];

  // Helper for trend chart scaling
  const timelinePoints = trend?.timeline || [];
  const maxGmvInTrend = Math.max(...timelinePoints.map((p) => p.gmv), 1);

  const VIEW_METADATA: Record<
    AnalyticsViewTab,
    { label: string; title: string; description: string; icon: React.ReactNode }
  > = {
    monetization: {
      label: "Revenue",
      title: "Revenue & Monetization Pulse",
      description:
        "Platform gross merchandise volume, platform commissions, tier mix, and creator revenue.",
      icon: <Icons.Coins size={14} />,
    },
    supply: {
      label: "Supply",
      title: "Marketplace Supply & Catalog",
      description:
        "Inventory velocity, catalog liquidity, dead stock counts, and creator earnings distribution.",
      icon: <Icons.Store size={14} />,
    },
    search: {
      label: "Search",
      title: "Search Demand & Telemetry",
      description:
        "Buyer search intent, unfulfilled zero-result queries, and search-to-purchase conversion.",
      icon: <Icons.Search size={14} />,
    },
    behavior: {
      label: "Behavior",
      title: "User Engagement & Dwell Intelligence",
      description:
        "Active page focus times, category interest affinities, repeat visitor cohorts, and buyer-seller touchpoints.",
      icon: <Icons.Eye size={14} />,
    },
    retention: {
      label: "Retention",
      title: "Buyer Retention & Funnel",
      description:
        "Storefront conversion funnels, monthly buyer cohort retention matrices, and download traffic.",
      icon: <Icons.Users size={14} />,
    },
    marketing: {
      label: "Marketing",
      title: "Marketing & Campaigns",
      description:
        "Promotional coupon redemptions, hero showcases, and editorial staff pick benchmarks.",
      icon: <Icons.Ticket size={14} />,
    },
    growth: {
      label: "Growth",
      title: "Growth Levers & Intelligence",
      description:
        "Algorithmic pricing optimization, supply deficit alerts, and accounting CSV exports.",
      icon: <Icons.Magic size={14} />,
    },
  };

  const currentView = VIEW_METADATA[activeTab];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-4 sm:pb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.TrendingUp size={13} className="mr-1" /> Analytics
              </Badge>
              <span className="text-on-surface-variant/40 text-xs">/</span>
              <Badge
                variant="outline"
                size="sm"
                className="font-semibold text-xs flex items-center gap-1"
              >
                {currentView.icon}
                <span>{currentView.label}</span>
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              {currentView.title}
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              {currentView.description}
            </p>
          </div>

          {/* Controls: Date Range Filter + Refresh Button + CSV Export */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Period Segmented Toggle */}
            <div className="inline-flex rounded-lg border border-outline-variant/40 bg-surface-container p-1 shadow-xs">
              {periods.map((p) => {
                const isActive = selectedPeriod === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePeriodChange(p.value)}
                    disabled={isLoading || isRefreshing}
                    className={`px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary text-on-primary shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isLoading || isRefreshing}
              leftIcon={
                isRefreshing ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.RefreshCw size={14} />
                )
              }
              className="shrink-0 cursor-pointer"
            >
              {isRefreshing ? "Syncing..." : "Sync"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleExportCsv(
                  activeTab === "supply"
                    ? "catalog"
                    : activeTab === "marketing"
                    ? "coupons"
                    : "financial",
                )
              }
              disabled={isLoading || isRefreshing || isExportingCsv}
              leftIcon={
                isExportingCsv ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.FileText size={14} />
                )
              }
              className="shrink-0 cursor-pointer"
            >
              {isExportingCsv ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VIEW 1: MONETIZATION PULSE (Financials)                             */}
      {/* ==================================================================== */}
      {activeTab === "monetization" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Gross Volume (GMV)
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Coins size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !metrics ? (
                    <div className="h-8 w-28 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(metrics?.gmv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {metrics?.totalOrders || 0} completed orders ({metrics?.totalItemsSold || 0} asset licenses)
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Net Platform Revenue
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.Wallet size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !metrics ? (
                    <div className="h-8 w-28 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(metrics?.netRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Commission take retained after creator allocations
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Creator Earnings
                  </span>
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                    <Icons.Banknote size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !metrics ? (
                    <div className="h-8 w-28 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(metrics?.creatorEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Total payout allocated to asset sellers
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Average Order (AOV)
                  </span>
                  <div className="p-2 rounded-lg bg-info/10 text-info border border-info/20">
                    <Icons.TrendingUp size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !metrics ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(metrics?.averageOrderValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-on-surface-variant">Refund rate:</span>
                  <Badge
                    variant={(metrics?.refundRate || 0) > 2 ? "error" : "success"}
                    size="sm"
                  >
                    {metrics?.refundRate || 0}% ({metrics?.refundsCount || 0})
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Velocity Timeline Chart */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2 border-b border-outline-variant/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">Revenue Velocity Timeline</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Daily breakdown of gross merchandise sales and net platform retention
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-primary" />
                    <span>Gross GMV</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-success" />
                    <span>Net Platform Cut</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {isLoading && timelinePoints.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <Spinner size="md" color="primary" />
                </div>
              ) : timelinePoints.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                  <Icons.Coins size={32} className="text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Completed Orders Yet</p>
                  <p className="text-xs text-on-surface-variant max-w-sm mt-1">
                    Revenue timelines will populate automatically once purchases are recorded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="h-44 flex items-end gap-1.5 sm:gap-2 pt-6 overflow-x-hidden">
                    {timelinePoints.map((point) => {
                      const gmvHeight = Math.max(
                        Math.round((point.gmv / maxGmvInTrend) * 100),
                        point.gmv > 0 ? 8 : 2,
                      );
                      const netHeight = Math.max(
                        Math.round((point.netRevenue / maxGmvInTrend) * 100),
                        point.netRevenue > 0 ? 6 : 0,
                      );

                      return (
                        <div
                          key={point.date}
                          className="flex-1 flex flex-col items-center gap-1 min-w-[12px] group relative cursor-pointer"
                        >
                          <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-inverse-surface text-inverse-on-surface text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                            {point.date}: {currencySymbol}{point.gmv.toFixed(2)} GMV ({point.ordersCount} orders)
                          </div>

                          <div className="w-full flex items-end justify-center gap-0.5 h-36">
                            <div
                              style={{ height: `${gmvHeight}%` }}
                              className="w-full max-w-3.5 bg-primary/80 hover:bg-primary rounded-t-xs transition-colors"
                            />
                            {point.netRevenue > 0 && (
                              <div
                                style={{ height: `${netHeight}%` }}
                                className="w-full max-w-3.5 bg-success/80 hover:bg-success rounded-t-xs transition-colors"
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-on-surface-variant/70 truncate w-full text-center">
                            {point.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Grid: License Distribution */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Revenue by License Tier</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Volume breakdown across Personal, Commercial, and Enterprise tiers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {(tiers?.tiers || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-on-surface-variant">
                  No license tier sales recorded for this period.
                </div>
              ) : (
                <div className="space-y-4">
                  {(tiers?.tiers || []).map((t) => (
                    <div key={t.tierType} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-semibold text-on-surface capitalize">
                          {t.name || t.tierType} License
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">
                            {currencySymbol}{t.gmv.toFixed(2)}
                          </span>
                          <span className="text-on-surface-variant">({t.salesCount} sold)</span>
                          <Badge variant="primary" size="sm">
                            {t.percentageOfGmv}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(t.percentageOfGmv, 1)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 2: SUPPLY & CATALOG HEALTH                                      */}
      {/* ==================================================================== */}
      {activeTab === "supply" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Catalog Liquidity
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Store size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !velocity ? (
                    <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${velocity?.catalogLiquidityRate || 0}%`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {velocity?.activeSellingAssets || 0} of {velocity?.totalPublishedAssets || 0} assets sold
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    30-Day First-Sale Rate
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.TrendingUp size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !velocity ? (
                    <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${velocity?.firstSale30dRate || 0}%`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  New assets achieving sales within 30 days
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Dead / Dormant Inventory
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.Box size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !velocity ? (
                    <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    velocity?.deadInventoryCount || 0
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {velocity?.deadInventoryRate || 0}% published &gt;60d with 0 sales
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Active Creators Pool
                  </span>
                  <div className="p-2 rounded-lg bg-info/10 text-info border border-info/20">
                    <Icons.Users size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !concentration ? (
                    <div className="h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    concentration?.totalActiveCreators || 0
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {currencySymbol}{(concentration?.unsettledEarnings || 0).toLocaleString()} unsettled balance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Asset Leaderboard */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold">Catalog Performance Leaderboard</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Highest velocity digital assets across the marketplace
                  </CardDescription>
                </div>
                <div className="inline-flex rounded-lg border border-outline-variant/40 bg-surface-container p-0.5 text-xs font-semibold">
                  {(["revenue", "sales", "views", "downloads"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLeaderboardMetric(m)}
                      className={`px-2.5 py-1 rounded-md transition-colors capitalize cursor-pointer ${
                        leaderboardMetric === m
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !leaderboard ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (leaderboard?.leaderboard || []).length === 0 ? (
                <div className="p-8 text-center text-xs text-on-surface-variant">
                  No published assets found matching this period.
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(leaderboard?.leaderboard || []).map((item, index) => (
                    <div
                      key={item.assetId}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center text-xs font-bold text-on-surface-variant/60 shrink-0">
                          #{index + 1}
                        </span>
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg object-cover border border-outline-variant/30 shrink-0 bg-surface-container"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30 text-on-surface-variant">
                            <Icons.Box size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{item.title}</p>
                          <span className="text-xs text-on-surface-variant">
                            {item.categoryName} &bull; by {item.creatorName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Units Sold
                          </span>
                          <span className="text-sm font-bold text-on-surface">{item.unitsSold}</span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Gross GMV
                          </span>
                          <span className="text-sm font-bold text-success">
                            {currencySymbol}{item.grossRevenue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution Grid */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Category Distribution &amp; Share</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Inventory density and revenue share mapped to primary marketplace categories
                  </CardDescription>
                </div>
                {categories?.categories && categories.categories.length > 0 && (
                  <Badge variant="outline" size="sm">
                    {categories.categories.filter((c) => c.assetCount > 0 || c.grossRevenue > 0).length > 0
                      ? `${categories.categories.filter((c) => c.assetCount > 0 || c.grossRevenue > 0).length} Active Categories`
                      : `${categories.categories.length} Categories`}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {(() => {
                const allCats = categories?.categories || [];
                if (allCats.length === 0) {
                  return (
                    <div className="text-center text-xs text-on-surface-variant py-4">
                      No active categories recorded.
                    </div>
                  );
                }
                const activeCats = allCats.filter((c) => c.assetCount > 0 || c.grossRevenue > 0);
                const displayCats = activeCats.length > 0 ? activeCats : allCats.slice(0, 10);

                return (
                  <div className="space-y-4">
                    {displayCats.map((cat) => (
                      <div key={cat.categoryId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="font-semibold text-on-surface">{cat.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-on-surface">
                              {currencySymbol}{cat.grossRevenue.toFixed(2)}
                            </span>
                            <span className="text-on-surface-variant">({cat.assetCount} assets)</span>
                            <Badge variant={cat.assetCount > 0 ? "primary" : "outline"} size="sm">
                              {cat.percentageOfRevenue}%
                            </Badge>
                          </div>
                        </div>
                        <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(cat.percentageOfRevenue, cat.assetCount > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 3: SEARCH & UNMET DEMAND (High-Growth Engine)                  */}
      {/* ==================================================================== */}
      {activeTab === "search" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Total Searches
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Search size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !funnel ? (
                    <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    funnel?.totalSearches ?? 0
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {funnel?.searchesWithResults ?? 0} found matching assets ({funnel?.resultsRate ?? 0}%)
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Search CTR
                  </span>
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                    <Icons.Performance size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !funnel ? (
                    <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${(funnel?.ctr ?? 0).toFixed(1)}%`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {funnel?.searchesWithClicks ?? 0} queries clicked into asset listings
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Search-to-Purchase
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.Coins size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !funnel ? (
                    <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${(funnel?.conversionRate ?? 0).toFixed(1)}%`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {funnel?.searchesConverted ?? 0} searches converted into purchases
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Unmet Demand (0 Results)
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.AlertCircle size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !zeroResults ? (
                    <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    zeroResults?.unmetDemandCount ?? 0
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Distinct keywords with 0 catalog matches
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Zero-Result Search "Gold Mine" */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Unmet Demand &ldquo;Gold Mine&rdquo; (0 Results)</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Keywords buyers searched for where the platform had 0 assets
                  </CardDescription>
                </div>
                <Badge variant="warning" size="sm">
                  Creator Bounty Opportunity
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !zeroResults ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (zeroResults?.queries || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Check size={28} className="mx-auto text-success mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Unmet Search Gaps</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    All search queries returned matching digital assets.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(zeroResults?.queries || []).map((item) => (
                    <div
                      key={item.query}
                      className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-on-surface">
                            &ldquo;{item.query}&rdquo;
                          </span>
                          <Badge variant="error" size="sm">
                            0 assets
                          </Badge>
                        </div>
                        <span className="text-xs text-on-surface-variant mt-0.5 block">
                          Last searched: {new Date(item.lastSearchedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-bold text-on-surface">
                            {item.searchCount}
                          </span>
                          <span className="text-xs text-on-surface-variant block">searches</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyQuery(item.query)}
                          leftIcon={<Icons.Copy size={13} />}
                          className="text-xs cursor-pointer"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trending Searches Grid */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Trending Search Keywords</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Most frequent buyer search terms, click-through rates, and catalog relevancy
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !trendingSearches ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (trendingSearches?.queries || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Search size={28} className="mx-auto text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Search Logs Recorded</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Storefront search telemetry will appear here as visitors search for assets.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(trendingSearches?.queries || []).map((term, index) => (
                    <div
                      key={term.query || index}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center text-xs font-bold text-on-surface-variant/60 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">
                            &ldquo;{term.query}&rdquo;
                          </p>
                          <span className="text-xs text-on-surface-variant">
                            Avg. {term.avgResults} results found
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Volume
                          </span>
                          <span className="text-sm font-bold text-on-surface">
                            {term.searchCount} searches
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            CTR
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            {term.ctr.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Purchases
                          </span>
                          <span className="text-sm font-semibold text-success">
                            {term.conversionsCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW: USER ENGAGEMENT, DWELL & BEHAVIOR INTELLIGENCE                 */}
      {/* ==================================================================== */}
      {activeTab === "behavior" && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Avg Active Dwell
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Clock size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !dwellTimes ? (
                    <span className="inline-block h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (() => {
                      const avgSec =
                        dwellTimes && dwellTimes.length > 0
                          ? Math.round(
                              dwellTimes.reduce(
                                (acc, curr) => acc + Number(curr.avg_dwell_seconds ?? curr.avgDwellSeconds ?? 0),
                                0,
                              ) / dwellTimes.length,
                            )
                          : 0;
                      const m = Math.floor(avgSec / 60);
                      const s = avgSec % 60;
                      return m > 0 ? `${m}m ${s}s` : `${s}s`;
                    })()
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Active focus time per session
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Repeat Visitor Ratio
                  </span>
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                    <Icons.RefreshCw size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !retentionStats ? (
                    <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (() => {
                      const s = retentionStats?.summary || retentionStats?.metrics;
                      const repeat = Number(s?.repeat_visitors_count ?? s?.repeatVisitorsCount ?? 0);
                      const newV = Number(s?.new_visitors_count ?? s?.newVisitorsCount ?? 0);
                      const total = newV + repeat;
                      return total > 0
                        ? `${((repeat / total) * 100).toFixed(1)}%`
                        : "0.0%";
                    })()
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {(retentionStats?.summary?.repeat_visitors_count ?? retentionStats?.metrics?.repeatVisitorsCount ?? 0)} returning audience members
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    New Visitors
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.Users size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !retentionStats ? (
                    <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (retentionStats?.summary?.new_visitors_count ?? retentionStats?.metrics?.newVisitorsCount ?? 0)
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  DAU: {(retentionStats?.summary?.dau ?? retentionStats?.metrics?.dau ?? 0)} &bull; MAU: {(retentionStats?.summary?.mau ?? retentionStats?.metrics?.mau ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Creator Touchpoints
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.Store size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !buyerSellerInteractions ? (
                    <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (buyerSellerInteractions || []).reduce(
                      (acc, c) => acc + Number(c.profile_views ?? c.profileViews ?? 0) + Number(c.asset_clicks ?? c.assetClicks ?? 0),
                      0,
                    )
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Storefront visits &amp; asset inspects
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dwell Time & Attention Leaderboard */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Page Dwell &amp; Attention Leaderboard
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Accurate active focus time (excluding background tabs), scroll depths, and bounce rates
                  </CardDescription>
                </div>
                <Badge variant="primary" size="sm">
                  Live Telemetry
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && !dwellTimes ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : !dwellTimes || dwellTimes.length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Eye size={32} className="mx-auto text-on-surface-variant/50 mb-2" />
                  <p className="text-sm font-bold text-on-surface">No Dwell Logs Recorded</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    Page visibility and focus telemetry events will populate here as visitors browse catalog pages.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full overscroll-x-contain">
                  <table className="w-full text-left text-sm border-collapse min-w-160">
                    <thead>
                      <tr className="border-b border-outline-variant/20 bg-surface-container-lowest/50 text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                        <th className="py-3 px-4 sm:px-6">Route Path / Target</th>
                        <th className="py-3 px-4">Entity Type</th>
                        <th className="py-3 px-4 text-right">Views</th>
                        <th className="py-3 px-4 text-right">Avg Dwell</th>
                        <th className="py-3 px-4 text-right">Scroll Depth</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Bounce Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-xs">
                      {dwellTimes.map((row, idx) => {
                        const avgSec = Number(row.avg_dwell_seconds ?? row.avgDwellSeconds ?? 0);
                        const m = Math.floor(avgSec / 60);
                        const s = Math.round(avgSec % 60);
                        const dwellFormatted = m > 0 ? `${m}m ${s}s` : `${s}s`;
                        const route = row.route_path || row.routePath || row.title || "/";
                        const entity = row.entity_type || row.entityType || "general";
                        const views = Number(row.total_views ?? row.totalViews ?? 0);
                        const scroll = Number(row.avg_scroll_depth_percent ?? row.avgScrollDepthPercent ?? 0);
                        const bounce = Number(row.bounce_rate_percent ?? row.bounceRatePercent ?? 0);
                        return (
                          <tr key={route + idx} className="hover:bg-surface-container/30 transition-colors">
                            <td className="py-3 px-4 sm:px-6 font-mono text-[11px] text-on-surface font-medium truncate max-w-64" title={route}>
                              {route}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" size="sm" className="capitalize text-[10px]">
                                {entity}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-on-surface">
                              {views.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-primary">
                              {dwellFormatted}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-primary h-1.5 rounded-full"
                                    style={{ width: `${Math.min(scroll, 100)}%` }}
                                  />
                                </div>
                                <span className="font-medium text-on-surface w-8 text-right">
                                  {scroll}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 sm:px-6 text-right font-medium text-on-surface-variant">
                              {bounce}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grid: Category Demand Matrix & Buyer-Seller Touchpoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Demand vs Supply */}
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Category Demand vs. Supply</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Visitor affinity scores vs. published inventory to spot unmet buyer demand
                    </CardDescription>
                  </div>
                  <Badge variant="default" size="sm">Affinity</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading && !interestMatrix ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !interestMatrix || interestMatrix.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant text-xs">
                    No category affinity recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full overscroll-x-contain">
                    <table className="w-full text-left text-sm border-collapse min-w-100">
                      <thead>
                        <tr className="border-b border-outline-variant/20 bg-surface-container-lowest/50 text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-3 text-right">Affinity</th>
                          <th className="py-2.5 px-3 text-right">Assets</th>
                          <th className="py-2.5 px-4 text-right">Demand / Supply</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15 text-xs">
                        {interestMatrix.map((item) => {
                          const ratio = Number(item.demand_supply_ratio ?? item.demandSupplyRatio ?? 0);
                          const name = item.category_name || item.categoryName || "Category";
                          const affinity = Number(item.affinity_score_total ?? item.affinityScoreTotal ?? 0);
                          const assets = Number(item.available_assets_count ?? item.availableAssetsCount ?? 0);
                          const catId = item.category_id ?? item.categoryId;
                          return (
                            <tr key={catId} className="hover:bg-surface-container/30 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-on-surface">
                                {name}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-primary">
                                {affinity.toFixed(1)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-on-surface">
                                {assets}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                {ratio >= 2.0 ? (
                                  <Badge variant="error" size="sm">
                                    High Deficit ({ratio}x)
                                  </Badge>
                                ) : ratio >= 1.0 ? (
                                  <Badge variant="warning" size="sm">
                                    Balanced ({ratio}x)
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" size="sm">
                                    Surplus ({ratio}x)
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Buyer-to-Seller Touchpoints */}
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Buyer-to-Seller Touchpoints</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Creator storefront visits, asset clicks, and purchase conversion
                    </CardDescription>
                  </div>
                  <Badge variant="primary" size="sm">Creators</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading && !buyerSellerInteractions ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : !buyerSellerInteractions || buyerSellerInteractions.length === 0 ? (
                  <div className="p-8 text-center text-on-surface-variant text-xs">
                    No creator touchpoints logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full overscroll-x-contain">
                    <table className="w-full text-left text-sm border-collapse min-w-100">
                      <thead>
                        <tr className="border-b border-outline-variant/20 bg-surface-container-lowest/50 text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                          <th className="py-2.5 px-4">Creator</th>
                          <th className="py-2.5 px-3 text-right">Visits</th>
                          <th className="py-2.5 px-3 text-right">Clicks</th>
                          <th className="py-2.5 px-3 text-right">Orders</th>
                          <th className="py-2.5 px-4 text-right">Conversion</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/15 text-xs">
                        {buyerSellerInteractions.map((row) => {
                          const name = row.seller_name || row.sellerName || "Creator";
                          const email = row.seller_email || row.sellerEmail || "—";
                          const visits = Number(row.profile_views ?? row.profileViews ?? 0);
                          const clicks = Number(row.asset_clicks ?? row.assetClicks ?? 0);
                          const orders = Number(row.orders_attributed ?? row.ordersAttributed ?? 0);
                          const conv = Number(row.conversion_rate ?? row.conversionRate ?? 0);
                          const sellerId = row.seller_id || row.sellerId || name;
                          return (
                            <tr key={sellerId} className="hover:bg-surface-container/30 transition-colors">
                              <td className="py-2.5 px-4">
                                <p className="font-semibold text-on-surface truncate max-w-36">{name}</p>
                                <p className="text-[10px] text-on-surface-variant truncate max-w-36">{email}</p>
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-on-surface">
                                {visits}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium text-on-surface">
                                {clicks}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-success">
                                {orders}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-primary">
                                {conv}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 4-Week Cohort Retention Matrix */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Weekly Visitor Cohort Retention</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Percentage of unique visitors returning to the marketplace in consecutive weeks
                  </CardDescription>
                </div>
                <Badge variant="outline" size="sm">Retention Matrix</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && !retentionStats ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : !retentionStats?.cohorts || retentionStats.cohorts.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant text-xs">
                  Cohort data will appear once sessions span consecutive weeks.
                </div>
              ) : (
                <div className="overflow-x-auto w-full overscroll-x-contain">
                  <table className="w-full text-left text-sm border-collapse min-w-100">
                    <thead>
                      <tr className="border-b border-outline-variant/20 bg-surface-container-lowest/50 text-[11px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">
                        <th className="py-2.5 px-4 sm:px-6">Cohort Week</th>
                        <th className="py-2.5 px-4 text-right">Cohort Size</th>
                        <th className="py-2.5 px-4 text-center">Week 1</th>
                        <th className="py-2.5 px-4 text-center">Week 2</th>
                        <th className="py-2.5 px-4 sm:px-6 text-center">Week 3</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15 text-xs">
                      {retentionStats.cohorts.map((cohort) => {
                        const size = cohort.cohort_size ?? cohort.cohortSize ?? 0;
                        const w1 = Number(cohort.w1_percent ?? cohort.w1Percent ?? 0);
                        const w2 = Number(cohort.w2_percent ?? cohort.w2Percent ?? 0);
                        const w3 = Number(cohort.w3_percent ?? cohort.w3Percent ?? 0);
                        return (
                          <tr key={cohort.week} className="hover:bg-surface-container/30 transition-colors">
                            <td className="py-2.5 px-4 sm:px-6 font-mono font-medium text-on-surface">
                              {cohort.week}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-on-surface">
                              {size} visitors
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded font-semibold text-primary bg-primary/10">
                                {w1}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded font-semibold text-primary bg-primary/10">
                                {w2}%
                              </span>
                            </td>
                            <td className="py-2.5 px-4 sm:px-6 text-center">
                              <span className="inline-block px-2 py-0.5 rounded font-semibold text-primary bg-primary/10">
                                {w3}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 4: BUYER BEHAVIOR & CONSUMPTION (Retention & Funnel)            */}
      {/* ==================================================================== */}
      {activeTab === "retention" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Total Deliveries
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.FileArchive size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !downloads ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (downloads?.totalDownloads || 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {downloads?.uniqueDownloaders || 0} unique recipients
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Bandwidth Delivered
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.Performance size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !downloads ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${downloads?.totalGigabytesTransferred || 0} GB`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Total storage egress volume
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Fulfillment Rate
                  </span>
                  <div className="p-2 rounded-lg bg-info/10 text-info border border-info/20">
                    <Icons.FileCheck size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !downloads ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${downloads?.fulfillmentRate || 0}%`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {downloads?.downloadedLicensedItems || 0} of {downloads?.totalLicensedItems || 0} purchased items downloaded
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    License Activations
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.Key size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !downloads ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (downloads?.totalActivationsCount || 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Across {downloads?.activeLicensesCount || 0} issued licenses
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Storefront Conversion Funnel Progress Bar */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Storefront Conversion Funnel</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Full-funnel visitor progression: Storefront Visitors &rarr; Asset Views &rarr; Cart Additions &rarr; Checkout &rarr; Completed Purchases
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {isLoading && !buyerFunnel ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (buyerFunnel?.stages || []).length === 0 || buyerFunnel?.totalVisitors === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Users size={32} className="mx-auto text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Storefront Telemetry Events</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    Live visitor traffic, catalog detail views, and checkout events will populate this multi-stage conversion funnel automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(buyerFunnel?.stages || []).map((stage, idx) => (
                    <div key={stage.stage} className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm gap-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-on-surface">{stage.stage}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-on-surface">
                            {stage.count.toLocaleString()} visitors
                          </span>
                          {idx > 0 && (
                            <span className="text-on-surface-variant/80">
                              (-{stage.dropOffRate}% drop)
                            </span>
                          )}
                          <Badge variant={idx === 4 ? "success" : "default"} size="sm">
                            {stage.conversionRate}% overall
                          </Badge>
                        </div>
                      </div>

                      <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(stage.conversionRate, 1)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Buyer Cohort Retention Heatmap */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Monthly Buyer Cohort Retention</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Repeat purchase velocity tracking: % of buyers who return to purchase in subsequent calendar months
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !cohorts ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (cohorts?.cohorts || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.TrendingUp size={32} className="mx-auto text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Cohort Purchase History</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    As buyers complete purchases across consecutive months, cohort retention percentages will be calculated automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden w-full">
                  <div className="divide-y divide-outline-variant/20">
                    <div className="grid grid-cols-6 p-3 sm:px-6 bg-surface-container/60 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 text-center">
                      <span className="text-left">Cohort</span>
                      <span>Total Buyers</span>
                      <span>Month 0</span>
                      <span>Month +1</span>
                      <span>Month +2</span>
                      <span>Month +3</span>
                    </div>

                    {(cohorts?.cohorts || []).map((c) => (
                      <div
                        key={c.cohort}
                        className="grid grid-cols-6 p-3 sm:px-6 items-center text-center text-xs sm:text-sm hover:bg-surface-container/40 transition-colors"
                      >
                        <span className="text-left font-bold text-on-surface truncate">
                          {c.cohort}
                        </span>
                        <span className="font-semibold text-on-surface">
                          {c.totalBuyers}
                        </span>

                        <div className="p-1 rounded bg-surface-container-high text-on-surface font-semibold">
                          100%
                        </div>

                        <div
                          className={`p-1 rounded font-semibold ${
                            c.month1.retentionPct >= 20
                              ? "bg-emerald-500/15 text-emerald-500 font-bold"
                              : c.month1.retentionPct > 0
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant/40"
                          }`}
                        >
                          {c.month1.retentionPct > 0 ? `${c.month1.retentionPct}%` : "—"}
                        </div>

                        <div
                          className={`p-1 rounded font-semibold ${
                            c.month2.retentionPct >= 20
                              ? "bg-emerald-500/15 text-emerald-500 font-bold"
                              : c.month2.retentionPct > 0
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant/40"
                          }`}
                        >
                          {c.month2.retentionPct > 0 ? `${c.month2.retentionPct}%` : "—"}
                        </div>

                        <div
                          className={`p-1 rounded font-semibold ${
                            c.month3.retentionPct >= 20
                              ? "bg-emerald-500/15 text-emerald-500 font-bold"
                              : c.month3.retentionPct > 0
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant/40"
                          }`}
                        >
                          {c.month3.retentionPct > 0 ? `${c.month3.retentionPct}%` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anti-Piracy & Scraping Anomaly Monitor */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Anti-Piracy &amp; Scraping Anomaly Feed</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Live security telemetry flagging rapid automated bursts and multi-IP credential sharing
                  </CardDescription>
                </div>
                <Badge variant="default" size="sm">
                  Active Monitoring
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !anomalies ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (anomalies?.anomalies || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.ShieldCheck size={32} className="mx-auto text-success/80 mb-2" />
                  <p className="text-sm font-bold text-on-surface">Zero Anomalies Detected</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    All recent asset downloads conform to authorized single-user patterns. No rapid scraping bursts or multi-IP credential sharing detected.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(anomalies?.anomalies || []).map((anomaly, idx) => (
                    <div
                      key={anomaly.lastDownloadAt + idx}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          {anomaly.anomalyType === "high_frequency_downloads" ? (
                            <Badge variant="warning" size="sm">
                              Burst Velocity
                            </Badge>
                          ) : (
                            <Badge variant="error" size="sm">
                              Multi-IP Sharing
                            </Badge>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">
                            {anomaly.userName} {anomaly.userEmail && <span className="text-xs font-normal text-on-surface-variant">({anomaly.userEmail})</span>}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {anomaly.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-on-surface-variant/80">
                            <span>IP: <code className="bg-surface-container px-1 py-0.5 rounded text-[10px]">{anomaly.ipAddress}</code></span>
                            {anomaly.licenseKey && (
                              <span>&bull; License: <code className="bg-surface-container px-1 py-0.5 rounded text-[10px]">{anomaly.licenseKey}</code></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-xs font-bold text-warning block">
                          {anomaly.downloadCount} files triggered
                        </span>
                        <span className="text-[11px] text-on-surface-variant/70">
                          {new Date(anomaly.lastDownloadAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 5: MARKETING & PROMOTION PERFORMANCE                            */}
      {/* ==================================================================== */}
      {activeTab === "marketing" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Promo Gross GMV
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Coins size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !couponsSummary ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(couponsSummary?.metrics.promoGmv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {couponsSummary?.metrics.totalRedemptions || 0} orders with coupon applied
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Discount Burned
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.Percent size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !couponsSummary ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${currencySymbol}${(couponsSummary?.metrics.totalDiscountBurned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Avg. {couponsSummary?.metrics.avgDiscountPercent || 0}% discount depth
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Net Promo ROI
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.TrendingUp size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !couponsSummary ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${couponsSummary?.metrics.roiMultiple || 0}x Multiple`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {currencySymbol}${(couponsSummary?.metrics.promoNetRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} net revenue retained
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Staff Picks Lift
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Sparkles size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !curationImpact ? (
                    <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    `${curationImpact?.curatedConversionMultiplier || 1}x Velocity`
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  {curationImpact?.curatedGmvSharePct || 0}% of marketplace gross volume
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Coupons Table */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Top Performing Coupon Codes</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Ranking promotional promo codes by redemptions, discount dollars burned, and gross sales generated
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !couponsSummary ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (couponsSummary?.topCoupons || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Ticket size={32} className="mx-auto text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Coupon Redemptions Recorded</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    When buyers apply promotional coupon codes during checkout, redemption volume and ROI metrics will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(couponsSummary?.topCoupons || []).map((cpn, index) => (
                    <div
                      key={cpn.couponId || index}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center text-xs font-bold text-on-surface-variant/60 shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs sm:text-sm font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded">
                              {cpn.code}
                            </code>
                            <Badge variant="warning" size="sm">
                              {cpn.discountPercent}% OFF
                            </Badge>
                          </div>
                          <span className="text-xs text-on-surface-variant mt-0.5 block truncate">
                            Creator: {cpn.sellerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Redemptions
                          </span>
                          <span className="text-sm font-bold text-on-surface">
                            {cpn.redemptionsCount} orders
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Discount Given
                          </span>
                          <span className="text-sm font-semibold text-warning">
                            {currencySymbol}{cpn.discountBurned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Gross Sales
                          </span>
                          <span className="text-sm font-bold text-success">
                            {currencySymbol}{cpn.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero Carousel & Banners Merchandising Performance */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <CardTitle className="text-lg font-bold">Hero Showcase &amp; Banner Performance</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Merchandising telemetry: Impressions, clicks, click-through rates (CTR), and direct attributed revenue
              </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
              {isLoading && !marketingBanners ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-surface-container-high animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (marketingBanners?.campaigns || []).length === 0 ? (
                <div className="p-8 text-center">
                  <Icons.Megaphone size={32} className="mx-auto text-on-surface-variant/40 mb-2" />
                  <p className="text-sm font-semibold text-on-surface">No Campaign Telemetry Recorded</p>
                  <p className="text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
                    Active hero showcase slides and announcement banners will record impressions, clicks, and attributed conversions automatically.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-hidden divide-y divide-outline-variant/20">
                  {(marketingBanners?.campaigns || []).map((camp, idx) => (
                    <div
                      key={camp.campaignId + idx}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {camp.imageUrl ? (
                          <img
                            src={camp.imageUrl}
                            alt={camp.title}
                            className="w-12 h-12 rounded-lg object-cover border border-outline-variant/30 shrink-0 bg-surface-container"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 border border-outline-variant/30 text-on-surface-variant">
                            <Icons.Megaphone size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-on-surface truncate">
                              {camp.title}
                            </p>
                            <Badge variant={camp.campaignType === "hero" ? "primary" : "secondary"} size="sm">
                              {camp.campaignType === "hero" ? "Hero Slide" : "Header Banner"}
                            </Badge>
                          </div>
                          <span className="text-xs text-on-surface-variant mt-0.5 block">
                            {camp.badgeType ? `Badge: ${camp.badgeType}` : "Standard Merchandising"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Impressions
                          </span>
                          <span className="text-sm font-bold text-on-surface">
                            {camp.impressionsCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Clicks
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {camp.clicksCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            CTR
                          </span>
                          <span className="text-sm font-semibold text-success">
                            {camp.ctr.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-semibold text-on-surface-variant/70 block">
                            Attributed GMV
                          </span>
                          <span className="text-sm font-bold text-on-surface">
                            {currencySymbol}{camp.attributedGmv.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Editorial Curation & Staff Picks Benchmark */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Editorial Curation &amp; &ldquo;Staff Picks&rdquo; Impact</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Comparative sales velocity benchmark between editorially curated / featured assets and standard inventory
                  </CardDescription>
                </div>
                <Badge variant="primary" size="sm">
                  {curationImpact?.curatedConversionMultiplier || 1}x Multiplier
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Curated &amp; Featured Inventory
                    </span>
                    <Icons.Sparkles size={16} className="text-primary" />
                  </div>
                  <div className="text-2xl font-extrabold text-on-surface">
                    {currencySymbol}{(curationImpact?.curatedGmv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {curationImpact?.curatedUnitsSold || 0} units sold across {curationImpact?.curatedAssetCount || 0} curated assets
                  </p>
                  <div className="pt-2 text-xs font-semibold text-primary">
                    Avg. {curationImpact?.curatedAvgSalesPerAsset || 0} sales per asset
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Standard Organic Inventory
                    </span>
                    <Icons.Box size={16} className="text-on-surface-variant" />
                  </div>
                  <div className="text-2xl font-extrabold text-on-surface">
                    {currencySymbol}{(curationImpact?.standardGmv || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-on-surface-variant">
                    {curationImpact?.standardUnitsSold || 0} units sold across {curationImpact?.standardAssetCount || 0} standard assets
                  </p>
                  <div className="pt-2 text-xs font-semibold text-on-surface-variant">
                    Avg. {curationImpact?.standardAvgSalesPerAsset || 0} sales per asset
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW 6: ACTIONABLE GROWTH LEVERS & AUTOMATED INTELLIGENCE           */}
      {/* ==================================================================== */}
      {activeTab === "growth" && (
        <div className="space-y-6">
          {/* Top Telemetry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Active Growth Triggers
                  </span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                    <Icons.Magic size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !growthTriggers ? (
                    <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    growthTriggers?.triggers.length || 0
                  )}
                </div>
                <div className="text-xs text-on-surface-variant mt-1">
                  {isLoading && !growthTriggers ? (
                    <div className="h-4 w-32 bg-surface-container-high animate-pulse rounded mt-1" />
                  ) : (
                    `${(growthTriggers?.triggers || []).filter((t) => t.severity === "critical").length} critical · ${(growthTriggers?.triggers || []).filter((t) => t.severity === "high").length} high priority`
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Supply Deficit Alerts
                  </span>
                  <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                    <Icons.Store size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !growthTriggers ? (
                    <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (growthTriggers?.triggers || []).filter(
                      (t) => t.triggerType === "CATEGORY_SUPPLY_DEFICIT",
                    ).length
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  Unfulfilled buyer search demand categories
                </p>
              </CardContent>
            </Card>

            <Card className="hover:border-primary/40 transition-colors">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                    Pricing Optimization
                  </span>
                  <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                    <Icons.TrendingUp size={18} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
                  {isLoading && !growthTriggers ? (
                    <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                  ) : (
                    (growthTriggers?.triggers || []).filter(
                      (t) => t.triggerType === "UNDERPRICED_ASSET",
                    ).length
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1">
                  High-velocity assets qualifying for tier upgrades
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Automated Intelligence Feed */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Automated Growth Triggers &amp; Anomaly Feed
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Algorithmic insights flagging commercial bottlenecks, pricing opportunities, and catalog deficits
                  </CardDescription>
                </div>
                <Badge variant="primary" size="sm">
                  Deterministic Rule Engine
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {isLoading && !growthTriggers ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container animate-pulse space-y-3"
                    >
                      <div className="h-4 w-48 bg-surface-container-high rounded" />
                      <div className="h-3 w-full bg-surface-container-high rounded" />
                      <div className="h-10 w-full bg-surface-container-high rounded" />
                    </div>
                  ))}
                </div>
              ) : !growthTriggers || growthTriggers.triggers.length === 0 ? (
                <EmptyState
                  icon={<Icons.Sparkles size={24} />}
                  title="All Marketplace Systems Optimal"
                  description="No active supply deficits, pricing anomalies, or creator concentration bottlenecks detected."
                />
              ) : (
                <div className="space-y-4">
                  {growthTriggers.triggers.map((trigger: GrowthTriggerItem) => {
                    const severityVariant =
                      trigger.severity === "critical"
                        ? "error"
                        : trigger.severity === "high"
                        ? "warning"
                        : trigger.severity === "medium"
                        ? "primary"
                        : "default";

                    return (
                      <div
                        key={trigger.id}
                        className="p-4 sm:p-5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60 transition-colors space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={severityVariant} size="sm">
                              {trigger.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" size="sm">
                              {trigger.triggerType.replace(/_/g, " ")}
                            </Badge>
                            {trigger.targetEntityType && trigger.targetEntityId && (
                              <span className="text-xs text-on-surface-variant font-mono">
                                {trigger.targetEntityType}: {trigger.targetEntityId.slice(0, 8)}...
                              </span>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDismissTrigger(trigger.id)}
                            leftIcon={<Icons.Check size={13} />}
                            className="cursor-pointer shrink-0 self-start sm:self-auto text-xs"
                          >
                            Dismiss
                          </Button>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-on-surface">
                            {trigger.title}
                          </h4>
                          <p className="text-sm text-on-surface-variant leading-relaxed mt-1">
                            {trigger.description}
                          </p>
                        </div>

                        {/* Recommended Action Callout */}
                        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-start gap-2.5">
                          <Icons.Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold uppercase tracking-wider text-primary">
                              Recommended Growth Action
                            </div>
                            <div className="text-xs sm:text-sm text-on-surface font-medium leading-relaxed">
                              {trigger.recommendedAction}
                            </div>
                          </div>
                        </div>

                        {/* Metadata summary chips if present */}
                        {trigger.metadata && Object.keys(trigger.metadata).length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-outline-variant/20">
                            {Object.entries(trigger.metadata).map(([key, val]) => (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-surface-container font-mono text-on-surface-variant"
                              >
                                <span className="font-semibold text-on-surface">{key}:</span>
                                <span>{String(val)}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-[11px] text-on-surface-variant/70">
                          Detected {new Date(trigger.createdAt).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reporting & Data Export Section */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">
                    Platform Data &amp; Accounting Exports
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Generate standardized CSV datasets for financial reconciliation, inventory audits, and marketing review
                  </CardDescription>
                </div>
                <Badge variant="outline" size="sm">
                  CSV Export
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 sm:p-5 rounded-xl border border-outline-variant/30 bg-surface-container flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Icons.Coins size={16} />
                      <span>Financial Orders Ledger</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Detailed order transactions with GMV, creator earnings, platform fees, taxes, refunds, and coupons.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full cursor-pointer"
                    disabled={isExportingCsv}
                    onClick={() => handleExportCsv("financial")}
                    leftIcon={
                      isExportingCsv ? (
                        <Spinner size="sm" color="primary" />
                      ) : (
                        <Icons.FileText size={14} />
                      )
                    }
                  >
                    Download Orders CSV
                  </Button>
                </div>

                <div className="p-4 sm:p-5 rounded-xl border border-outline-variant/30 bg-surface-container flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Icons.Box size={16} />
                      <span>Catalog Performance Audit</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      All published assets ranked with units sold, gross sales, views, downloads, and liquidity status.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full cursor-pointer"
                    disabled={isExportingCsv}
                    onClick={() => handleExportCsv("catalog")}
                    leftIcon={
                      isExportingCsv ? (
                        <Spinner size="sm" color="primary" />
                      ) : (
                        <Icons.Box size={14} />
                      )
                    }
                  >
                    Download Catalog CSV
                  </Button>
                </div>

                <div className="p-4 sm:p-5 rounded-xl border border-outline-variant/30 bg-surface-container flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Icons.Ticket size={16} />
                      <span>Marketing &amp; Redemptions</span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Coupon redemptions log, total discount burned, attributed gross revenue, and campaign identifiers.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full cursor-pointer"
                    disabled={isExportingCsv}
                    onClick={() => handleExportCsv("coupons")}
                    leftIcon={
                      isExportingCsv ? (
                        <Spinner size="sm" color="primary" />
                      ) : (
                        <Icons.Ticket size={14} />
                      )
                    }
                  >
                    Download Coupons CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;
