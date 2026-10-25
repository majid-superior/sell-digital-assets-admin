import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce.ts";
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
  Skeleton,
  EmptyState,
  Modal,
} from "@/components/ui/index.ts";
import {
  assetService,
  AssetServiceError,
  type AdminAsset,
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

export const Curation: React.FC = () => {
  // In-memory cache initialization for 0ms tab switching — only curated assets
  const [curatedAssets, setCuratedAssets] = useState<AdminAsset[]>(
    () => assetService.getCachedCuratedAssets()?.assets || []
  );
  const [totalPublishedCount, setTotalPublishedCount] = useState<number>(
    () => assetService.getCachedCounts()?.published || 0
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !assetService.getCachedCuratedAssets()
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters state for curated list
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Categories & Currency
  const [categories, setCategories] = useState<ManagedCategory[]>(
    () => categoryService.getCachedCategories()?.categories || []
  );
  const [currencySymbol, setCurrencySymbol] = useState<string>("$");

  // Mutation in progress tracking
  const [togglingAssetId, setTogglingAssetId] = useState<string | null>(null);

  // Modal State for "Add Assets"
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalCategoryId, setModalCategoryId] = useState<number | null>(null);
  const [modalAssets, setModalAssets] = useState<AdminAsset[]>([]);
  const [isModalLoading, setIsModalLoading] = useState<boolean>(false);

  // Load organization currency
  useEffect(() => {
    let isMounted = true;
    organizationService
      .getOrganization({ silent: true })
      .then((org) => {
        if (!isMounted || !org) return;
        const sym =
          org.currencySymbol || resolveCurrencySymbol(org.defaultCurrency, org.currencySymbol);
        setCurrencySymbol(sym);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Load categories taxonomy if not already cached
  useEffect(() => {
    let isMounted = true;
    if (categories.length === 0) {
      categoryService
        .getCategories({ page: 1, limit: 100 }, { silent: true })
        .then((res) => {
          if (!isMounted) return;
          setCategories(res.categories || []);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [categories.length]);

  // Load ONLY assets marked as curation on page mount
  useEffect(() => {
    let isMounted = true;
    const hasCached = !!assetService.getCachedCuratedAssets();

    assetService
      .getAdminAssets(
        { status: "published", is_curated: true, limit: 100 },
        { silent: hasCached }
      )
      .then((result) => {
        if (!isMounted) return;
        setCuratedAssets(result.assets || []);
        if (result.counts?.published !== undefined) {
          setTotalPublishedCount(result.counts.published);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const message =
          err instanceof AssetServiceError
            ? err.message
            : "Failed to load curated assets from database.";
        toast.error("Data Fetch Error", { description: message });
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Manual refresh button click handler
  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    assetService
      .getAdminAssets(
        { status: "published", is_curated: true, limit: 100 },
        { silent: false }
      )
      .then((result) => {
        setCuratedAssets(result.assets || []);
        if (result.counts?.published !== undefined) {
          setTotalPublishedCount(result.counts.published);
        }
      })
      .catch((err: unknown) => {
        const message =
          err instanceof AssetServiceError
            ? err.message
            : "Failed to load curated assets from database.";
        toast.error("Data Fetch Error", { description: message });
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, []);

  // Listen for background curated updates
  useEffect(() => {
    const handleCuratedUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{
        id: string;
        isCurated: boolean;
        asset?: AdminAsset;
      }>;
      if (customEvent.detail) {
        const { id, isCurated, asset } = customEvent.detail;
        setCuratedAssets((prev) => {
          if (isCurated) {
            if (prev.some((a) => a.id === id)) {
              return prev.map((a) => (a.id === id ? { ...a, is_curated: true } : a));
            }
            if (asset) {
              return [{ ...asset, is_curated: true }, ...prev];
            }
            return prev;
          } else {
            return prev.filter((a) => a.id !== id);
          }
        });

        setModalAssets((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_curated: isCurated } : a))
        );
      }
    };

    window.addEventListener("assets:curated-updated", handleCuratedUpdate);
    return () => {
      window.removeEventListener("assets:curated-updated", handleCuratedUpdate);
    };
  }, []);

  // Active taxonomy categories
  const activeCategories = useMemo(() => {
    return categories.filter((cat) => cat.isActive !== false);
  }, [categories]);

  // Filter curated assets based on search and category
  const filteredCuratedAssets = useMemo(() => {
    return curatedAssets.filter((asset) => {
      // Must be curated
      if (!asset.is_curated) return false;

      // Category filter
      if (selectedCategoryId !== null && asset.category_id !== selectedCategoryId) {
        return false;
      }

      // Search filter
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        const titleMatch = asset.title?.toLowerCase().includes(query);
        const slugMatch = asset.slug?.toLowerCase().includes(query);
        const sellerMatch =
          asset.seller?.name?.toLowerCase().includes(query) ||
          asset.seller?.email?.toLowerCase().includes(query);
        const tagMatch = asset.tags?.some((t) => t.toLowerCase().includes(query));
        if (!titleMatch && !slugMatch && !sellerMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [curatedAssets, selectedCategoryId, debouncedSearchQuery]);

  // Aggregate metrics
  const stats = useMemo(() => {
    const uniqueCategories = new Set(curatedAssets.map((a) => a.category_id)).size;
    return {
      totalCurated: curatedAssets.length,
      totalPublished: totalPublishedCount,
      curatedCategories: uniqueCategories,
    };
  }, [curatedAssets, totalPublishedCount]);

  // Remove curated handler from main table
  const handleRemoveCurate = async (asset: AdminAsset) => {
    setTogglingAssetId(asset.id);

    try {
      await assetService.setCuratedStatus(asset.id, false);

      // Immediately update local curated assets list
      setCuratedAssets((prev) => prev.filter((a) => a.id !== asset.id));

      // Synchronize modal state if open
      setModalAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, is_curated: false } : a))
      );

      toast.success("Removed from Curated", {
        description: `"${asset.title}" has been removed from Curated Collections.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : "Failed to persist curated status to database.";
      toast.error("Curation Update Failed", { description: message });
    } finally {
      setTogglingAssetId(null);
    }
  };

  // Open "Add Assets" modal — start without loading anything
  const handleOpenAddModal = () => {
    setModalCategoryId(null);
    setModalAssets([]);
    setIsModalLoading(false);
    setIsAddModalOpen(true);
  };

  // Close "Add Assets" modal
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setModalCategoryId(null);
    setModalAssets([]);
    setIsModalLoading(false);
  };

  // Category selection inside modal: loads only active and published assets of selected category
  const handleModalCategoryChange = (catId: number | null) => {
    setModalCategoryId(catId);
    if (catId === null) {
      setModalAssets([]);
      setIsModalLoading(false);
      return;
    }

    setIsModalLoading(true);
    setModalAssets([]);

    assetService
      .getAdminAssets(
        { status: "published", categoryId: catId, limit: 100 },
        { silent: false }
      )
      .then((res) => {
        // Load only active and published assets of that category
        const activePublished = (res.assets || []).filter(
          (a) => a.status === "published" && a.is_active !== false
        );
        setModalAssets(activePublished);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof AssetServiceError
            ? err.message
            : "Failed to load assets for the selected category.";
        toast.error("Data Fetch Error", { description: message });
      })
      .finally(() => {
        setIsModalLoading(false);
      });
  };

  // Mark/Unmark curated action within the modal
  const handleModalToggleCurate = async (asset: AdminAsset) => {
    const targetStatus = !asset.is_curated;
    setTogglingAssetId(asset.id);

    try {
      const updatedAsset = await assetService.setCuratedStatus(asset.id, targetStatus);

      // Update local modal list
      setModalAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, is_curated: targetStatus } : a))
      );

      // Update main page curated list
      if (targetStatus) {
        setCuratedAssets((prev) => {
          if (prev.some((a) => a.id === asset.id)) {
            return prev.map((a) => (a.id === asset.id ? { ...a, is_curated: true } : a));
          }
          return [{ ...asset, ...updatedAsset, is_curated: true }, ...prev];
        });
        toast.success("Marked as Curated", {
          description: `"${asset.title}" is now added to Curated Collections.`,
        });
      } else {
        setCuratedAssets((prev) => prev.filter((a) => a.id !== asset.id));
        toast.success("Removed from Curated", {
          description: `"${asset.title}" has been removed from Curated Collections.`,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof AssetServiceError
          ? err.message
          : "Failed to update curated status.";
      toast.error("Curation Update Failed", { description: message });
    } finally {
      setTogglingAssetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Curated Collections
            </h1>
            <Badge variant="primary" size="md" className="flex items-center gap-1 font-bold">
              <Icons.Sparkles size={13} />
              Admin Governance
            </Badge>
          </div>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
            Hand-pick eligible, published creator assets to highlight in the marketplace website&apos;s
            Curated Collections section.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            leftIcon={<Icons.Plus size={15} />}
            className="cursor-pointer"
          >
            Add Assets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isRefreshing}
            leftIcon={<Icons.RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />}
            className="cursor-pointer"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate Metric Cards (Zero Layout Shift) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Active Curated Assets
            </span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icons.Sparkles size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface">
              {stats.totalCurated}
            </span>
            <span className="text-xs text-on-surface-variant">live on homepage</span>
          </div>
        </Card>

        <Card className="p-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Eligible Published Products
            </span>
            <div className="p-2 rounded-lg bg-success/10 text-success">
              <Icons.Assets size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface">
              {stats.totalPublished}
            </span>
            <span className="text-xs text-on-surface-variant">approved by review</span>
          </div>
        </Card>

        <Card className="p-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Categories Represented
            </span>
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
              <Icons.Filter size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-on-surface">
              {stats.curatedCategories}
            </span>
            <span className="text-xs text-on-surface-variant">with curated items</span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar for Curated Assets */}
      <Card className="p-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="primary" size="sm" className="font-semibold">
              Curated Catalog ({filteredCuratedAssets.length})
            </Badge>
            <span className="text-xs text-on-surface-variant hidden sm:inline">
              Manage items currently featured in landing page collections
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search curated assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Icons.Search size={15} />}
                className="w-full text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <Icons.Close size={13} />
                </button>
              )}
            </div>

            <select
              aria-label="Filter by category"
              value={selectedCategoryId !== null ? String(selectedCategoryId) : ""}
              onChange={(e) =>
                setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)
              }
              className="h-10 px-3 py-1.5 text-xs font-medium rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-44 cursor-pointer"
            >
              <option value="">All Categories</option>
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Curated Assets Table Card */}
      <Card className="overflow-hidden border border-outline-variant/30 transition-colors">
        <CardHeader className="border-b border-outline-variant/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-on-surface">
                Curated Collections Showcase
              </CardTitle>
              <CardDescription className="text-xs text-on-surface-variant mt-0.5">
                Showing {filteredCuratedAssets.length} of {stats.totalCurated} curated items
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-outline-variant/20">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton
                      variant="rectangular"
                      width={56}
                      height={42}
                      className="rounded-lg shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton variant="text" width="40%" height={16} />
                      <Skeleton variant="text" width="25%" height={12} />
                    </div>
                  </div>
                  <Skeleton variant="text" width={80} height={20} />
                  <Skeleton
                    variant="rectangular"
                    width={130}
                    height={32}
                    className="rounded-lg shrink-0"
                  />
                </div>
              ))}
            </div>
          ) : filteredCuratedAssets.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Icons.Sparkles size={28} />}
                title={
                  curatedAssets.length === 0
                    ? "No Assets Curated Yet"
                    : "No Matching Curated Assets"
                }
                description={
                  curatedAssets.length === 0
                    ? "Your curated collection is currently empty. Click 'Add Assets' above to select active, published products to feature on the marketplace."
                    : "No curated assets match the selected search query or category filter."
                }
                action={
                  curatedAssets.length === 0 ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenAddModal}
                      leftIcon={<Icons.Plus size={14} />}
                      className="cursor-pointer"
                    >
                      Add Assets
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-high/40 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Creator / Seller</th>
                    <th className="py-3 px-4">Starting Price</th>
                    <th className="py-3 px-4">Curated Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredCuratedAssets.map((asset) => {
                    const thumbMedia = asset.media?.find((m) => m.media_type === "thumbnail");
                    const thumbUrl = thumbMedia?.url || "";
                    const minPrice =
                      asset.tiers && asset.tiers.length > 0
                        ? Math.min(...asset.tiers.map((t) => t.price))
                        : null;
                    const isCurating = togglingAssetId === asset.id;

                    return (
                      <tr
                        key={asset.id}
                        className="hover:bg-surface-container-high/30 transition-colors"
                      >
                        {/* Product Title and Preview */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-10 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/30 flex items-center justify-center">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt={asset.title}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Icons.Assets size={18} className="text-on-surface-variant/40" />
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-sm">
                              <span className="font-bold text-on-surface truncate block text-xs">
                                {asset.title}
                              </span>
                              <span className="text-[11px] text-on-surface-variant/70 truncate block">
                                /{asset.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" size="sm">
                            {asset.category?.name || "General"}
                          </Badge>
                        </td>

                        {/* Seller */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">
                              {asset.seller?.name || "Seller"}
                            </span>
                            <span className="text-[11px] text-on-surface-variant">
                              {asset.seller?.email || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-on-surface">
                          {minPrice !== null
                            ? formatCurrencyAmount(minPrice, currencySymbol)
                            : "—"}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant="primary"
                            size="sm"
                            className="flex items-center gap-1 font-bold"
                          >
                            <Icons.Sparkles size={11} />
                            Curated
                          </Badge>
                        </td>

                        {/* Remove Action Button */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            isLoading={isCurating}
                            disabled={Boolean(togglingAssetId)}
                            onClick={() => handleRemoveCurate(asset)}
                            leftIcon={<Icons.Close size={13} />}
                            className="cursor-pointer"
                          >
                            Remove from Curated
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Assets Popup Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Add Assets to Curated Collections"
        description="Select a category to view active and published products and mark them for curation."
        size="xl"
      >
        <div className="space-y-4">
          {/* Category Dropdown */}
          <div>
            <label
              htmlFor="modal-category-select"
              className="block text-xs font-semibold text-on-surface-variant mb-1.5"
            >
              Select Category
            </label>
            <select
              id="modal-category-select"
              value={modalCategoryId !== null ? String(modalCategoryId) : ""}
              onChange={(e) =>
                handleModalCategoryChange(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full h-10 px-3 py-2 text-xs font-medium rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              <option value="">-- Select a Category --</option>
              {activeCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.path || cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Body Content */}
          {modalCategoryId === null ? (
            <div className="py-10 flex flex-col items-center justify-center text-center px-4 border border-dashed border-outline-variant/30 rounded-xl bg-surface-container-high/10">
              <div className="p-3 rounded-full bg-surface-container-high text-on-surface-variant/70 mb-3">
                <Icons.Filter size={24} />
              </div>
              <p className="text-sm font-semibold text-on-surface">No Category Selected</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Choose a category from the dropdown above to load active and published products available for curation.
              </p>
            </div>
          ) : isModalLoading ? (
            <div className="space-y-2 py-1">
              {Array.from({ length: 3 }, (_, i) => (
                <div
                  key={i}
                  className="p-3 border border-outline-variant/20 rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton
                      variant="rectangular"
                      width={48}
                      height={36}
                      className="rounded-lg shrink-0"
                    />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton variant="text" width="55%" height={14} />
                      <Skeleton variant="text" width="30%" height={11} />
                    </div>
                  </div>
                  <Skeleton
                    variant="rectangular"
                    width={110}
                    height={32}
                    className="rounded-lg shrink-0"
                  />
                </div>
              ))}
            </div>
          ) : modalAssets.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<Icons.Assets size={24} />}
                title="No Published Assets Found"
                description="There are no active and published assets found under this category."
              />
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-outline-variant/20 border border-outline-variant/30 rounded-xl bg-surface-container-low">
              {modalAssets.map((asset) => {
                const thumbMedia = asset.media?.find((m) => m.media_type === "thumbnail");
                const thumbUrl = thumbMedia?.url || "";
                const minPrice =
                  asset.tiers && asset.tiers.length > 0
                    ? Math.min(...asset.tiers.map((t) => t.price))
                    : null;
                const isCurating = togglingAssetId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-surface-container-high/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-surface-container shrink-0 border border-outline-variant/30 flex items-center justify-center">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={asset.title}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icons.Assets size={16} className="text-on-surface-variant/40" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-on-surface truncate block">
                            {asset.title}
                          </span>
                          {asset.is_curated && (
                            <Badge variant="primary" size="sm" className="font-bold shrink-0">
                              Curated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/70 mt-0.5 truncate">
                          <span>{asset.seller?.name || "Seller"}</span>
                          <span>•</span>
                          <span className="font-medium text-on-surface">
                            {minPrice !== null
                              ? formatCurrencyAmount(minPrice, currencySymbol)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={asset.is_curated ? "outline" : "primary"}
                      size="sm"
                      isLoading={isCurating}
                      disabled={Boolean(togglingAssetId)}
                      onClick={() => handleModalToggleCurate(asset)}
                      leftIcon={
                        asset.is_curated ? (
                          <Icons.Close size={13} />
                        ) : (
                          <Icons.Sparkles size={13} />
                        )
                      }
                      className="cursor-pointer shrink-0"
                    >
                      {asset.is_curated ? "Remove from Curated" : "Mark as Curated"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">
              {modalCategoryId !== null && !isModalLoading
                ? `${modalAssets.length} active published asset${modalAssets.length !== 1 ? "s" : ""}`
                : ""}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCloseAddModal}
              className="cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Curation;
