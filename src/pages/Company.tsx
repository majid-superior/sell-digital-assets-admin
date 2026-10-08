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
  companyService,
  CompanyServiceError,
  resolveCurrencySymbol,
  formatCurrencyAmount,
  type CurrencyOption,
} from "@/services/index.ts";

export interface CompanyInfo {
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

export interface CompanyProps {
  data?: Partial<CompanyInfo>;
  onUpdate?: (updated: CompanyInfo) => void;
}

export const Company: React.FC<CompanyProps> = ({ onUpdate }) => {
  // Live state from backend server with in-memory cache initialization
  const [company, setCompany] = useState<CompanyInfo | null>(() =>
    companyService.getCachedCompany()
  );
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(() =>
    companyService.getCachedCurrencies() || []
  );
  const [isLoading, setIsLoading] = useState(
    () => !companyService.getCachedCompany()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>({
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

  // Fetch company metadata and currencies directly from backend server
  const refreshCompanyData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [data, currList] = await Promise.all([
        companyService.getCompany(),
        companyService.getCurrencies(),
      ]);
      setCompany(data);
      setCurrencies(currList);
    } catch (err: unknown) {
      const message =
        err instanceof CompanyServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Company Details", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCachedCompany = !!companyService.getCachedCompany();
    const hasCachedCurrencies = !!companyService.getCachedCurrencies();

    // Revalidate company with server (silent if already cached)
    companyService
      .getCompany({ silent: hasCachedCompany, signal: controller.signal })
      .then((data) => {
        setCompany(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!hasCachedCompany) {
          const message =
            err instanceof CompanyServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to connect to the backend server. Please verify the API is running.";
          toast.error("Failed to Load Company Details", {
            description: message,
          });
          setIsLoading(false);
        }
      });

    // Fetch currencies from database currencies table (silent if already cached)
    companyService
      .getCurrencies({ silent: hasCachedCurrencies, signal: controller.signal })
      .then((currList) => {
        setCurrencies(currList);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        // Silent background sync
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Open modal pre-populated with current company data from server
  const handleOpenEditModal = () => {
    if (!company) return;
    if (currencies.length === 0) {
      companyService.getCurrencies().then((list) => setCurrencies(list)).catch(() => {});
    }
    setFormData({
      ...company,
      currencySymbol:
        company.currencySymbol || resolveCurrencySymbol(company.defaultCurrency),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
  };

  const handleFormChange = <K extends keyof CompanyInfo>(
    key: K,
    value: CompanyInfo[K]
  ) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        [key]: value,
      };
      if (key === "defaultCurrency" && typeof value === "string") {
        const matched = currencies.find((c) => c.code === value);
        next.currencySymbol = matched ? matched.symbol : resolveCurrencySymbol(value);
      }
      return next;
    });
  };

  // Handle Save directly to backend server with strict toast error notifications
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedShortName = formData.shortName.trim();
    const trimmedTitle = formData.title.trim();
    const trimmedTagline = formData.tagline.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedWebsite = formData.website.trim();
    const trimmedEmail = formData.supportEmail.trim();
    const trimmedCurrency = formData.defaultCurrency.trim();
    const fee = Number(formData.feePercentage);
    const minPayout = Number(formData.minPayout);

    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "Company Name is required.",
      });
      return;
    }

    if (!trimmedShortName) {
      toast.error("Validation Error", {
        description: "Short Name is required.",
      });
      return;
    }

    if (!trimmedTitle) {
      toast.error("Validation Error", {
        description: "Platform Title is required.",
      });
      return;
    }

    if (!trimmedTagline) {
      toast.error("Validation Error", {
        description: "Tagline is required.",
      });
      return;
    }

    if (!trimmedDescription) {
      toast.error("Validation Error", {
        description: "Company Description is required.",
      });
      return;
    }

    if (!trimmedAddress) {
      toast.error("Validation Error", {
        description: "Registered Address is required.",
      });
      return;
    }

    if (!trimmedWebsite) {
      toast.error("Validation Error", {
        description: "Website URL is required.",
      });
      return;
    }

    if (!/^https?:\/\/.+/i.test(trimmedWebsite)) {
      toast.error("Validation Error", {
        description:
          "Website must start with http:// or https:// (e.g., https://selldigitalassets.com).",
      });
      return;
    }

    if (!trimmedEmail) {
      toast.error("Validation Error", {
        description: "Support Email is required.",
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

    if (!trimmedCurrency) {
      toast.error("Validation Error", {
        description: "Default Currency is required.",
      });
      return;
    }

    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast.error("Validation Error", {
        description:
          "Platform Fee Rate must be a valid percentage between 0% and 100%.",
      });
      return;
    }

    if (isNaN(minPayout) || minPayout <= 0) {
      toast.error("Validation Error", {
        description:
          "Minimum Payout must be a positive number greater than 0.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const currencySymbol =
        formData.currencySymbol || resolveCurrencySymbol(trimmedCurrency);

      const payload: CompanyInfo = {
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
      const updatedFromServer = await companyService.updateCompany(payload);
      setCompany(updatedFromServer);

      if (onUpdate) {
        onUpdate(updatedFromServer);
      }

      toast.success("Company Details Updated", {
        description:
          "Company profile and platform configuration have been saved directly to the backend database.",
      });

      setIsModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof CompanyServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update company details on backend server.";
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
                <Icons.Security size={13} className="mr-1" /> Organization Info
              </Badge>
              <Badge variant="success" size="sm">
                Backend Server
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Company Details
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Core identity, registered location, contact links, and marketplace financial settings.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshCompanyData}
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

      {/* Main Company Profile Card - Always Full Dimensions (Zero Layout Shift) */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs shrink-0">
                <Icons.Brand size={26} />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-bold tracking-tight truncate">
                  {company ? (
                    company.title
                  ) : (
                    <span className="inline-block h-6 w-48 bg-surface-container-high animate-pulse rounded align-middle" />
                  )}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-primary mt-0.5 truncate">
                  {company ? (
                    company.tagline
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
            {/* Company Name */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Company Name
              </span>
              <p className="text-base font-semibold text-on-surface">
                {company ? (
                  company.name
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
                {company ? (
                  company.shortName
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
                {company ? (
                  company.title
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
                {company ? (
                  company.tagline
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
                {company ? (
                  company.description
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
                {company ? (
                  company.address
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
              {company ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-primary hover:underline break-all"
                >
                  <span>{company.website}</span>
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
              {company ? (
                <a
                  href={`mailto:${company.supportEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-primary hover:underline break-all"
                >
                  {company.supportEmail}
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
                  {company ? (
                    company.defaultCurrency
                  ) : (
                    <span className="inline-block h-5 w-16 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {company && (
                  <Badge variant="primary" size="sm">
                    {company.currencySymbol ? `${company.currencySymbol} • Primary` : "Primary"}
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
                  {company ? (
                    `${company.feePercentage}%`
                  ) : (
                    <span className="inline-block h-5 w-16 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {company && (
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
                  {company ? (
                    formatCurrencyAmount(
                      company.minPayout,
                      company.currencySymbol || resolveCurrencySymbol(company.defaultCurrency)
                    )
                  ) : (
                    <span className="inline-block h-5 w-20 bg-surface-container-high animate-pulse rounded mt-1" />
                  )}
                </p>
                {company && (
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
            {!company && !isLoading ? (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCompanyData}
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
                disabled={!company || isLoading}
                className="w-full sm:w-auto shrink-0 shadow-xs cursor-pointer"
              >
                Update Company Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Update Company Details Popup Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Update Company Details"
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
              form="company-edit-form"
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
          id="company-edit-form"
          onSubmit={handleSave}
          noValidate
          className="space-y-4"
        >
          {/* Company Name & Short Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name" required>
                Company Name
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

export default Company;
