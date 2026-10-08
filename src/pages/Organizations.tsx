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
  type CurrencyOption,
} from "@/services/index.ts";

export interface OrganizationInfo {
  name: string;
  shortName: string;
  title: string;
  tagline: string;
  description: string;
  address: string;
  website: string;
  supportEmail: string;
  defaultCurrency: string;
  currencySymbol: string;
  feePercentage: number;
  minPayout: number;
}

export type CompanyInfo = OrganizationInfo;

export interface OrganizationsProps {
  data?: Partial<OrganizationInfo>;
  onUpdate?: (updated: OrganizationInfo) => void;
}

export type CompanyProps = OrganizationsProps;

export const Organizations: React.FC<OrganizationsProps> = ({ onUpdate }) => {
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<OrganizationInfo>({
    name: "",
    shortName: "",
    title: "",
    tagline: "",
    description: "",
    address: "",
    website: "",
    supportEmail: "",
    defaultCurrency: "PKR",
    currencySymbol: "₨",
    feePercentage: 5.0,
    minPayout: 50.0,
  });

  // Fetch organization metadata and currencies directly from backend server
  const refreshOrganizationData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [data, currList] = await Promise.all([
        organizationService.getOrganization(),
        organizationService.getCurrencies(),
      ]);
      setOrganization(data);
      setCurrencies(currList);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Organization Details", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedOrg = !!organizationService.getCachedOrganization();
    const hasCachedCurrencies = !!organizationService.getCachedCurrencies();

    // Revalidate organization with server (silent if already cached)
    organizationService
      .getOrganization({ silent: hasCachedOrg, signal: controller.signal })
      .then((data) => {
        setOrganization(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!hasCachedOrg) {
          const message =
            err instanceof OrganizationServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to connect to the backend server. Please verify the API is running.";
          toast.error("Failed to Load Organization Details", {
            description: message,
          });
          setIsLoading(false);
        }
      });

    // Cache currencies list in background
    if (!hasCachedCurrencies) {
      organizationService
        .getCurrencies({ silent: true, signal: controller.signal })
        .then((list) => setCurrencies(list))
        .catch(() => {});
    }

    return () => {
      controller.abort();
    };
  }, []);

  // Open modal pre-populated with current organization data from server
  const handleOpenEditModal = () => {
    if (!organization) return;
    if (currencies.length === 0) {
      organizationService.getCurrencies().then((list) => setCurrencies(list)).catch(() => {});
    }
    setFormData({
      ...organization,
      currencySymbol:
        organization.currencySymbol || resolveCurrencySymbol(organization.defaultCurrency),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleFormChange = <K extends keyof OrganizationInfo>(
    field: K,
    value: OrganizationInfo[K]
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "defaultCurrency" && typeof value === "string") {
        const matchingCurr = currencies.find(
          (c) => c.code.toUpperCase() === value.toUpperCase()
        );
        next.currencySymbol = matchingCurr
          ? matchingCurr.symbol
          : resolveCurrencySymbol(value);
      }
      return next;
    });
  };

  // Submit edit form directly to backend REST API
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side input validation
    const trimmedName = formData.name.trim();
    const trimmedShortName = formData.shortName.trim() || trimmedName;
    const trimmedTitle = formData.title.trim() || trimmedName;
    const trimmedTagline = formData.tagline.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedWebsite = formData.website.trim();
    const trimmedEmail = formData.supportEmail.trim();
    const trimmedCurrency =
      formData.defaultCurrency.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() ||
      "USD";

    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "Organization Name is required.",
      });
      return;
    }

    if (!trimmedEmail) {
      toast.error("Validation Error", {
        description: "Support Email address is required.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Validation Error", {
        description: "Please enter a valid support email address.",
      });
      return;
    }

    if (trimmedWebsite) {
      try {
        new URL(trimmedWebsite);
      } catch {
        toast.error("Validation Error", {
          description: "Please enter a valid website URL (e.g., https://example.com).",
        });
        return;
      }
    }

    if (!trimmedDescription) {
      toast.error("Validation Error", {
        description: "Organization Description is required.",
      });
      return;
    }

    const fee = Number(formData.feePercentage);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Validation Error", {
        description: "Platform fee percentage must be a valid number between 0% and 100%.",
      });
      return;
    }

    const minPayout = Number(formData.minPayout);
    if (isNaN(minPayout) || minPayout < 1) {
      toast.error("Validation Error", {
        description: "Minimum payout threshold must be at least 1 unit.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const selectedOption = currencies.find(
        (c) => c.code.toUpperCase() === trimmedCurrency
      );
      const currencySymbol = selectedOption
        ? selectedOption.symbol
        : resolveCurrencySymbol(trimmedCurrency, formData.currencySymbol);

      const payload: OrganizationInfo = {
        name: trimmedName,
        shortName: trimmedShortName,
        title: trimmedTitle,
        tagline: trimmedTagline,
        description: trimmedDescription,
        address: trimmedAddress,
        website: trimmedWebsite,
        supportEmail: trimmedEmail,
        defaultCurrency: trimmedCurrency,
        currencySymbol: currencySymbol,
        feePercentage: fee,
        minPayout: minPayout,
      };

      // Direct backend API update
      const updatedFromServer = await organizationService.updateOrganization(payload);
      setOrganization(updatedFromServer);

      if (onUpdate) {
        onUpdate(updatedFromServer);
      }

      toast.success("Organization Details Updated", {
        description:
          "Organization profile and platform configuration have been saved directly to the backend database.",
      });

      setIsModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update organization details on backend server.";
      toast.error("Save Failed", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Building size={13} className="mr-1" /> Organization Entity
              </Badge>
              <Badge variant="success" size="sm">
                Backend Server
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Organization Details
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Core identity, corporate location, contact channels, and marketplace financial settings.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshOrganizationData}
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

      {/* Main Organization Profile Card - Always Full Dimensions (Zero Layout Shift) */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
                <Icons.Brand size={26} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-bold tracking-tight truncate">
                  {organization ? (
                    organization.title
                  ) : (
                    <span className="inline-block h-6 w-48 bg-surface-container-high animate-pulse rounded align-middle" />
                  )}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-primary mt-0.5 truncate">
                  {organization ? (
                    organization.tagline
                  ) : (
                    <span className="inline-block h-4 w-64 bg-surface-container-high animate-pulse rounded align-middle" />
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" size="sm" className="shrink-0">
              REST API Platform
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Key Value Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Organization Name
              </span>
              <p className="text-base font-semibold text-on-surface">
                {organization ? (
                  organization.name
                ) : (
                  <span className="inline-block h-5 w-40 bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Short Name */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Short Name
              </span>
              <p className="text-base font-semibold text-on-surface">
                {organization ? (
                  organization.shortName
                ) : (
                  <span className="inline-block h-5 w-32 bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Title */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Platform Title
              </span>
              <p className="text-base font-semibold text-on-surface">
                {organization ? (
                  organization.title
                ) : (
                  <span className="inline-block h-5 w-48 bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Tagline */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Tagline
              </span>
              <p className="text-sm sm:text-base font-medium text-on-surface">
                {organization ? (
                  organization.tagline
                ) : (
                  <span className="inline-block h-5 w-64 bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Description
              </span>
              <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
                {organization ? (
                  organization.description
                ) : (
                  <span className="inline-block h-10 w-full bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Registered Address */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.MapPin size={14} className="text-primary" />
                <span>Registered Address</span>
              </div>
              <p className="text-sm sm:text-base font-medium text-on-surface">
                {organization ? (
                  organization.address
                ) : (
                  <span className="inline-block h-5 w-56 bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Website Link */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.Globe size={14} className="text-primary" />
                <span>Website Link</span>
              </div>
              {organization ? (
                <a
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-primary hover:underline break-all"
                >
                  <span>{organization.website}</span>
                  <Icons.ExternalLink size={13} className="shrink-0" />
                </a>
              ) : (
                <span className="inline-block h-5 w-48 bg-surface-container-high animate-pulse rounded mt-1" />
              )}
            </div>

            {/* Support Email */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.Mail size={14} className="text-primary" />
                <span>Support Email</span>
              </div>
              {organization ? (
                <a
                  href={`mailto:${organization.supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-primary hover:underline break-all"
                >
                  {organization.supportEmail}
                </a>
              ) : (
                <span className="inline-block h-5 w-44 bg-surface-container-high animate-pulse rounded mt-1" />
              )}
            </div>

            {/* Default Currency */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.Coins size={14} className="text-primary" />
                <span>Default Currency</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-on-surface">
                  {organization ? (
                    organization.defaultCurrency
                  ) : (
                    <span className="inline-block h-5 w-16 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {organization && (
                  <Badge variant="primary" size="sm">
                    {organization.currencySymbol ? `${organization.currencySymbol} • Primary` : "Primary"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Fee Percentage */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.Percent size={14} className="text-primary" />
                <span>Platform Fee Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-on-surface">
                  {organization ? (
                    `${organization.feePercentage}%`
                  ) : (
                    <span className="inline-block h-5 w-16 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {organization && (
                  <Badge variant="outline" size="sm">
                    Commission
                  </Badge>
                )}
              </div>
            </div>

            {/* Minimum Payout */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.Wallet size={14} className="text-primary" />
                <span>Minimum Payout Threshold</span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-on-surface">
                  {organization ? (
                    formatCurrencyAmount(
                      organization.minPayout,
                      organization.currencySymbol || resolveCurrencySymbol(organization.defaultCurrency)
                    )
                  ) : (
                    <span className="inline-block h-5 w-20 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {organization && (
                  <Badge variant="success" size="sm">
                    Settlement
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Action Section with Update Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">
              Live organization profile metadata connected directly to the REST API server.
            </p>
            {!organization && !isLoading ? (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshOrganizationData}
                leftIcon={<Icons.Performance size={14} />}
                className="cursor-pointer"
              >
                Retry Server Connection
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Icons.Edit size={16} />}
                onClick={handleOpenEditModal}
                disabled={!organization || isLoading}
                className="w-full sm:w-auto shrink-0 shadow-xs cursor-pointer"
              >
                Update Organization Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Organization Details Popup Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Update Organization Details"
        description="Modify organization metadata and marketplace configuration directly on the server."
        size="xl"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseModal}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="organization-edit-form"
              variant="primary"
              size="sm"
              leftIcon={<Icons.Save size={15} />}
              isLoading={isSaving}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form
          id="organization-edit-form"
          onSubmit={handleSave}
          noValidate
          className="space-y-4"
        >
          {/* Organization Name & Short Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name" required>
                Organization Name
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                placeholder="Sell Digital Assets API"
                leftIcon={<Icons.Building size={16} />}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-short-name" required>
                Short Name
              </Label>
              <Input
                id="edit-short-name"
                value={formData.shortName}
                onChange={(e) => handleFormChange("shortName", e.target.value)}
                placeholder="Sell Digital Assets"
                leftIcon={<Icons.Building size={16} />}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Title & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-title" required>
                Platform Title
              </Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Platform title"
                leftIcon={<Icons.Brand size={16} />}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-tagline" required>
                Tagline
              </Label>
              <Input
                id="edit-tagline"
                value={formData.tagline}
                onChange={(e) => handleFormChange("tagline", e.target.value)}
                placeholder="Platform tagline"
                leftIcon={<Icons.Sparkles size={16} />}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="edit-description" required>
              Description
            </Label>
            <textarea
              id="edit-description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              placeholder="Enterprise digital assets marketplace..."
              disabled={isSaving}
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Registered Address */}
          <div className="space-y-1">
            <Label htmlFor="edit-address" required>
              Registered Address
            </Label>
            <Input
              id="edit-address"
              value={formData.address}
              onChange={(e) => handleFormChange("address", e.target.value)}
              placeholder="Ring Road, Lahore, Pakistan"
              leftIcon={<Icons.MapPin size={16} />}
              disabled={isSaving}
            />
          </div>

          {/* Website Link & Support Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-website" required>
                Website Link
              </Label>
              <Input
                id="edit-website"
                type="url"
                value={formData.website}
                onChange={(e) => handleFormChange("website", e.target.value)}
                placeholder="https://selldigitalassets.com"
                leftIcon={<Icons.Globe size={16} />}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-email" required>
                Support Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.supportEmail}
                onChange={(e) => handleFormChange("supportEmail", e.target.value)}
                placeholder="support@selldigitalassets.com"
                leftIcon={<Icons.Mail size={16} />}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Financial: Default Currency, Fee Percentage, Minimum Payout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-currency" required>
                Default Currency
              </Label>
              <select
                id="edit-currency"
                value={formData.defaultCurrency}
                onChange={(e) => handleFormChange("defaultCurrency", e.target.value)}
                disabled={isSaving}
                className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {currencies.length > 0 ? (
                  currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} — {curr.name} ({curr.symbol})
                    </option>
                  ))
                ) : (
                  <option value={formData.defaultCurrency}>
                    {formData.defaultCurrency} ({formData.currencySymbol})
                  </option>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-fee" required>
                Platform Fee (%)
              </Label>
              <Input
                id="edit-fee"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.feePercentage}
                onChange={(e) =>
                  handleFormChange("feePercentage", Number(e.target.value))
                }
                placeholder="5.0"
                leftIcon={<Icons.Percent size={16} />}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-payout" required>
                Min Payout ({formData.currencySymbol || resolveCurrencySymbol(formData.defaultCurrency)})
              </Label>
              <Input
                id="edit-payout"
                type="number"
                step="1"
                min="1"
                value={formData.minPayout}
                onChange={(e) =>
                  handleFormChange("minPayout", Number(e.target.value))
                }
                placeholder="25000"
                leftIcon={<Icons.Wallet size={16} />}
                disabled={isSaving}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const Company = Organizations;
export default Organizations;
