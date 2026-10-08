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
  organizationService,
  formatCurrencyAmount,
  resolveCurrencySymbol,
  type OrganizationInfo,
} from "@/services/index.ts";

export const Orders: React.FC = () => {
  const [organization, setOrganization] = useState<OrganizationInfo | null>(
    () => organizationService.getCachedOrganization()
  );
  const [isLoading, setIsLoading] = useState(
    () => !organizationService.getCachedOrganization()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const hasOrg = !!organizationService.getCachedOrganization();

    organizationService
      .getOrganization({
        silent: hasOrg,
        signal: controller.signal,
      })
      .then((data) => {
        setOrganization(data);
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
      const data = await organizationService.getOrganization();
      setOrganization(data);
    } catch {
      // Handled via toast notifications in service
    } finally {
      setIsRefreshing(false);
    }
  };

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
                <Icons.ShoppingCart size={13} className="mr-1" /> Order Management & Settlements
              </Badge>
              <Badge variant="success" size="sm">
                Financial Observability
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Orders
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Marketplace transaction processing, creator payout thresholds, and commission accounting.
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

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Settlement Currency
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Coins size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
              ) : (
                organization?.defaultCurrency ?? "PKR"
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Base marketplace currency ({currencySymbol})
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Commission Take Rate
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
              Platform revenue per transaction
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Minimum Payout Floor
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.Wallet size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-on-surface tracking-tight truncate">
              {isLoading ? (
                <span className="inline-block h-8 w-28 bg-surface-container-high animate-pulse rounded" />
              ) : (
                formatCurrencyAmount(organization?.minPayout ?? 50, currencySymbol)
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Seller payout threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Protocol Card */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Icons.Security size={18} className="text-secondary" /> Transaction Settlement Gateway
          </CardTitle>
          <CardDescription className="text-xs">
            Live order processing pipeline configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <span className="font-semibold text-on-surface text-sm block">
                Automatic Creator Payouts
              </span>
              <p className="text-on-surface-variant leading-relaxed">
                Creators qualify for automated weekly payout settlement once their available balance exceeds{" "}
                <span className="font-bold text-on-surface">
                  {formatCurrencyAmount(organization?.minPayout ?? 50, currencySymbol)}
                </span>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <span className="font-semibold text-on-surface text-sm block">
                Platform Commission Retention
              </span>
              <p className="text-on-surface-variant leading-relaxed">
                A fixed fee of{" "}
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {organization?.feePercentage ?? 5.0}%
                </span>{" "}
                is deducted on all digital downloads and transferred to the platform treasury.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;

