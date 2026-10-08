import React, { useState, useEffect } from "react";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Spinner,
} from "@/components/ui/index.ts";
import {
  userService,
  organizationService,
  categoryService,
  formatCurrencyAmount,
  resolveCurrencySymbol,
  type OrganizationInfo,
} from "@/services/index.ts";
import type { ManagedUser } from "@/pages/Users.tsx";
import type { ManagedCategory } from "@/services/categoryService.ts";

export const Analytics: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>(
    () => userService.getCachedUsers()?.users || []
  );
  const [organization, setOrganization] = useState<OrganizationInfo | null>(
    () => organizationService.getCachedOrganization()
  );
  const [categories, setCategories] = useState<ManagedCategory[]>(
    () => categoryService.getCachedCategories()?.categories || []
  );
  const [isLoading, setIsLoading] = useState(
    () =>
      !userService.getCachedUsers() ||
      !organizationService.getCachedOrganization() ||
      !categoryService.getCachedCategories()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const hasUsers = !!userService.getCachedUsers();
    const hasOrg = !!organizationService.getCachedOrganization();
    const hasCats = !!categoryService.getCachedCategories();

    Promise.all([
      userService.getAllUsers(
        { page: 1, limit: 100 },
        { silent: hasUsers, signal: controller.signal }
      ),
      organizationService.getOrganization({
        silent: hasOrg,
        signal: controller.signal,
      }),
      categoryService.getCategories(
        {},
        {
          silent: hasCats,
          signal: controller.signal,
        }
      ),
    ])
      .then(([usersData, orgData, catsData]) => {
        setUsers(usersData.users);
        setOrganization(orgData);
        setCategories(catsData.categories);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [usersData, orgData, catsData] = await Promise.all([
        userService.getAllUsers({ page: 1, limit: 100 }),
        organizationService.getOrganization(),
        categoryService.getCategories(),
      ]);
      setUsers(usersData.users);
      setOrganization(orgData);
      setCategories(catsData.categories);
    } catch {
      // Handled via toast notifications in service wrappers
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status.toLowerCase() === "active").length;
  const sellers = users.filter((u) => u.role.toLowerCase() === "seller").length;
  const buyers = users.filter((u) => u.role.toLowerCase() === "buyer").length;
  const totalCategories = categories.length;

  const currencySymbol = organization
    ? organization.currencySymbol || resolveCurrencySymbol(organization.defaultCurrency)
    : "₨";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.TrendingUp size={13} className="mr-1" /> Performance Analytics
              </Badge>
              <Badge variant="success" size="sm">
                Live Observability
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Analytics
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Live marketplace analytics, user conversion metrics, and system activity telemetry.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            leftIcon={
              isRefreshing ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Icons.RotateCcw size={14} />
              )
            }
            className="shrink-0 cursor-pointer hidden sm:flex"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                User Base
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Users size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalUsers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {activeUsers} active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Creator Density
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Store size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalUsers > 0 ? `${Math.round((sellers / totalUsers) * 100)}%` : "0%"
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {sellers} sellers / {buyers} buyers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Platform Take Rate
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Icons.Percent size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
              ) : (
                `${organization?.feePercentage ?? 5.0}%`
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Default commission rate
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Catalog Depth
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.FolderTree size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalCategories
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Taxonomy categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="p-5 border-b border-outline-variant/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icons.Users size={18} className="text-primary" /> Audience Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Breakdown of registered marketplace accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-on-surface">Buyers ({buyers})</span>
                  <span className="text-on-surface-variant">
                    {totalUsers > 0 ? Math.round((buyers / totalUsers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{
                      width: `${totalUsers > 0 ? (buyers / totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span className="text-on-surface">Sellers & Creators ({sellers})</span>
                  <span className="text-on-surface-variant">
                    {totalUsers > 0 ? Math.round((sellers / totalUsers) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-500"
                    style={{
                      width: `${totalUsers > 0 ? (sellers / totalUsers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-5 border-b border-outline-variant/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icons.Wallet size={18} className="text-secondary" /> Financial Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Live settlement and payout configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Active Currency</span>
              <span className="font-bold text-on-surface">
                {organization?.defaultCurrency ?? "PKR"} ({currencySymbol})
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Minimum Payout</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyAmount(organization?.minPayout ?? 50, currencySymbol)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container border border-outline-variant/20">
              <span className="text-on-surface-variant font-medium">Commission Rate</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {organization?.feePercentage ?? 5.0}% per sale
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;

