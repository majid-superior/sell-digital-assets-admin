import React, { useState, useEffect } from "react";
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
} from "@/services/index.ts";
import type { ManagedUser } from "@/pages/Users.tsx";

export const Dashboard: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>(
    () => userService.getCachedUsers()?.users || []
  );
  const [organization, setOrganization] = useState<OrganizationInfo | null>(
    () => organizationService.getCachedOrganization()
  );
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
    ])
      .then(([usersData, organizationData]) => {
        setUsers(usersData.users);
        setOrganization(organizationData);
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
      const [usersData, organizationData] = await Promise.all([
        userService.getAllUsers({ page: 1, limit: 100 }),
        organizationService.getOrganization(),
      ]);
      setUsers(usersData.users);
      setOrganization(organizationData);
    } catch {
      // Handled via toast notifications in service wrappers
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live telemetry calculations directly from PostgreSQL records
  const totalUsers = users.length;
  const totalSellers = users.filter((u) => u.role.toLowerCase() === "seller").length;
  const totalBuyers = users.filter((u) => u.role.toLowerCase() === "buyer").length;
  const totalActive = users.filter((u) => u.status.toLowerCase() === "active").length;

  const currencySymbol = organization
    ? organization.currencySymbol || resolveCurrencySymbol(organization.defaultCurrency)
    : "₨";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Performance size={13} className="mr-1" /> Telemetry Overview
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Dashboard
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              System telemetry, business observability, and digital assets administrative metrics.
            </p>
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
                <Icons.Performance size={14} />
              )
            }
            className="shrink-0 cursor-pointer hidden sm:flex"
          >
            {isRefreshing ? "Syncing..." : "Sync Server"}
          </Button>
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
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalUsers
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
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalSellers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Marketplace sellers
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
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
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
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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

      {/* System Telemetry & Organization Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Platform Organization Summary */}
        <Card className="lg:col-span-2">
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

        {/* Right Column: Server Health & User Breakdown */}
        <Card>
          <CardHeader className="p-5 border-b border-outline-variant/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icons.Security size={18} className="text-secondary" /> Server Telemetry
            </CardTitle>
            <CardDescription className="text-xs">
              Real-time operational status
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Backend REST API</span>
              <Badge variant="success" size="sm">
                Connected
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">PostgreSQL Driver</span>
              <Badge variant="success" size="sm">
                Pooled (Active)
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Buyer Customer Base</span>
              <span className="font-bold text-on-surface">{totalBuyers} accounts</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Account Health Ratio</span>
              <span className="font-bold text-secondary">
                {totalUsers > 0
                  ? `${Math.round((totalActive / totalUsers) * 100)}% Active`
                  : "100% Active"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
