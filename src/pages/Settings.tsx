import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Label,
  Modal,
  Spinner,
} from "@/components/ui/index.ts";
import {
  organizationService,
  OrganizationServiceError,
  resolveCurrencySymbol,
  formatCurrencyAmount,
  type OrganizationInfo,
  type CurrencyOption,
} from "@/services/index.ts";

export interface SettingsProps {
  onUpdate?: (updated: OrganizationInfo) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onUpdate }) => {
  // Live state from backend server with in-memory cache initialization
  const [organization, setOrganization] = useState<OrganizationInfo | null>(() =>
    organizationService.getCachedOrganization()
  );
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(() =>
    organizationService.getCachedCurrencies() || []
  );
  const [isLoading, setIsLoading] = useState(
    () => !organizationService.getCachedOrganization()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit settings modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    defaultCurrency: "PKR",
    currencySymbol: "₨",
    feePercentage: 5.0,
    minPayout: 50.0,
  });

  // Revalidate settings & currencies from backend server
  const refreshSettings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [orgData, currList] = await Promise.all([
        organizationService.getOrganization(),
        organizationService.getCurrencies(),
      ]);
      setOrganization(orgData);
      setCurrencies(currList);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Settings", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedOrg = !!organizationService.getCachedOrganization();
    const hasCachedCurr = !!organizationService.getCachedCurrencies();

    Promise.all([
      organizationService.getOrganization({
        silent: hasCachedOrg,
        signal: controller.signal,
      }),
      organizationService.getCurrencies({
        silent: hasCachedCurr,
        signal: controller.signal,
      }),
    ])
      .then(([orgData, currList]) => {
        setOrganization(orgData);
        setCurrencies(currList);
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

  const handleOpenEditModal = () => {
    if (organization) {
      setFormData({
        defaultCurrency: organization.defaultCurrency || "PKR",
        currencySymbol: organization.currencySymbol || "₨",
        feePercentage: organization.feePercentage ?? 5.0,
        minPayout: organization.minPayout ?? 50.0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value.toUpperCase();
    const found = currencies.find((c) => c.code.toUpperCase() === selectedCode);
    const newSymbol = found ? found.symbol : resolveCurrencySymbol(selectedCode);

    setFormData((prev) => ({
      ...prev,
      defaultCurrency: selectedCode,
      currencySymbol: newSymbol,
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    const fee = Number(formData.feePercentage);
    const minPayout = Number(formData.minPayout);

    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Validation Error", {
        description: "Platform fee rate must be a percentage between 0% and 100%.",
      });
      return;
    }

    if (isNaN(minPayout) || minPayout < 1) {
      toast.error("Validation Error", {
        description: "Minimum payout threshold must be at least 1 unit.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const currentOrg = organization || organizationService.getCachedOrganization();
      const payload: OrganizationInfo = {
        name: currentOrg?.name || "",
        shortName: currentOrg?.shortName || "",
        title: currentOrg?.title || "",
        tagline: currentOrg?.tagline || "",
        description: currentOrg?.description || "",
        address: currentOrg?.address || "",
        website: currentOrg?.website || "",
        supportEmail: currentOrg?.supportEmail || "",
        defaultCurrency: formData.defaultCurrency,
        currencySymbol: formData.currencySymbol,
        feePercentage: fee,
        minPayout: minPayout,
      };

      const updatedFromServer = await organizationService.updateOrganization(payload);
      setOrganization(updatedFromServer);

      if (onUpdate) {
        onUpdate(updatedFromServer);
      }

      toast.success("Settings Saved", {
        description: "Default currency, platform fee, and payout threshold have been updated in PostgreSQL.",
      });

      setIsModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update platform settings on the backend server.";
      toast.error("Save Failed", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

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
                <Icons.Settings size={13} className="mr-1" /> Platform Rules
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Settings
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Configure marketplace default settlement currency, platform commission rates, and creator payout thresholds.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshSettings}
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

      {/* Primary Settings Overview Grid - Zero Layout Shift */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Default Currency */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Default Currency
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Coins size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && !organization ? (
                <span className="inline-block h-8 w-20 bg-surface-container-high animate-pulse rounded" />
              ) : (
                `${organization?.defaultCurrency ?? "PKR"} (${currencySymbol})`
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Base marketplace pricing currency
            </p>
          </CardContent>
        </Card>

        {/* Platform Fee Rate */}
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
              Platform transaction commission
            </p>
          </CardContent>
        </Card>

        {/* Minimum Payout Floor */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Minimum Payout
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
              Creator withdrawal threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Platform Financial Configuration Card */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Sliders size={18} className="text-primary" /> Financial Rules & Thresholds
              </CardTitle>
              <CardDescription className="text-xs">
                Marketplace financial policies registered in backend PostgreSQL database
              </CardDescription>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Icons.Edit size={14} />}
              onClick={handleOpenEditModal}
              disabled={isLoading}
              className="cursor-pointer"
            >
              Update Settings
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Currency details */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface text-sm">Settlement Currency</span>
                <Badge variant="primary" size="sm">
                  {organization?.defaultCurrency ?? "PKR"}
                </Badge>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                All order charges, balance accounting, and financial payouts operate using this active system currency.
              </p>
              <div className="pt-1 font-mono text-on-surface font-semibold">
                Symbol: {currencySymbol}
              </div>
            </div>

            {/* Fee details */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface text-sm">Commission Rate</span>
                <Badge variant="outline" size="sm">
                  {organization?.feePercentage ?? 5.0}%
                </Badge>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                Automatically deducted on each verified sale and credited directly to platform treasury.
              </p>
              <div className="pt-1 text-amber-600 dark:text-amber-400 font-semibold">
                Platform Take: {organization?.feePercentage ?? 5.0}% per sale
              </div>
            </div>

            {/* Payout details */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-on-surface text-sm">Minimum Payout</span>
                <Badge variant="success" size="sm">
                  Floor
                </Badge>
              </div>
              <p className="text-on-surface-variant leading-relaxed">
                Creators qualify for automated weekly payout settlement once their available balance meets or exceeds this threshold.
              </p>
              <div className="pt-1 text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                Threshold: {formatCurrencyAmount(organization?.minPayout ?? 50, currencySymbol)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Platform Settings Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Update Platform Settings"
        description="Update default settlement currency, transaction commission rate, and minimum payout threshold."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Save size={16} />
                )
              }
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Default Currency Select */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-currency">
              Default Currency <span className="text-error">*</span>
            </Label>
            <select
              id="settings-currency"
              value={formData.defaultCurrency}
              onChange={handleCurrencyChange}
              disabled={isSaving}
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface shadow-xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {currencies.length > 0 ? (
                currencies.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} — {curr.name} ({curr.symbol})
                  </option>
                ))
              ) : (
                <option value="PKR">PKR — Pakistani Rupee (₨)</option>
              )}
            </select>
            <p className="text-xs text-on-surface-variant">
              Currencies loaded dynamically from backend PostgreSQL database.
            </p>
          </div>

          {/* Platform Fee Percentage */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-fee">
              Platform Fee Percentage (%) <span className="text-error">*</span>
            </Label>
            <Input
              id="settings-fee"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={formData.feePercentage}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  feePercentage: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="e.g. 5.0"
              required
              disabled={isSaving}
            />
            <p className="text-xs text-on-surface-variant">
              Percentage deducted from creator earnings on each transaction.
            </p>
          </div>

          {/* Minimum Payout Floor */}
          <div className="space-y-1.5">
            <Label htmlFor="settings-payout">
              Minimum Payout Threshold ({formData.currencySymbol}){" "}
              <span className="text-error">*</span>
            </Label>
            <Input
              id="settings-payout"
              type="number"
              step="1"
              min="1"
              value={formData.minPayout}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  minPayout: parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="e.g. 50"
              required
              disabled={isSaving}
            />
            <p className="text-xs text-on-surface-variant">
              Minimum accumulated balance needed before releasing seller payouts.
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const PlatformSettings = Settings;
export default Settings;
