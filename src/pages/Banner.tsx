import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Icons, type IconComponent } from "@/lib/icons/index.ts";
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
  Checkbox,
  Modal,
  Spinner,
  EmptyState,
} from "@/components/ui/index.ts";
import {
  bannerService,
  BannerServiceError,
  getBannerBadgeLabel,
  type BannerAppearance,
  type BannerBadgeType,
  type ComputedBannerStatus,
  type ManagedBanner,
} from "@/services/index.ts";

const ITEMS_PER_PAGE = 10;

interface BadgeTypeOption {
  value: BannerBadgeType;
  label: string;
  icon: IconComponent;
}

const BADGE_TYPE_OPTIONS: BadgeTypeOption[] = [
  {
    value: "special_offer",
    label: "Special Offer",
    icon: Icons.Magic,
  },
  {
    value: "hot_deal",
    label: "Hot Deal",
    icon: Icons.Performance,
  },
  {
    value: "new_release",
    label: "New Release",
    icon: Icons.Rating,
  },
  {
    value: "limited_time",
    label: "Limited Time",
    icon: Icons.Clock,
  },
  {
    value: "announcement",
    label: "Announcement",
    icon: Icons.Megaphone,
  },
  {
    value: "flash_sale",
    label: "Flash Sale",
    icon: Icons.Ticket,
  },
  {
    value: "none",
    label: "No Badge",
    icon: Icons.Close,
  },
];

interface AppearanceOption {
  value: BannerAppearance;
  label: string;
  description: string;
  containerClass: string;
  badgeClass: string;
  supportingClass: string;
  ctaClass: string;
  dismissClass: string;
}

const APPEARANCE_OPTIONS: AppearanceOption[] = [
  {
    value: "primary",
    label: "Brand Primary",
    description: "Uses --color-primary & --color-on-primary tokens",
    containerClass: "bg-primary text-on-primary border-b border-primary/20",
    badgeClass: "bg-on-primary/15 text-on-primary",
    supportingClass:
      "bg-on-primary/15 text-on-primary border border-on-primary/20",
    ctaClass: "bg-on-primary text-primary hover:opacity-90",
    dismissClass:
      "text-on-primary/80 hover:text-on-primary hover:bg-on-primary/10",
  },
  {
    value: "secondary",
    label: "Brand Secondary",
    description: "Uses --color-secondary & --color-on-secondary tokens",
    containerClass:
      "bg-secondary text-on-secondary border-b border-secondary/20",
    badgeClass: "bg-on-secondary/15 text-on-secondary",
    supportingClass:
      "bg-on-secondary/15 text-on-secondary border border-on-secondary/20",
    ctaClass: "bg-on-secondary text-secondary hover:opacity-90",
    dismissClass:
      "text-on-secondary/80 hover:text-on-secondary hover:bg-on-secondary/10",
  },
  {
    value: "tertiary",
    label: "Brand Tertiary",
    description: "Uses --color-tertiary & --color-on-tertiary tokens",
    containerClass: "bg-tertiary text-on-tertiary border-b border-tertiary/20",
    badgeClass: "bg-on-tertiary/15 text-on-tertiary",
    supportingClass:
      "bg-on-tertiary/15 text-on-tertiary border border-on-tertiary/20",
    ctaClass: "bg-on-tertiary text-tertiary hover:opacity-90",
    dismissClass:
      "text-on-tertiary/80 hover:text-on-tertiary hover:bg-on-tertiary/10",
  },
  {
    value: "accent",
    label: "Accent Container",
    description: "Uses --color-primary-container & --color-on-primary-container",
    containerClass:
      "bg-primary-container text-on-primary-container border-b border-outline-variant/30",
    badgeClass: "bg-primary/15 text-primary",
    supportingClass:
      "bg-surface/60 text-on-primary-container border border-outline-variant/40",
    ctaClass: "bg-primary text-on-primary hover:opacity-90",
    dismissClass:
      "text-on-primary-container/80 hover:text-on-primary-container hover:bg-on-primary-container/10",
  },
  {
    value: "inverse",
    label: "High-Contrast Inverse",
    description: "Uses --color-inverse-surface & --color-inverse-on-surface",
    containerClass:
      "bg-inverse-surface text-inverse-on-surface border-b border-outline-variant/20",
    badgeClass: "bg-inverse-on-surface/15 text-inverse-on-surface",
    supportingClass:
      "bg-inverse-on-surface/15 text-inverse-on-surface border border-inverse-on-surface/20",
    ctaClass: "bg-primary text-on-primary hover:opacity-90",
    dismissClass:
      "text-inverse-on-surface/80 hover:text-inverse-on-surface hover:bg-inverse-on-surface/10",
  },
  {
    value: "surface",
    label: "Subtle Surface",
    description: "Uses --color-surface-container-high & --color-on-surface",
    containerClass:
      "bg-surface-container-high text-on-surface border-b border-outline-variant/40",
    badgeClass: "bg-primary/15 text-primary",
    supportingClass:
      "bg-surface-container-highest text-on-surface border border-outline-variant/40",
    ctaClass: "bg-primary text-on-primary hover:opacity-90",
    dismissClass:
      "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest",
  },
];

const COMMON_TIMEZONES = [
  "UTC",
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function getAppearanceConfig(appearance: BannerAppearance): AppearanceOption {
  return (
    APPEARANCE_OPTIONS.find((opt) => opt.value === appearance) ??
    APPEARANCE_OPTIONS[0]!
  );
}

function getBadgeIcon(badgeType: BannerBadgeType): IconComponent {
  return (
    BADGE_TYPE_OPTIONS.find((opt) => opt.value === badgeType)?.icon ??
    Icons.Magic
  );
}

/**
 * Formats an ISO 8601 timestamp into "YYYY-MM-DDTHH:mm" wall-clock time
 * in the specified IANA timezone for `<input type="datetime-local" />`.
 */
function isoToWallClockInput(iso: string | null, timezone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        map[part.type] = part.value;
      }
    }
    const hour = map.hour === "24" ? "00" : (map.hour ?? "00");
    return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`;
  } catch {
    return date.toISOString().slice(0, 16);
  }
}

/**
 * Formats an ISO 8601 timestamp for human display in the banner's timezone.
 */
function formatDisplayDateTime(iso: string | null, timezone: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

interface BannerFormData {
  id: string | null;
  title: string;
  description: string;
  supportingText: string;
  badgeType: BannerBadgeType;
  ctaLabel: string;
  ctaUrl: string;
  showCta: boolean;
  isDismissible: boolean;
  appearance: BannerAppearance;
  priority: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  timezone: string;
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function createInitialFormData(): BannerFormData {
  return {
    id: null,
    title: "",
    description: "",
    supportingText: "",
    badgeType: "special_offer",
    ctaLabel: "Start now",
    ctaUrl: "/signup",
    showCta: true,
    isDismissible: true,
    appearance: "primary",
    priority: 10,
    isActive: true,
    startsAt: "",
    endsAt: "",
    timezone: getBrowserTimezone(),
  };
}

export const Banner: React.FC = () => {
  const [banners, setBanners] = useState<ManagedBanner[]>(
    () => bannerService.getCachedBanners()?.banners || [],
  );
  const [isLoading, setIsLoading] = useState(
    () => !bannerService.getCachedBanners(),
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search, Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | ComputedBannerStatus
  >("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formData, setFormData] = useState<BannerFormData>(
    createInitialFormData,
  );
  const [deletingBanner, setDeletingBanner] = useState<ManagedBanner | null>(
    null,
  );

  // Action Loading States
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const timezoneOptions = useMemo(() => {
    const browserTz = getBrowserTimezone();
    const set = new Set<string>([browserTz, ...COMMON_TIMEZONES]);
    if (formData.timezone) set.add(formData.timezone);
    return Array.from(set);
  }, [formData.timezone]);

  const refreshBanners = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await bannerService.getBanners({ page: 1, limit: 500 });
      setBanners(res.banners);
    } catch (err: unknown) {
      const message =
        err instanceof BannerServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load promotional banners from the backend server.";
      toast.error("Failed to Load Banners", { description: message });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCached = Boolean(bannerService.getCachedBanners());

    bannerService
      .getBanners(
        { page: 1, limit: 500 },
        { silent: hasCached, signal: controller.signal },
      )
      .then((res) => {
        setBanners(res.banners);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!hasCached) {
          const message =
            err instanceof BannerServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load promotional banners from the backend server.";
          toast.error("Failed to Load Banners", { description: message });
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Computed metrics from live database records
  const totalCount = banners.length;
  const activeCount = banners.filter((b) => b.status === "active").length;
  const scheduledCount = banners.filter((b) => b.status === "scheduled").length;
  const expiredOrInactiveCount = banners.filter(
    (b) => b.status === "expired" || b.status === "inactive",
  ).length;

  // Highest-priority currently active banner for live preview
  const liveActiveBanner = useMemo(() => {
    return (
      [...banners]
        .filter((b) => b.status === "active")
        .sort(
          (a, b) =>
            b.priority - a.priority ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0] ?? null
    );
  }, [banners]);

  // Filtered banners
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        b.title.toLowerCase().includes(query) ||
        (b.description ?? "").toLowerCase().includes(query) ||
        (b.supportingText ?? "").toLowerCase().includes(query) ||
        (getBannerBadgeLabel(b.badgeType) ?? "").toLowerCase().includes(query) ||
        b.badgeType.toLowerCase().includes(query) ||
        (b.ctaLabel ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [banners, searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredBanners.length / ITEMS_PER_PAGE),
  );
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedBanners = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredBanners.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBanners, validCurrentPage]);

  const handleOpenCreate = () => {
    setFormData(createInitialFormData());
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (banner: ManagedBanner) => {
    const tz = banner.timezone || "UTC";
    setFormData({
      id: banner.id,
      title: banner.title,
      description: banner.description ?? "",
      supportingText: banner.supportingText ?? "",
      badgeType: banner.badgeType,
      ctaLabel: banner.ctaLabel ?? "",
      ctaUrl: banner.ctaUrl ?? "",
      showCta: banner.showCta,
      isDismissible: banner.isDismissible,
      appearance: banner.appearance,
      priority: banner.priority,
      isActive: banner.isActive,
      startsAt: isoToWallClockInput(banner.startsAt, tz),
      endsAt: isoToWallClockInput(banner.endsAt, tz),
      timezone: tz,
    });
    setIsFormModalOpen(true);
  };

  const handleBadgeTypeChange = (nextType: BannerBadgeType) => {
    setFormData((prev) => ({
      ...prev,
      badgeType: nextType,
    }));
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      toast.error("Validation Error", {
        description: "Banner title/message is required.",
      });
      return;
    }

    if (formData.showCta) {
      if (!formData.ctaLabel.trim()) {
        toast.error("Validation Error", {
          description:
            "CTA button label is required when CTA visibility is enabled.",
        });
        return;
      }
      if (!formData.ctaUrl.trim()) {
        toast.error("Validation Error", {
          description:
            "CTA destination URL is required when CTA visibility is enabled.",
        });
        return;
      }
    }

    if (formData.startsAt && formData.endsAt) {
      if (formData.endsAt <= formData.startsAt) {
        toast.error("Schedule Error", {
          description:
            "End date/time must be later than the start date/time.",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        title: trimmedTitle,
        description: formData.description.trim() || null,
        supportingText: formData.supportingText.trim() || null,
        badgeType: formData.badgeType,
        ctaLabel: formData.ctaLabel.trim() || null,
        ctaUrl: formData.ctaUrl.trim() || null,
        showCta: formData.showCta,
        isDismissible: formData.isDismissible,
        appearance: formData.appearance,
        priority: Number(formData.priority) || 0,
        isActive: formData.isActive,
        startsAt: formData.startsAt.trim() || null,
        endsAt: formData.endsAt.trim() || null,
        timezone: formData.timezone.trim() || "UTC",
      };

      if (formData.id) {
        const updated = await bannerService.updateBanner(formData.id, payload);
        setBanners((prev) =>
          prev
            .map((b) => (b.id === updated.id ? updated : b))
            .sort(
              (a, b) =>
                b.priority - a.priority ||
                new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime(),
            ),
        );
        toast.success("Banner Updated", {
          description: `"${updated.title}" has been saved to the database.`,
        });
      } else {
        const created = await bannerService.createBanner(payload);
        setBanners((prev) =>
          [created, ...prev].sort(
            (a, b) =>
              b.priority - a.priority ||
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
        toast.success("Banner Created", {
          description: `"${created.title}" has been created and saved.`,
        });
      }

      setIsFormModalOpen(false);
    } catch (err: unknown) {
      const message =
        err instanceof BannerServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not save promotional banner.";
      toast.error("Save Failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (banner: ManagedBanner) => {
    setTogglingId(banner.id);
    try {
      const nextActive = !banner.isActive;
      const updated = await bannerService.toggleBannerStatus(
        banner.id,
        nextActive,
      );
      setBanners((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
      toast.success(nextActive ? "Banner Activated" : "Banner Deactivated", {
        description: `"${updated.title}" is now ${nextActive ? "enabled" : "disabled"}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof BannerServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not update banner status.";
      toast.error("Status Update Failed", { description: message });
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBanner) return;
    setIsDeleting(true);
    try {
      await bannerService.deleteBanner(deletingBanner.id);
      setBanners((prev) => prev.filter((b) => b.id !== deletingBanner.id));
      toast.success("Banner Deleted", {
        description: `"${deletingBanner.title}" has been permanently removed.`,
      });
      setDeletingBanner(null);
    } catch (err: unknown) {
      const message =
        err instanceof BannerServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not delete banner.";
      toast.error("Delete Failed", { description: message });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatusBadge = (status: ComputedBannerStatus) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="success" size="sm">
            <Icons.Check size={11} />
            Active
          </Badge>
        );
      case "scheduled":
        return (
          <Badge variant="primary" size="sm">
            <Icons.Clock size={11} />
            Scheduled
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="warning" size="sm">
            <Icons.AlertCircle size={11} />
            Expired
          </Badge>
        );
      case "inactive":
      default:
        return (
          <Badge variant="default" size="sm">
            <Icons.EyeOff size={11} />
            Inactive
          </Badge>
        );
    }
  };

  const renderBannerPreviewBar = (preview: {
    title: string;
    description: string | null;
    supportingText: string | null;
    badgeType: BannerBadgeType;
    ctaLabel: string | null;
    ctaUrl: string | null;
    showCta: boolean;
    isDismissible: boolean;
    appearance: BannerAppearance;
  }) => {
    const style = getAppearanceConfig(preview.appearance);
    const BadgeIcon = getBadgeIcon(preview.badgeType);
    const displayBadgeText = getBannerBadgeLabel(preview.badgeType);

    return (
      <div
        className={`relative w-full overflow-hidden rounded-lg transition-colors shadow-xs ${style.containerClass}`}
      >
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
          <div className="flex-1 min-w-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center">
            {displayBadgeText && (
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${style.badgeClass}`}
              >
                <BadgeIcon size={12} className="shrink-0" />
                <span>{displayBadgeText}</span>
              </span>
            )}

            <span className="font-semibold tracking-tight">
              {preview.title.trim() || "Your promotional headline appears here"}
            </span>

            {preview.description?.trim() && (
              <>
                <span className="hidden md:inline opacity-60">•</span>
                <span className="hidden md:inline opacity-85 text-xs">
                  {preview.description.trim()}
                </span>
              </>
            )}

            {preview.supportingText?.trim() && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-tight ${style.supportingClass}`}
              >
                {preview.supportingText.trim()}
              </span>
            )}

            {preview.showCta && preview.ctaLabel?.trim() && (
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs tracking-tight shadow-xs ${style.ctaClass}`}
              >
                <span>{preview.ctaLabel.trim()}</span>
                <Icons.Next size={13} />
              </span>
            )}
          </div>

          {preview.isDismissible && (
            <span
              aria-hidden="true"
              className={`shrink-0 p-1 rounded-md ${style.dismissClass}`}
            >
              <Icons.Close size={14} />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Promotional Banners
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
            Create, schedule, prioritize, and theme announcement banners for the
            public marketplace promotional bar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBanners}
            isLoading={isRefreshing}
            leftIcon={<Icons.RefreshCw size={14} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Icons.Plus size={15} />}
          >
            Create Banner
          </Button>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Total Banners
              </p>
              <p className="text-2xl font-extrabold text-on-surface mt-1">
                {totalCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icons.Megaphone size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Active Live Now
              </p>
              <p className="text-2xl font-extrabold text-success mt-1">
                {activeCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <Icons.Check size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Scheduled Upcoming
              </p>
              <p className="text-2xl font-extrabold text-primary mt-1">
                {scheduledCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icons.Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Expired / Inactive
              </p>
              <p className="text-2xl font-extrabold text-on-surface-variant mt-1">
                {expiredOrInactiveCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center">
              <Icons.EyeOff size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Website PromoBar Preview */}
      {liveActiveBanner && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Icons.Eye size={16} className="text-primary" />
                  <span>Live Top-Priority Website Banner Preview</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Currently serving on the marketplace homepage (Priority:{" "}
                  {liveActiveBanner.priority} • Theme:{" "}
                  {getAppearanceConfig(liveActiveBanner.appearance).label})
                </CardDescription>
              </div>
              <Badge variant="success" size="sm">
                Live on Website
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {renderBannerPreviewBar(liveActiveBanner)}
          </CardContent>
        </Card>
      )}

      {/* Search & Status Filters + Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>Banner Campaigns</CardTitle>
              <CardDescription>
                Manage promotional messages, CTAs, time-bound schedules, and
                display priorities.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Box */}
              <div className="w-full sm:w-64">
                <Input
                  placeholder="Search title, badge, CTA..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  leftIcon={<Icons.Search size={15} />}
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg border border-outline-variant/30 overflow-x-auto">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "scheduled", label: "Scheduled" },
                    { id: "expired", label: "Expired" },
                    { id: "inactive", label: "Inactive" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      statusFilter === tab.id
                        ? "bg-primary text-on-primary shadow-2xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Spinner size="lg" color="primary" />
              <p className="text-xs text-on-surface-variant font-medium">
                Loading promotional banners from database...
              </p>
            </div>
          ) : filteredBanners.length === 0 ? (
            <EmptyState
              icon={<Icons.Megaphone size={28} />}
              title={
                banners.length === 0
                  ? "No Promotional Banners Created Yet"
                  : "No Matching Banners Found"
              }
              description={
                banners.length === 0
                  ? "Create your first promotional banner to display time-sensitive offers, announcements, or campaign CTAs in the website PromoBar."
                  : "Try clearing your search query or switching the status filter."
              }
              action={
                banners.length === 0 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenCreate}
                    leftIcon={<Icons.Plus size={15} />}
                  >
                    Create First Banner
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest/70 border-b border-outline-variant/30 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="py-3 px-4">Campaign & Badge</th>
                      <th className="py-3 px-4">CTA & Visibility</th>
                      <th className="py-3 px-4">Schedule Window</th>
                      <th className="py-3 px-4">Appearance & Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 text-sm">
                    {paginatedBanners.map((banner) => {
                      const BadgeIcon = getBadgeIcon(banner.badgeType);
                      const appearanceCfg = getAppearanceConfig(
                        banner.appearance,
                      );
                      const isToggling = togglingId === banner.id;

                      return (
                        <tr
                          key={banner.id}
                          className="hover:bg-surface-container-high/30 transition-colors"
                        >
                          {/* Campaign & Badge */}
                          <td className="py-3.5 px-4 align-top max-w-xs">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {banner.badgeType !== "none" && (
                                  <Badge variant="primary" size="sm">
                                    <BadgeIcon size={11} />
                                    <span>{getBannerBadgeLabel(banner.badgeType)}</span>
                                  </Badge>
                                )}
                                <span className="font-bold text-on-surface">
                                  {banner.title}
                                </span>
                              </div>
                              {banner.description && (
                                <p className="text-xs text-on-surface-variant line-clamp-2">
                                  {banner.description}
                                </p>
                              )}
                              {banner.supportingText && (
                                <span className="inline-flex self-start items-center px-2 py-0.5 rounded bg-surface-container-high text-[11px] font-semibold text-on-surface-variant border border-outline-variant/30">
                                  {banner.supportingText}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* CTA & Visibility */}
                          <td className="py-3.5 px-4 align-top">
                            {banner.showCta && banner.ctaLabel ? (
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1 font-semibold text-xs text-primary">
                                  <span>{banner.ctaLabel}</span>
                                  <Icons.ExternalLink size={12} />
                                </div>
                                <p className="text-xs text-on-surface-variant font-mono truncate max-w-[180px]">
                                  {banner.ctaUrl}
                                </p>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <Badge variant="outline" size="sm">
                                    {banner.isDismissible
                                      ? "Dismissible"
                                      : "Pinned"}
                                  </Badge>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="default" size="sm">
                                  CTA Hidden
                                </Badge>
                                <div>
                                  <Badge variant="outline" size="sm">
                                    {banner.isDismissible
                                      ? "Dismissible"
                                      : "Pinned"}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Schedule Window */}
                          <td className="py-3.5 px-4 align-top text-xs">
                            {!banner.startsAt && !banner.endsAt ? (
                              <div className="space-y-1">
                                <span className="font-semibold text-on-surface">
                                  Always Eligible
                                </span>
                                <p className="text-on-surface-variant">
                                  No date restrictions
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div>
                                  <span className="text-on-surface-variant">
                                    Starts:{" "}
                                  </span>
                                  <span className="font-medium text-on-surface">
                                    {banner.startsAt
                                      ? formatDisplayDateTime(
                                          banner.startsAt,
                                          banner.timezone,
                                        )
                                      : "Immediately"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-on-surface-variant">
                                    Ends:{" "}
                                  </span>
                                  <span className="font-medium text-on-surface">
                                    {banner.endsAt
                                      ? formatDisplayDateTime(
                                          banner.endsAt,
                                          banner.timezone,
                                        )
                                      : "No End Date"}
                                  </span>
                                </div>
                                <Badge variant="outline" size="sm">
                                  <Icons.Globe size={10} />
                                  <span>{banner.timezone}</span>
                                </Badge>
                              </div>
                            )}
                          </td>

                          {/* Appearance & Priority */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                              <Badge variant="secondary" size="sm">
                                <Icons.Palette size={11} />
                                <span>{appearanceCfg.label}</span>
                              </Badge>
                              <Badge variant="outline" size="sm">
                                Priority: {banner.priority}
                              </Badge>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 align-top">
                            <div className="flex flex-col items-start gap-1.5">
                              {renderStatusBadge(banner.status)}
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleStatus(banner)}
                                className="text-[11px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
                              >
                                {isToggling
                                  ? "Updating..."
                                  : banner.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(banner)}
                                leftIcon={<Icons.Edit size={13} />}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingBanner(banner)}
                                className="text-error hover:bg-error/10"
                                aria-label={`Delete banner ${banner.title}`}
                              >
                                <Icons.Trash size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-on-surface-variant">
                    Showing page {validCurrentPage} of {totalPages} (
                    {filteredBanners.length} total)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={validCurrentPage <= 1}
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Banner Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => !isSaving && setIsFormModalOpen(false)}
        title={
          formData.id
            ? "Edit Promotional Banner"
            : "Create Promotional Banner"
        }
        description="Configure promotional copy, badge, CTA destination, schedule window, and theme-adaptive styling."
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              onClick={handleSaveBanner}
              leftIcon={<Icons.Save size={14} />}
            >
              {formData.id ? "Save Changes" : "Create Banner"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveBanner} className="space-y-6">
          {/* Live Modal Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Live Theme Preview
            </Label>
            {renderBannerPreviewBar({
              title: formData.title,
              description: formData.description,
              supportingText: formData.supportingText,
              badgeType: formData.badgeType,
              ctaLabel: formData.ctaLabel,
              ctaUrl: formData.ctaUrl,
              showCta: formData.showCta,
              isDismissible: formData.isDismissible,
              appearance: formData.appearance,
            })}
          </div>

          {/* Section 1: Content & Badge */}
          <div className="space-y-4 border-t border-outline-variant/20 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              1. Banner Content & Badge
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="banner-title">
                  Title / Primary Message <span className="text-error">*</span>
                </Label>
                <Input
                  id="banner-title"
                  placeholder="e.g., Get 10 free Adobe Stock assets"
                  value={formData.title}
                  maxLength={200}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="banner-description">
                  Description (Optional)
                </Label>
                <Input
                  id="banner-description"
                  placeholder="e.g., Start your 30-day risk-free creative trial today."
                  value={formData.description}
                  maxLength={500}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-badge-type">Badge Type</Label>
                <select
                  id="banner-badge-type"
                  value={formData.badgeType}
                  onChange={(e) =>
                    handleBadgeTypeChange(e.target.value as BannerBadgeType)
                  }
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors duration-150"
                >
                  {BADGE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-supporting-text">
                  Supporting Details / Promo Code (Optional)
                </Label>
                <Input
                  id="banner-supporting-text"
                  placeholder="e.g., CODE: CREATIVE30 or Ends Tonight"
                  value={formData.supportingText}
                  maxLength={200}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      supportingText: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Section 2: Call-to-Action & Visibility */}
          <div className="space-y-4 border-t border-outline-variant/20 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              2. Call-to-Action (CTA) & Behavior
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Checkbox
                label="Show CTA Button"
                description="Display an interactive call-to-action button on the banner"
                checked={formData.showCta}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    showCta: e.target.checked,
                  }))
                }
              />

              <Checkbox
                label="Allow Visitor Dismissal"
                description="Show a close (×) button so visitors can dismiss this banner"
                checked={formData.isDismissible}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isDismissible: e.target.checked,
                  }))
                }
              />

              {formData.showCta && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="banner-cta-label">
                      CTA Button Label <span className="text-error">*</span>
                    </Label>
                    <Input
                      id="banner-cta-label"
                      placeholder="e.g., Start now"
                      value={formData.ctaLabel}
                      maxLength={80}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ctaLabel: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="banner-cta-url">
                      Destination URL <span className="text-error">*</span>
                    </Label>
                    <Input
                      id="banner-cta-url"
                      placeholder="e.g., /signup or /explore or https://..."
                      value={formData.ctaUrl}
                      maxLength={500}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          ctaUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 3: Scheduling, Priority & Appearance */}
          <div className="space-y-4 border-t border-outline-variant/20 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              3. Scheduling, Priority & Theme Appearance
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="banner-appearance">Theme Appearance</Label>
                <select
                  id="banner-appearance"
                  value={formData.appearance}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      appearance: e.target.value as BannerAppearance,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors duration-150"
                >
                  {APPEARANCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-priority">
                  Display Priority (Higher first)
                </Label>
                <Input
                  id="banner-priority"
                  type="number"
                  min={-1000}
                  max={10000}
                  value={String(formData.priority)}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-timezone">Schedule Timezone</Label>
                <select
                  id="banner-timezone"
                  value={formData.timezone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timezone: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-colors duration-150"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-starts-at">
                  Start Date & Time (Optional)
                </Label>
                <Input
                  id="banner-starts-at"
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startsAt: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="banner-ends-at">
                  End Date & Time (Optional)
                </Label>
                <Input
                  id="banner-ends-at"
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endsAt: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-end pb-1">
                <Checkbox
                  label="Banner Enabled (Active)"
                  description="Show on website when within schedule"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isActive: e.target.checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingBanner)}
        onClose={() => !isDeleting && setDeletingBanner(null)}
        title="Delete Promotional Banner"
        description="This action will permanently remove the banner from the database."
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setDeletingBanner(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleConfirmDelete}
              leftIcon={<Icons.Trash size={14} />}
            >
              Delete Banner
            </Button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Are you sure you want to permanently delete{" "}
          <span className="font-semibold text-on-surface">
            &ldquo;{deletingBanner?.title}&rdquo;
          </span>
          ? It will immediately stop appearing on the marketplace website.
        </p>
      </Modal>
    </div>
  );
};

export default Banner;

