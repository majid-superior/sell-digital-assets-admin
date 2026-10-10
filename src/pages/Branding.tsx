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
  type OrganizationInfo,
} from "@/services/index.ts";

export interface BrandingProps {
  data?: Partial<OrganizationInfo>;
  onUpdate?: (updated: OrganizationInfo) => void;
}

export const Branding: React.FC<BrandingProps> = ({ onUpdate }) => {
  // Live state from backend server with in-memory cache initialization
  const [organization, setOrganization] = useState<OrganizationInfo | null>(() =>
    organizationService.getCachedOrganization()
  );
  const [isLoading, setIsLoading] = useState(
    () => !organizationService.getCachedOrganization()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    tagline: "",
    description: "",
    address: "",
    website: "",
    supportEmail: "",
  });

  // Fetch organization metadata directly from backend server
  const refreshBrandingData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await organizationService.getOrganization();
      setOrganization(data);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Branding Details", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!organizationService.getCachedOrganization();

    organizationService
      .getOrganization({ silent: hasCached, signal: controller.signal })
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

  const handleOpenEditModal = () => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        shortName: organization.shortName || "",
        tagline: organization.tagline || "",
        description: organization.description || "",
        address: organization.address || "",
        website: organization.website || "",
        supportEmail: organization.supportEmail || "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedShortName = formData.shortName.trim();
    const trimmedTagline = formData.tagline.trim();
    const trimmedDescription = formData.description.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedWebsite = formData.website.trim();
    const trimmedEmail = formData.supportEmail.trim();

    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "Organization Name is required.",
      });
      return;
    }

    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        toast.error("Validation Error", {
          description: "Please enter a valid email address.",
        });
        return;
      }
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

    setIsSaving(true);

    try {
      const currentOrg = organization || organizationService.getCachedOrganization();
      const payload: OrganizationInfo = {
        name: trimmedName,
        shortName: trimmedShortName || trimmedName,
        title: trimmedShortName || trimmedName,
        tagline: trimmedTagline,
        description: trimmedDescription,
        address: trimmedAddress,
        website: trimmedWebsite,
        supportEmail: trimmedEmail,
        defaultCurrency: currentOrg?.defaultCurrency || "PKR",
        currencySymbol: currentOrg?.currencySymbol || "₨",
        feePercentage: currentOrg?.feePercentage ?? 5.0,
        minPayout: currentOrg?.minPayout ?? 50.0,
      };

      const updatedFromServer = await organizationService.updateOrganization(payload);
      setOrganization(updatedFromServer);

      if (onUpdate) {
        onUpdate(updatedFromServer);
      }

      toast.success("Branding Updated", {
        description: "Organization branding and contact identity have been saved to the database.",
      });

      setIsModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update branding details on backend server.";
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
                <Icons.Brand size={13} className="mr-1" /> Platform Identity
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Branding
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Organization name, brand messaging, physical address, website link, and support email channels.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshBrandingData}
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

      {/* Main Branding Information Card */}
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
                    organization.name || organization.title || "—"
                  ) : (
                    <span className="inline-block h-6 w-48 bg-surface-container-high animate-pulse rounded align-middle" />
                  )}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-primary mt-0.5 truncate">
                  {organization ? (
                    organization.tagline || "—"
                  ) : (
                    <span className="inline-block h-4 w-64 bg-surface-container-high animate-pulse rounded align-middle" />
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" size="sm" className="shrink-0">
              Singleton Entity
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
                  organization.name || "—"
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
                  organization.shortName || "—"
                ) : (
                  <span className="inline-block h-5 w-32 bg-surface-container-high animate-pulse rounded mt-1" />
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
                  organization.tagline || "—"
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
                  organization.description || "—"
                ) : (
                  <span className="inline-block h-10 w-full bg-surface-container-high animate-pulse rounded mt-1" />
                )}
              </p>
            </div>

            {/* Registered Address */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                <Icons.MapPin size={14} className="text-primary" />
                <span>Address</span>
              </div>
              <p className="text-sm sm:text-base font-medium text-on-surface">
                {organization ? (
                  organization.address || "—"
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
                organization.website ? (
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
                  <span className="text-sm text-on-surface-variant">—</span>
                )
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
                organization.supportEmail ? (
                  <a
                    href={`mailto:${organization.supportEmail}`}
                    className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-primary hover:underline break-all"
                  >
                    {organization.supportEmail}
                  </a>
                ) : (
                  <span className="text-sm text-on-surface-variant">—</span>
                )
              ) : (
                <span className="inline-block h-5 w-44 bg-surface-container-high animate-pulse rounded mt-1" />
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20">
            <p className="text-xs text-on-surface-variant">
              Live organization branding information synchronized with backend PostgreSQL.
            </p>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Icons.Edit size={16} />}
              onClick={handleOpenEditModal}
              disabled={isLoading}
              className="cursor-pointer w-full sm:w-auto"
            >
              Edit Branding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Branding Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Edit Organization Branding"
        description="Update your organization identity, brand messaging, address, website, and support contact details."
        size="lg"
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
              onClick={handleSaveBranding}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Save size={16} />
                )
              }
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveBranding} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Organization Name */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">
                Organization Name <span className="text-error">*</span>
              </Label>
              <Input
                id="brand-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter organization legal name"
                required
                disabled={isSaving}
              />
            </div>

            {/* Short Name */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-short-name">Short / Display Name</Label>
              <Input
                id="brand-short-name"
                value={formData.shortName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, shortName: e.target.value }))
                }
                placeholder="Enter brand short name"
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-tagline">Tagline</Label>
            <Input
              id="brand-tagline"
              value={formData.tagline}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tagline: e.target.value }))
              }
              placeholder="Enter brand tagline"
              disabled={isSaving}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-description">Description</Label>
            <textarea
              id="brand-description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Enter organization description..."
              disabled={isSaving}
              className="w-full rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface shadow-xs transition-colors placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="brand-address">Physical Address</Label>
            <Input
              id="brand-address"
              value={formData.address}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, address: e.target.value }))
              }
              placeholder="Enter registered business address"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Website Link */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-website">Website URL</Label>
              <Input
                id="brand-website"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="https://example.com"
                disabled={isSaving}
              />
            </div>

            {/* Support Email */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-email">Support Email</Label>
              <Input
                id="brand-email"
                type="email"
                value={formData.supportEmail}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supportEmail: e.target.value }))
                }
                placeholder="support@example.com"
                disabled={isSaving}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const Organizations = Branding;
export default Branding;

