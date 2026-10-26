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
} from "@/components/ui/index.ts";
import {
  userService,
  organizationService,
  formatCurrencyAmount,
  resolveCurrencySymbol,
  type OrganizationInfo,
  type ManagedUser,
  type UserCounts,
  type SystemHealthData,
} from "@/services/index.ts";

export const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>(
    () => userService.getCachedUsers()?.users || []
  );
  const [userCounts, setUserCounts] = useState<UserCounts | null>(() => {
    return userService.getCachedUsers()?.counts || null;
  });
  const [totalUsersCount, setTotalUsersCount] = useState<number>(() => {
    return userService.getCachedUsers()?.total || 0;
  });
  const [organization, setOrganization] = useState<OrganizationInfo | null>(
    () => organizationService.getCachedOrganization()
  );
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(() => {
    return organizationService.getCachedHealth();
  });
  const [isLoading, setIsLoading] = useState(
    () => !userService.getCachedUsers() || !organizationService.getCachedOrganization()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedUsers = !!userService.getCachedUsers();
    const hasCachedOrganization = !!organizationService.getCachedOrganization();

    Promise.all([
      userService.getAllUsers(
        { page: 1, limit: 100 },
        { silent: hasCachedUsers, signal: controller.signal }
      ),
      organizationService.getOrganization({
        silent: hasCachedOrganization,
        signal: controller.signal,
      }),
      organizationService.getSystemHealth({
        silent: !!organizationService.getCachedHealth(),
        signal: controller.signal,
      }),
    ])
      .then(([usersData, organizationData, healthData]) => {
        setUsers(usersData.users);
        setTotalUsersCount(usersData.total);
        setUserCounts(usersData.counts);
        setOrganization(organizationData);
        setSystemHealth(healthData);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      const [usersResult, orgResult, healthData] = await Promise.allSettled([
        userService.getAllUsers({ page: 1, limit: 100 }),
        organizationService.getOrganization(),
        organizationService.getSystemHealth({ silent: false }),
      ]);

      if (usersResult.status === "fulfilled") {
        setUsers(usersResult.value.users);
        setTotalUsersCount(usersResult.value.total);
        setUserCounts(usersResult.value.counts);
      }
      if (orgResult.status === "fulfilled") {
        setOrganization(orgResult.value);
      }
      if (healthData.status === "fulfilled") {
        const health = healthData.value;
        setSystemHealth(health);
        if (health.backendWorking && health.s3Working) {
          toast.success("System is Healthy", {
            description: "Backend server and S3 asset storage are online and synchronized.",
          });
        } else {
          toast.error(health.statusMessage, {
            description: !health.backendWorking && !health.s3Working
              ? "Both Backend API server and S3 asset server are unreachable."
              : !health.backendWorking
              ? "Backend API or PostgreSQL database is not responding."
              : "S3 asset storage server is not responding.",
          });
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live telemetry calculations directly from PostgreSQL records
  const displayTotalUsers = totalUsersCount > 0 ? totalUsersCount : users.length;
  const sampleUsersCount = users.length;
  const totalSellers = userCounts?.sellers ?? users.filter((u) => u.role.toLowerCase() === "seller").length;

  const currencySymbol = organization
    ? organization.currencySymbol || resolveCurrencySymbol(organization.defaultCurrency)
    : "₨";

  const isHealthy = Boolean(systemHealth?.backendWorking && systemHealth?.s3Working);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Performance size={13} className="mr-1" /> Telemetry Overview
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              System telemetry, business observability, and digital assets administrative metrics.
            </p>
          </div>

          {/* Single System Health Notification Badge + Sync Server Button */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!systemHealth ? (
              <Badge variant="outline" size="md" className="py-1.5 px-3 gap-2">
                <Spinner size="sm" color="primary" />
                <span>Checking System...</span>
              </Badge>
            ) : isHealthy ? (
              <Badge variant="success" size="md" className="py-1.5 px-3 gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>System is Healthy</span>
              </Badge>
            ) : (
              <Badge variant="error" size="md" className="py-1.5 px-3 gap-2 shadow-xs">
                <Icons.AlertCircle size={14} className="shrink-0" />
                <span>{systemHealth.statusMessage}</span>
              </Badge>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isLoading || isRefreshing}
              leftIcon={
                isRefreshing ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.Performance size={14} />
                )
              }
              className="shrink-0 cursor-pointer"
            >
              {isRefreshing ? "Syncing..." : "Sync Server"}
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Primary KPI Telemetry Cards - Zero Layout Shift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Registered Accounts */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Registered Users
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Users size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && displayTotalUsers === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                displayTotalUsers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Database user accounts
            </p>
          </CardContent>
        </Card>

        {/* 2. Registered Creators & Merchants */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Active Creators
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Store size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && sampleUsersCount === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : displayTotalUsers > sampleUsersCount && sampleUsersCount > 0 ? (
                `${totalSellers}+`
              ) : (
                totalSellers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {displayTotalUsers > sampleUsersCount
                ? `Marketplace sellers (${sampleUsersCount} sampled)`
                : "Marketplace sellers"}
            </p>
          </CardContent>
        </Card>

        {/* 3. Platform Fee Rate */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Platform Fee Rate
              </span>
              <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/20">
                <Icons.Percent size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && !organization ? (
                <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
              ) : (
                `${organization?.feePercentage ?? 5.0}%`
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Transaction commission
            </p>
          </CardContent>
        </Card>

        {/* 4. Min Payout Settlement */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Min Payout
              </span>
              <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                <Icons.Wallet size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-on-surface tracking-tight truncate">
              {isLoading && !organization ? (
                <span className="inline-block h-8 w-28 bg-surface-container-high animate-pulse rounded" />
              ) : (
                formatCurrencyAmount(organization?.minPayout ?? 50, currencySymbol)
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Settlement threshold ({organization?.defaultCurrency ?? "PKR"})
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Platform Organization Summary */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                <Icons.Brand size={20} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">
                  {organization?.title || "AssetDrop Platform"}
                </CardTitle>
                <CardDescription className="text-xs text-primary font-medium">
                  {organization?.tagline || "Enterprise Digital Assets Marketplace"}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              Singleton Config
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {organization?.description ||
              "Unified administrative console for digital asset creators, transactions, and global platform observability."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="font-semibold text-on-surface-variant/70 uppercase text-[10px]">
                Registered Location
              </span>
              <p className="font-medium text-on-surface truncate">
                {organization?.address || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="font-semibold text-on-surface-variant/70 uppercase text-[10px]">
                Support Channel
              </span>
              <p className="font-medium text-primary truncate">
                {organization?.supportEmail || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
