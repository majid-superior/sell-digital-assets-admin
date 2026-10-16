import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce.ts";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  Input,
  Modal,
  Spinner,
  Skeleton,
  EmptyState,
} from "@/components/ui/index.ts";
import {
  assetService,
  AssetServiceError,
  formatFileSizeBytes,
  type AdminAsset,
  type AssetCounts,
} from "@/services/assetService.ts";
import {
  categoryService,
  type ManagedCategory,
} from "@/services/categoryService.ts";
import {
  organizationService,
  formatCurrencyAmount,
  resolveCurrencySymbol,
} from "@/services/organizationService.ts";

export interface AssetsProps {
  onNavigateToCategories?: () => void;
}

const ITEMS_PER_PAGE = 10;

export const Assets: React.FC<AssetsProps> = ({ onNavigateToCategories }) => {
  // In-memory cache initialization for 0ms tab switching
  const [assets, setAssets] = useState<AdminAsset[]>(
    () => assetService.getCachedAssets()?.assets || []
  );
  const [counts, setCounts] = useState<AssetCounts>(
    () =>
      assetService.getCachedCounts() ||
      assetService.getCachedAssets()?.counts || {
        total: 0,
        pending: 0,
        published: 0,
        rejected: 0,
        needsUpdate: 0,
        draft: 0,
      }
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !assetService.getCachedAssets()
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters and pagination state
  const [activeStatusTab, setActiveStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalAssets, setTotalAssets] = useState<number>(
    () => assetService.getCachedAssets()?.total || 0
  );
  const [totalPages, setTotalPages] = useState<number>(
    () => assetService.getCachedAssets()?.totalPages || 1
  );

  // Dropdown data & Currency
  const [categories, setCategories] = useState<ManagedCategory[]>(
    () => categoryService.getCachedCategories()?.categories || []
  );
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  // Review modal state (Admin checking assets one by one)
  const [reviewingAsset, setReviewingAsset] = useState<AdminAsset | null>(null);
  const [reviewTab, setReviewTab] = useState<"overview" | "deliverables" | "pricing" | "media" | "specs">("overview");

  // Approval confirmation modal
  const [approvingAsset, setApprovingAsset] = useState<AdminAsset | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Rejection modal
  const [rejectingAsset, setRejectingAsset] = useState<AdminAsset | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Request updates modal
  const [updatingAsset, setUpdatingAsset] = useState<AdminAsset | null>(null);
  const [needsUpdateFeedback, setNeedsUpdateFeedback] = useState<string>("");
  const [isRequestingUpdate, setIsRequestingUpdate] = useState<boolean>(false);

  // Fetch currency info dynamically from PostgreSQL
  useEffect(() => {
    let mounted = true;
    organizationService
      .getOrganization({ silent: true })
      .then((org) => {
        if (mounted && org) {
          const symbol = org.currencySymbol || resolveCurrencySymbol(org.defaultCurrency, org.currencySymbol);
          setCurrencySymbol(symbol);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch categories for category filter
  useEffect(() => {
    let mounted = true;
    if (!categoryService.getCachedCategories()) {
      categoryService
        .getCategories({ page: 1, limit: 100 }, { silent: true })
        .then((res) => {
          if (mounted) setCategories(res.categories);
        })
        .catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  // Background revalidation on mount / filter change
  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!assetService.getCachedAssets();

    assetService
      .getAdminAssets(
        {
          status: activeStatusTab === "all" ? undefined : activeStatusTab,
          categoryId: selectedCategoryId ?? undefined,
          search: debouncedSearchQuery.trim() || undefined,
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        },
        { silent: hasCached, signal: controller.signal }
      )
      .then((result) => {
        setAssets(result.assets);
        setCounts(result.counts);
        setTotalAssets(result.total);
        setTotalPages(result.totalPages);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!hasCached) {
          const message =
            err instanceof AssetServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to load assets from server.";
          toast.error("Failed to Load Assets", { description: message });
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [activeStatusTab, selectedCategoryId, debouncedSearchQuery, currentPage]);

  // Manual refresh action with TopProgressBar
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await assetService.getAdminAssets({
        status: activeStatusTab === "all" ? undefined : activeStatusTab,
        categoryId: selectedCategoryId ?? undefined,
        search: debouncedSearchQuery.trim() || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setAssets(result.assets);
      setCounts(result.counts);
      setTotalAssets(result.total);
      setTotalPages(result.totalPages);
      toast.success("Assets Refreshed", {
        description: "Asset review catalog and counters synchronized with PostgreSQL.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to load assets from server.";
      toast.error("Failed to Load Assets", { description: message });
    } finally {
      setIsRefreshing(false);
    }
  }, [activeStatusTab, selectedCategoryId, debouncedSearchQuery, currentPage]);

  // Queue of pending assets for "one by one" inspection
  const pendingQueue = useMemo(() => {
    return assets.filter((a) => a.status === "pending");
  }, [assets]);

  const currentReviewIndex = useMemo(() => {
    if (!reviewingAsset) return -1;
    if (reviewingAsset.status === "pending") {
      return pendingQueue.findIndex((a) => a.id === reviewingAsset.id);
    }
    return assets.findIndex((a) => a.id === reviewingAsset.id);
  }, [reviewingAsset, pendingQueue, assets]);

  const currentQueueList = useMemo(() => {
    if (reviewingAsset?.status === "pending") {
      return pendingQueue;
    }
    return assets;
  }, [reviewingAsset, pendingQueue, assets]);

  const handleNavigateReview = (direction: "prev" | "next") => {
    if (currentReviewIndex === -1) return;
    const nextIdx =
      direction === "next"
        ? Math.min(currentQueueList.length - 1, currentReviewIndex + 1)
        : Math.max(0, currentReviewIndex - 1);
    const nextAsset = currentQueueList[nextIdx];
    if (nextAsset) {
      setReviewingAsset(nextAsset);
      setReviewTab("overview");
    }
  };

  // --------------------------------------------------------------------------
  // ADMIN GOVERNANCE ACTIONS (Approve, Reject, Needs Update)
  // --------------------------------------------------------------------------

  // APPROVE ASSET
  const handleConfirmApproval = async () => {
    if (!approvingAsset) return;
    setIsApproving(true);

    try {
      await assetService.reviewAsset(approvingAsset.id, {
        action: "approve",
      });

      toast.success("Asset Approved & Live! 🎉", {
        description: `"${approvingAsset.title}" is now published and immediately available on the marketplace for buyers to purchase.`,
      });

      // Update state locally
      setAssets((prev) =>
        prev.map((a) => (a.id === approvingAsset.id ? { ...a, status: "published", admin_feedback: null } : a))
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        published: prev.published + 1,
      }));

      // If currently reviewing this asset in the inspection modal
      if (reviewingAsset?.id === approvingAsset.id) {
        setReviewingAsset({ ...reviewingAsset, status: "published", admin_feedback: null });
        // Check if there is another pending asset in the queue to inspect next!
        const remainingPending = pendingQueue.filter((a) => a.id !== approvingAsset.id);
        if (remainingPending.length > 0) {
          const nextPending = remainingPending[0];
          setTimeout(() => {
            setReviewingAsset(nextPending);
            setReviewTab("overview");
          }, 300);
        } else {
          setReviewingAsset(null);
        }
      }

      setApprovingAsset(null);
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to approve asset.";
      toast.error("Approval Failed", { description: message });
    } finally {
      setIsApproving(false);
    }
  };

  // REJECT ASSET
  const handleConfirmRejection = async () => {
    if (!rejectingAsset) return;
    if (rejectionFeedback.trim().length < 5) {
      toast.error("Feedback Required", {
        description: "Please provide a clear rejection explanation of at least 5 characters for the seller.",
      });
      return;
    }

    setIsRejecting(true);

    try {
      await assetService.reviewAsset(rejectingAsset.id, {
        action: "reject",
        feedback: rejectionFeedback.trim(),
      });

      toast.success("Asset Submission Rejected", {
        description: `Rejection notice and feedback sent directly to seller (${rejectingAsset.seller?.email || "seller"}).`,
      });

      // Update state locally
      setAssets((prev) =>
        prev.map((a) =>
          a.id === rejectingAsset.id
            ? { ...a, status: "rejected", admin_feedback: rejectionFeedback.trim() }
            : a
        )
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        rejected: prev.rejected + 1,
      }));

      // If currently reviewing this asset in the modal
      if (reviewingAsset?.id === rejectingAsset.id) {
        setReviewingAsset({
          ...reviewingAsset,
          status: "rejected",
          admin_feedback: rejectionFeedback.trim(),
        });
        const remainingPending = pendingQueue.filter((a) => a.id !== rejectingAsset.id);
        if (remainingPending.length > 0) {
          const nextPending = remainingPending[0];
          setTimeout(() => {
            setReviewingAsset(nextPending);
            setReviewTab("overview");
          }, 300);
        } else {
          setReviewingAsset(null);
        }
      }

      setRejectingAsset(null);
      setRejectionFeedback("");
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to reject asset.";
      toast.error("Rejection Failed", { description: message });
    } finally {
      setIsRejecting(false);
    }
  };

  // REQUEST UPDATES / CHANGES
  const handleConfirmRequestUpdate = async () => {
    if (!updatingAsset) return;
    if (needsUpdateFeedback.trim().length < 5) {
      toast.error("Feedback Required", {
        description: "Please specify what revisions or updates the seller needs to make (minimum 5 characters).",
      });
      return;
    }

    setIsRequestingUpdate(true);

    try {
      await assetService.reviewAsset(updatingAsset.id, {
        action: "needs_update",
        feedback: needsUpdateFeedback.trim(),
      });

      toast.success("Revision Request Dispatched", {
        description: `Feedback sent to ${updatingAsset.seller?.email || "seller"}. The asset is marked as needing update.`,
      });

      setAssets((prev) =>
        prev.map((a) =>
          a.id === updatingAsset.id
            ? { ...a, status: "needs_update", admin_feedback: needsUpdateFeedback.trim() }
            : a
        )
      );
      setCounts((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        needsUpdate: prev.needsUpdate + 1,
      }));

      if (reviewingAsset?.id === updatingAsset.id) {
        setReviewingAsset({
          ...reviewingAsset,
          status: "needs_update",
          admin_feedback: needsUpdateFeedback.trim(),
        });
        const remainingPending = pendingQueue.filter((a) => a.id !== updatingAsset.id);
        if (remainingPending.length > 0) {
          const nextPending = remainingPending[0];
          setTimeout(() => {
            setReviewingAsset(nextPending);
            setReviewTab("overview");
          }, 300);
        } else {
          setReviewingAsset(null);
        }
      }

      setUpdatingAsset(null);
      setNeedsUpdateFeedback("");
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to request updates.";
      toast.error("Request Failed", { description: message });
    } finally {
      setIsRequestingUpdate(false);
    }
  };

  // Helper status badge renderer
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" className="gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Review
          </Badge>
        );
      case "published":
        return (
          <Badge variant="success" className="gap-1 font-semibold">
            <Icons.Check size={12} />
            Live / Published
          </Badge>
        );
      case "needs_update":
        return (
          <Badge variant="secondary" className="gap-1 font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20">
            <Icons.AlertCircle size={12} />
            Needs Update
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="error" className="gap-1 font-semibold">
            <Icons.XCircle size={12} />
            Rejected
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="default" className="gap-1">
            <Icons.Pencil size={11} />
            Draft
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Assets & Review Queue
            </h1>
            {counts.pending > 0 && (
              <Badge variant="warning" className="px-2.5 py-0.5 text-xs font-bold gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {counts.pending} New Submission{counts.pending === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
            Review digital assets submitted by sellers, inspect payloads and pricing, approve them to publish live on the marketplace, or reject with direct feedback.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateToCategories && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icons.FolderTree size={16} />}
              onClick={onNavigateToCategories}
            >
              Manage Categories
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            leftIcon={
              isRefreshing ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Icons.RefreshCw size={15} />
              )
            }
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            aria-label="Refresh Assets"
          >
            {isRefreshing ? "Syncing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* 2. Counter Cards (Zero CLS Fixed Geometry) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Pending Review Counter */}
        <Card
          className={`cursor-pointer transition-colors duration-150 ${
            activeStatusTab === "pending"
              ? "ring-2 ring-amber-500/50 bg-amber-500/5"
              : "hover:border-amber-500/40"
          }`}
          onClick={() => {
            setActiveStatusTab("pending");
            setCurrentPage(1);
          }}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                Pending Review
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Icons.Clock size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-on-surface">
                {counts.pending}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Awaiting approval for marketplace
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Published / Live Counter */}
        <Card
          className={`cursor-pointer transition-colors duration-150 ${
            activeStatusTab === "published"
              ? "ring-2 ring-emerald-500/50 bg-emerald-500/5"
              : "hover:border-emerald-500/40"
          }`}
          onClick={() => {
            setActiveStatusTab("published");
            setCurrentPage(1);
          }}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                Live on Marketplace
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Icons.Success size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-on-surface">
                {counts.published}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Active for buyers to purchase
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Needs Update Counter */}
        <Card
          className={`cursor-pointer transition-colors duration-150 ${
            activeStatusTab === "needs_update"
              ? "ring-2 ring-orange-500/50 bg-orange-500/5"
              : "hover:border-orange-500/40"
          }`}
          onClick={() => {
            setActiveStatusTab("needs_update");
            setCurrentPage(1);
          }}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-orange-600 dark:text-orange-400">
                Needs Update
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                <Icons.AlertCircle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-on-surface">
                {counts.needsUpdate}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Awaiting seller revisions
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Rejected Counter */}
        <Card
          className={`cursor-pointer transition-colors duration-150 ${
            activeStatusTab === "rejected"
              ? "ring-2 ring-error/50 bg-error/5"
              : "hover:border-error/40"
          }`}
          onClick={() => {
            setActiveStatusTab("rejected");
            setCurrentPage(1);
          }}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-error">
                Rejected
              </span>
              <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center">
                <Icons.XCircle size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-on-surface">
                {counts.rejected}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Submissions declined with feedback
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Total Catalog Assets */}
        <Card
          className={`cursor-pointer transition-colors duration-150 ${
            activeStatusTab === "all"
              ? "ring-2 ring-primary/50 bg-primary/5"
              : "hover:border-primary/40"
          }`}
          onClick={() => {
            setActiveStatusTab("all");
            setCurrentPage(1);
          }}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-primary">
                Total Catalog
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Icons.Layers size={18} />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-on-surface">
                {counts.total}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                All registered digital assets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Tabs, Search & Category Filter */}
      <Card>
        <CardHeader className="pb-3 border-b border-outline-variant/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tab navigation pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab("all");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeStatusTab === "all"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All ({counts.total})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab("pending");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeStatusTab === "pending"
                    ? "bg-amber-500 text-white font-semibold shadow-xs"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                }`}
              >
                <span>Pending Review</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    activeStatusTab === "pending"
                      ? "bg-black/20 text-white"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {counts.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab("published");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeStatusTab === "published"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Live ({counts.published})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab("needs_update");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeStatusTab === "needs_update"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Needs Update ({counts.needsUpdate})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveStatusTab("rejected");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeStatusTab === "rejected"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Rejected ({counts.rejected})
              </button>
            </div>

            {/* Search and Category Filter Dropdown */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative min-w-[240px]">
                <Input
                  type="text"
                  placeholder="Search assets, slug, seller..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  leftIcon={<Icons.Search size={16} />}
                  className="w-full text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear Search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface cursor-pointer text-xs"
                  >
                    <Icons.Close size={14} />
                  </button>
                )}
              </div>

              <select
                value={selectedCategoryId ?? ""}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value ? Number(e.target.value) : null);
                  setCurrentPage(1);
                }}
                className="h-10 px-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-on-surface text-xs font-medium focus:border-primary focus:outline-none transition-colors cursor-pointer"
                aria-label="Filter by Category"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.path || c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>

        {/* 4. Asset Table */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Icons.Box size={32} />}
                title={
                  activeStatusTab === "pending"
                    ? "No Pending Submissions"
                    : searchQuery || selectedCategoryId
                    ? "No Matching Assets Found"
                    : "No Assets Found"
                }
                description={
                  activeStatusTab === "pending"
                    ? "All seller asset submissions have been reviewed! When sellers submit new assets, they will appear here in the review queue."
                    : searchQuery || selectedCategoryId
                    ? "Try adjusting your search keywords or clearing the category filter."
                    : "No digital assets found in the database catalog."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-high/20 text-xs font-semibold tracking-wider text-on-surface-variant uppercase">
                    <th className="py-3.5 px-4 sm:px-6">Digital Asset</th>
                    <th className="py-3.5 px-4">Seller</th>
                    <th className="py-3.5 px-4">Pricing Tiers</th>
                    <th className="py-3.5 px-4">Deliverable Payload</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Review Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15 text-sm text-on-surface">
                  {assets.map((asset) => {
                    const primaryFile = asset.files?.[0];
                    const thumbnailMedia = asset.media?.find(
                      (m) => m.media_type === "thumbnail"
                    );

                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-surface-container-high/40 transition-colors duration-150"
                      >
                        {/* Column 1: Asset Details */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg border border-outline-variant/30 bg-surface-container-high flex items-center justify-center shrink-0 overflow-hidden">
                              {thumbnailMedia?.url ? (
                                <img
                                  src={thumbnailMedia.url}
                                  alt={asset.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Icons.Box size={22} className="text-on-surface-variant/70" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-sm">
                              <div className="font-semibold text-on-surface truncate">
                                {asset.title}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-primary font-medium truncate">
                                  {asset.category?.name || "General"}
                                </span>
                                <span className="text-xs text-on-surface-variant/50">•</span>
                                <span className="text-xs text-on-surface-variant font-mono truncate">
                                  /{asset.slug}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Seller */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-on-surface truncate">
                              {asset.seller?.name || "—"}
                            </span>
                            <span className="text-xs text-on-surface-variant truncate">
                              {asset.seller?.email || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Column 3: Pricing Tiers */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1 text-xs">
                            {asset.tiers && asset.tiers.length > 0 ? (
                              asset.tiers.map((t) => (
                                <div key={t.id || t.tier_type} className="flex items-center gap-1.5">
                                  <span className="capitalize text-on-surface-variant font-medium">
                                    {t.tier_type}:
                                  </span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrencyAmount(t.price, currencySymbol)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </div>
                        </td>

                        {/* Column 4: Deliverable Payload */}
                        <td className="py-4 px-4">
                          {primaryFile ? (
                            <div className="flex flex-col text-xs">
                              <div className="flex items-center gap-1 font-medium text-on-surface truncate max-w-[180px]">
                                <Icons.FileText size={13} className="text-primary shrink-0" />
                                <span className="truncate">{primaryFile.file_name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-on-surface-variant mt-0.5">
                                <span>v{primaryFile.version}</span>
                                <span>•</span>
                                <span>{formatFileSizeBytes(primaryFile.file_size_bytes)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-error flex items-center gap-1">
                              <Icons.AlertCircle size={13} />
                              No Payload Attached
                            </span>
                          )}
                        </td>

                        {/* Column 5: Status */}
                        <td className="py-4 px-4">
                          {renderStatusBadge(asset.status)}
                          {asset.admin_feedback && asset.status === "rejected" && (
                            <div className="text-[11px] text-error mt-1 max-w-[150px] truncate" title={asset.admin_feedback}>
                              Reason: {asset.admin_feedback}
                            </div>
                          )}
                        </td>

                        {/* Column 6: Submitted Date */}
                        <td className="py-4 px-4 text-xs text-on-surface-variant whitespace-nowrap">
                          {asset.submitted_at || asset.created_at
                            ? new Date(asset.submitted_at || asset.created_at).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>

                        {/* Column 7: Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Icons.Eye size={14} />}
                              onClick={() => {
                                setReviewingAsset(asset);
                                setReviewTab("overview");
                              }}
                              className="cursor-pointer"
                            >
                              Review
                            </Button>

                            {/* Quick Approval / Rejection buttons for Pending Assets */}
                            {asset.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setApprovingAsset(asset)}
                                  aria-label={`Approve ${asset.title}`}
                                  title="Approve & Publish to Marketplace"
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/20"
                                >
                                  <Icons.Check size={16} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingAsset(asset);
                                    setRejectionFeedback("");
                                  }}
                                  aria-label={`Reject ${asset.title}`}
                                  title="Reject Submission"
                                  className="w-8 h-8 rounded-lg bg-error/10 hover:bg-error/20 text-error flex items-center justify-center transition-colors cursor-pointer border border-error/20"
                                >
                                  <Icons.Close size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Pagination */}
          {totalAssets > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between p-4 px-6 border-t border-outline-variant/20 bg-surface-container-high/10 text-xs">
              <span className="text-on-surface-variant">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, totalAssets)} of{" "}
                {totalAssets} assets
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="px-2 font-medium text-on-surface">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          5. "CHECK THEM ONE BY ONE" DETAILED REVIEW MODAL
      ========================================================================= */}
      {reviewingAsset && (
        <Modal
          isOpen={!!reviewingAsset}
          onClose={() => setReviewingAsset(null)}
          size="xl"
          className="max-w-4xl"
          title={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="truncate">{reviewingAsset.title}</span>
                {renderStatusBadge(reviewingAsset.status)}
              </div>

              {/* One-by-One Queue Stepper Header */}
              {currentQueueList.length > 1 && (
                <div className="flex items-center gap-2 text-xs font-normal text-on-surface-variant shrink-0">
                  <span>
                    Asset {currentReviewIndex + 1} of {currentQueueList.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentReviewIndex <= 0}
                      onClick={() => handleNavigateReview("prev")}
                      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Previous Asset"
                    >
                      <Icons.ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      disabled={currentReviewIndex >= currentQueueList.length - 1}
                      onClick={() => handleNavigateReview("next")}
                      className="p-1 rounded hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="Next Asset"
                    >
                      <Icons.ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          }
          description={
            <span>
              Submitted by <strong>{reviewingAsset.seller?.name || "Seller"}</strong> (
              {reviewingAsset.seller?.email || "—"}) in <strong>{reviewingAsset.category?.name || "General"}</strong>
            </span>
          }
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              {/* Stepper buttons in footer */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                {currentQueueList.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Icons.ChevronLeft size={14} />}
                      disabled={currentReviewIndex <= 0}
                      onClick={() => handleNavigateReview("prev")}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      rightIcon={<Icons.ChevronRight size={14} />}
                      disabled={currentReviewIndex >= currentQueueList.length - 1}
                      onClick={() => handleNavigateReview("next")}
                    >
                      Next
                    </Button>
                  </>
                )}
              </div>

              {/* Action governance buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingAsset(null)}
                >
                  Close
                </Button>

                {reviewingAsset.status !== "rejected" && (
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Icons.XCircle size={14} />}
                    onClick={() => {
                      setRejectingAsset(reviewingAsset);
                      setRejectionFeedback("");
                    }}
                  >
                    Reject Asset
                  </Button>
                )}

                {reviewingAsset.status !== "needs_update" && reviewingAsset.status !== "published" && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Icons.AlertCircle size={14} />}
                    onClick={() => {
                      setUpdatingAsset(reviewingAsset);
                      setNeedsUpdateFeedback("");
                    }}
                  >
                    Request Updates
                  </Button>
                )}

                {reviewingAsset.status !== "published" && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Icons.Check size={14} />}
                    disabled={!reviewingAsset.files || reviewingAsset.files.length === 0}
                    onClick={() => setApprovingAsset(reviewingAsset)}
                  >
                    Approve & Publish to Marketplace
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Status Alert Banner */}
            {reviewingAsset.status === "pending" && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-3">
                <Icons.Clock size={18} className="shrink-0" />
                <div>
                  <span className="font-semibold">Awaiting Administrator Review:</span>{" "}
                  Inspect deliverables, pricing tiers, and descriptions. Approving will publish this asset directly onto the public marketplace for buyers. Rejecting will notify the seller with your feedback.
                </div>
              </div>
            )}

            {reviewingAsset.status === "published" && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-3">
                <Icons.Success size={18} className="shrink-0" />
                <div>
                  <span className="font-semibold">Live on Marketplace:</span> This asset has been approved and is available for buyers.
                </div>
              </div>
            )}

            {reviewingAsset.status === "rejected" && reviewingAsset.admin_feedback && (
              <div className="p-3.5 rounded-xl border border-error/30 bg-error/10 text-error text-xs flex items-start gap-3">
                <Icons.XCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Rejection Feedback Dispatched to Seller:</span>
                  <p className="mt-1 font-mono text-[11px] bg-black/10 dark:bg-white/10 p-2 rounded-lg">
                    {reviewingAsset.admin_feedback}
                  </p>
                </div>
              </div>
            )}

            {reviewingAsset.status === "needs_update" && reviewingAsset.admin_feedback && (
              <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs flex items-start gap-3">
                <Icons.AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Revision Notes Sent to Seller:</span>
                  <p className="mt-1 font-mono text-[11px] bg-black/10 dark:bg-white/10 p-2 rounded-lg">
                    {reviewingAsset.admin_feedback}
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Tabs Navigation in Modal */}
            <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => setReviewTab("overview")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  reviewTab === "overview"
                    ? "bg-primary text-on-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Overview & Description
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("deliverables")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reviewTab === "deliverables"
                    ? "bg-primary text-on-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span>Deliverable Files</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-[10px]">
                  {reviewingAsset.files?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("pricing")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reviewTab === "pricing"
                    ? "bg-primary text-on-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span>Pricing Tiers</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-[10px]">
                  {reviewingAsset.tiers?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("media")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  reviewTab === "media"
                    ? "bg-primary text-on-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span>Media & Previews</span>
                <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-[10px]">
                  {reviewingAsset.media?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setReviewTab("specs")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  reviewTab === "specs"
                    ? "bg-primary text-on-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Specs & Tags
              </button>
            </div>

            {/* TAB CONTENT: 1. Overview */}
            {reviewTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-outline-variant/30 bg-surface-container-high/20 space-y-1">
                    <span className="text-on-surface-variant font-medium">Category</span>
                    <div className="font-semibold text-on-surface text-sm">
                      {reviewingAsset.category?.name || "General"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-outline-variant/30 bg-surface-container-high/20 space-y-1">
                    <span className="text-on-surface-variant font-medium">Marketplace Slug</span>
                    <div className="font-mono text-on-surface text-sm truncate">
                      /{reviewingAsset.slug}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Short Description
                  </h4>
                  <div className="p-3 rounded-lg border border-outline-variant/30 bg-surface-container-high/10 text-sm text-on-surface">
                    {reviewingAsset.short_description || "—"}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                    Full Product Description
                  </h4>
                  <div className="p-4 rounded-lg border border-outline-variant/30 bg-surface-container-lowest/50 text-sm text-on-surface leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {reviewingAsset.full_description || "—"}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 2. Deliverable Files */}
            {reviewTab === "deliverables" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Payload Package Deliverables
                  </h4>
                  <span className="text-xs text-on-surface-variant">
                    Required for marketplace download fulfillment
                  </span>
                </div>

                {reviewingAsset.files && reviewingAsset.files.length > 0 ? (
                  <div className="space-y-3">
                    {reviewingAsset.files.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-high/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icons.FileText size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-on-surface">
                              {file.file_name}
                            </div>
                            <div className="text-on-surface-variant flex items-center gap-2 mt-0.5">
                              <span>Version: v{file.version}</span>
                              <span>•</span>
                              <span>Size: {formatFileSizeBytes(file.file_size_bytes)}</span>
                              <span>•</span>
                              <span>Uploaded: {new Date(file.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.is_active ? (
                            <Badge variant="success" size="sm">
                              Active Payload
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-error/30 bg-error/5 text-center space-y-2">
                    <Icons.AlertCircle size={28} className="mx-auto text-error" />
                    <div className="font-semibold text-sm text-error">
                      Missing Deliverable Payload File
                    </div>
                    <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                      This asset cannot be approved because the seller has not uploaded an active deliverable file payload. You can request updates or reject the submission.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 3. Pricing Tiers */}
            {reviewTab === "pricing" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    Commercial License Pricing
                  </h4>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Live Currency: {currencySymbol}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {reviewingAsset.tiers?.map((tier) => (
                    <div
                      key={tier.id || tier.tier_type}
                      className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-high/20 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="capitalize font-bold text-sm text-on-surface">
                            {tier.tier_type}
                          </span>
                          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrencyAmount(tier.price, currencySymbol)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                          {tier.license_terms_summary || "Standard marketplace terms apply."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. Media Gallery */}
            {reviewTab === "media" && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Screenshots & Media Gallery
                </h4>

                {reviewingAsset.media && reviewingAsset.media.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviewingAsset.media.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border border-outline-variant/30 overflow-hidden bg-surface-container-high"
                      >
                        <div className="aspect-video w-full flex items-center justify-center bg-black/5 overflow-hidden">
                          <img
                            src={m.url}
                            alt="Asset media preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="p-2.5 px-3.5 flex items-center justify-between text-xs text-on-surface-variant border-t border-outline-variant/20">
                          <span className="capitalize font-medium">{m.media_type}</span>
                          <span>Order #{m.display_order}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-outline-variant/30 text-center text-xs text-on-surface-variant">
                    No preview media files uploaded for this asset.
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 5. Technical Specs & Tags */}
            {reviewTab === "specs" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Marketplace Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewingAsset.tags && reviewingAsset.tags.length > 0 ? (
                      reviewingAsset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" size="sm">
                          #{tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-on-surface-variant">—</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                    Technical Specifications
                  </h4>
                  {reviewingAsset.technical_specs &&
                  Object.keys(reviewingAsset.technical_specs).length > 0 ? (
                    <div className="rounded-xl border border-outline-variant/30 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <tbody className="divide-y divide-outline-variant/20">
                          {Object.entries(reviewingAsset.technical_specs).map(([k, v]) => (
                            <tr key={k}>
                              <td className="p-2.5 px-4 font-semibold text-on-surface-variant bg-surface-container-high/30 w-1/3">
                                {k}
                              </td>
                              <td className="p-2.5 px-4 text-on-surface font-mono">
                                {String(v)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-on-surface-variant">—</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* =========================================================================
          6. APPROVAL CONFIRMATION MODAL
      ========================================================================= */}
      {approvingAsset && (
        <Modal
          isOpen={!!approvingAsset}
          onClose={() => setApprovingAsset(null)}
          size="md"
          title="Approve & Publish Asset"
          description="Make this asset discoverable and purchasable on the public marketplace."
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingAsset(null)}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={isApproving ? <Spinner size="sm" color="white" /> : <Icons.Check size={14} />}
                onClick={handleConfirmApproval}
                disabled={isApproving}
              >
                {isApproving ? "Approving..." : "Confirm & Publish"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-on-surface">
            <p>
              Are you sure you want to approve <strong>"{approvingAsset.title}"</strong>?
            </p>
            <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <Icons.Success size={15} />
                Marketplace Release Confirmation
              </div>
              <ul className="list-disc list-inside space-y-1 text-on-surface-variant">
                <li>Asset status transitions to <strong>Published</strong>.</li>
                <li>Immediately live on marketplace catalog for buyers to buy.</li>
                <li>
                  Automated notification dispatched to seller (<strong>{approvingAsset.seller?.email || "seller"}</strong>).
                </li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          7. REJECTION MODAL WITH DIRECT SELLER NOTIFICATION
      ========================================================================= */}
      {rejectingAsset && (
        <Modal
          isOpen={!!rejectingAsset}
          onClose={() => setRejectingAsset(null)}
          size="md"
          title="Reject Asset Submission"
          description={`Explain why "${rejectingAsset.title}" is being rejected. This feedback will be sent directly to ${rejectingAsset.seller?.email || "the seller"}.`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingAsset(null)}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={isRejecting ? <Spinner size="sm" color="white" /> : <Icons.XCircle size={14} />}
                onClick={handleConfirmRejection}
                disabled={isRejecting || rejectionFeedback.trim().length < 5}
              >
                {isRejecting ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-on-surface">
            <div>
              <label htmlFor="rejection-feedback" className="block text-xs font-semibold text-on-surface mb-1">
                Rejection Reason / Feedback <span className="text-error">*</span>
              </label>
              <textarea
                id="rejection-feedback"
                rows={4}
                value={rejectionFeedback}
                onChange={(e) => setRejectionFeedback(e.target.value)}
                placeholder="e.g., Deliverable archive is damaged or missing required assets. Please review marketplace documentation before re-submitting."
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-high/20 p-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-error focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
                <span>Minimum 5 characters required</span>
                <span className={rejectionFeedback.length < 5 ? "text-error" : "text-emerald-600 dark:text-emerald-400"}>
                  {rejectionFeedback.length} characters
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-error/20 bg-error/5 text-xs text-error">
              The seller will receive a notification stating their submission was rejected along with your explanation.
            </div>
          </div>
        </Modal>
      )}

      {/* =========================================================================
          8. REQUEST UPDATES / REVISIONS MODAL
      ========================================================================= */}
      {updatingAsset && (
        <Modal
          isOpen={!!updatingAsset}
          onClose={() => setUpdatingAsset(null)}
          size="md"
          title="Request Revisions from Seller"
          description={`Ask ${updatingAsset.seller?.email || "the seller"} to make adjustments to "${updatingAsset.title}" before re-submitting.`}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUpdatingAsset(null)}
                disabled={isRequestingUpdate}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={isRequestingUpdate ? <Spinner size="sm" color="white" /> : <Icons.Send size={14} />}
                onClick={handleConfirmRequestUpdate}
                disabled={isRequestingUpdate || needsUpdateFeedback.trim().length < 5}
              >
                {isRequestingUpdate ? "Sending..." : "Send Revision Notes"}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-sm text-on-surface">
            <div>
              <label htmlFor="update-feedback" className="block text-xs font-semibold text-on-surface mb-1">
                Required Changes / Instructions <span className="text-primary">*</span>
              </label>
              <textarea
                id="update-feedback"
                rows={4}
                value={needsUpdateFeedback}
                onChange={(e) => setNeedsUpdateFeedback(e.target.value)}
                placeholder="e.g., Please add at least 2 high-resolution screenshots and clarify the extended license terms in the description."
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-high/20 p-3 text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
              />
              <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-1">
                <span>Minimum 5 characters required</span>
                <span className={needsUpdateFeedback.length < 5 ? "text-primary" : "text-emerald-600 dark:text-emerald-400"}>
                  {needsUpdateFeedback.length} characters
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-primary">
              The asset status will transition to "Needs Update" and the seller will receive an update request notification.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Assets;
