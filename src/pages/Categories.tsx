import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  categoryService,
  CategoryServiceError,
  type ManagedCategory,
} from "@/services/index.ts";

const ITEMS_PER_PAGE = 10;

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Categories: React.FC = () => {
  // In-memory cache initialization (Zero Mock Data Principle)
  const [categories, setCategories] = useState<ManagedCategory[]>(
    () => categoryService.getCachedCategories()?.categories || []
  );
  const [flatParents, setFlatParents] = useState<ManagedCategory[]>(
    () => categoryService.getCachedFlatCategories() || []
  );
  const [isLoading, setIsLoading] = useState(
    () => !categoryService.getCachedCategories()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [hierarchyFilter, setHierarchyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [editingCategory, setEditingCategory] = useState<ManagedCategory | null>(null);
  const [deactivatingCategory, setDeactivatingCategory] = useState<ManagedCategory | null>(null);

  // Form states

  const [editFormData, setEditFormData] = useState<{
    id: number;
    name: string;
    slug: string;
    parentId: number | null;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>({
    id: 0,
    name: "",
    slug: "",
    parentId: null,
    description: "",
    displayOrder: 0,
    isActive: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  // Refresh categories from live REST API
  const refreshCategories = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [res, flatList] = await Promise.all([
        categoryService.getCategories({ page: 1, limit: 1000 }),
        categoryService.getAllCategoriesList(),
      ]);
      setCategories(res.categories);
      setFlatParents(flatList);
    } catch (err: unknown) {
      const message =
        err instanceof CategoryServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Categories", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial data loading with Stale-While-Revalidate caching pattern
  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!categoryService.getCachedCategories();

    Promise.all([
      categoryService.getCategories(
        { page: 1, limit: 1000 },
        { silent: hasCached, signal: controller.signal }
      ),
      categoryService.getAllCategoriesList({
        silent: hasCached,
        signal: controller.signal,
      }),
    ])
      .then(([res, flatList]) => {
        setCategories(res.categories);
        setFlatParents(flatList);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!hasCached) {
          const message =
            err instanceof CategoryServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to connect to the backend server. Please verify the API is running.";
          toast.error("Failed to Load Categories", {
            description: message,
          });
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Top metric computations directly from real database records
  const totalCategories = categories.length;
  const rootCategoriesCount = categories.filter((c) => c.depth === 0).length;
  const subCategoriesCount = categories.filter((c) => c.depth > 0).length;
  const activeCategoriesCount = categories.filter((c) => c.isActive).length;

  // Filtered categories for table display
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        cat.path.toLowerCase().includes(query);

      let matchesHierarchy = true;
      if (hierarchyFilter === "root") {
        matchesHierarchy = cat.depth === 0;
      } else if (hierarchyFilter === "sub") {
        matchesHierarchy = cat.depth > 0;
      }

      let matchesStatus = true;
      if (statusFilter === "active") {
        matchesStatus = cat.isActive;
      } else if (statusFilter === "inactive") {
        matchesStatus = !cat.isActive;
      }

      return matchesSearch && matchesHierarchy && matchesStatus;
    });
  }, [categories, searchQuery, hierarchyFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCategories = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredCategories.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCategories, validCurrentPage]);

  // Open Edit Category Modal
  const handleOpenEdit = (cat: ManagedCategory) => {
    setEditingCategory(cat);
    setEditFormData({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      description: cat.description || "",
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
  };

  // Open Deactivate Confirmation Modal
  const handleOpenDeactivate = (cat: ManagedCategory) => {
    setDeactivatingCategory(cat);
  };

  // Save Edit Category to backend server
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = editFormData.name.trim();
    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "Category name is required.",
      });
      return;
    }

    const slug = editFormData.slug?.trim() || generateSlug(trimmedName);

    setIsSaving(true);
    try {
      const updated = await categoryService.updateCategory(editFormData.id, {
        name: trimmedName,
        slug,
        parentId: editFormData.parentId,
        description: editFormData.description?.trim() || null,
        displayOrder: Number(editFormData.displayOrder) || 0,
        isActive: editFormData.isActive,
      });

      if (updated?.id) {
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setFlatParents((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );

        toast.success("Category Updated", {
          description: `Category "${updated.name}" has been updated on the backend server.`,
        });

        setEditingCategory(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof CategoryServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update category on backend server.";
      toast.error("Update Failed", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm Soft-Delete (set is_active = FALSE) on backend server
  const handleConfirmDeactivate = async () => {
    if (!deactivatingCategory) return;

    setIsDeactivating(true);
    try {
      await categoryService.deleteCategory(deactivatingCategory.id);

      setCategories((prev) =>
        prev.map((c) =>
          c.id === deactivatingCategory.id ? { ...c, isActive: false } : c
        )
      );
      setFlatParents((prev) =>
        prev.map((c) =>
          c.id === deactivatingCategory.id ? { ...c, isActive: false } : c
        )
      );

      toast.success("Category Deactivated", {
        description: `Category "${deactivatingCategory.name}" is now set to inactive (is_active: false).`,
      });

      setDeactivatingCategory(null);
    } catch (err: unknown) {
      const message =
        err instanceof CategoryServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to deactivate category on backend server.";
      toast.error("Deactivation Failed", {
        description: message,
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Reactivate / Restore soft-deleted category (set is_active = TRUE)
  const handleRestoreCategory = async (cat: ManagedCategory) => {
    setActionInProgressId(cat.id);
    try {
      await categoryService.restoreCategory(cat.id);

      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: true } : c))
      );
      setFlatParents((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: true } : c))
      );

      toast.success("Category Reactivated", {
        description: `Category "${cat.name}" has been restored to active status.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof CategoryServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to reactivate category on backend server.";
      toast.error("Reactivation Failed", {
        description: message,
      });
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.FolderTree size={13} className="mr-1" /> Category Taxonomy
              </Badge>
              <Badge variant="success" size="sm">
                PostgreSQL Live
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Category Management
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Browse, create, edit, and soft-delete marketplace digital asset categories with full hierarchical tree support.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshCategories}
              disabled={isLoading || isRefreshing}
              leftIcon={
                isRefreshing ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.Performance size={14} />
                )
              }
              className="cursor-pointer"
            >
              {isRefreshing ? "Syncing..." : "Sync Server"}
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Categories */}
        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150 hover:border-primary/40">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Total Categories
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.FolderTree size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && categories.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalCategories
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Total digital taxonomy nodes
            </p>
          </CardContent>
        </Card>

        {/* 2. Root Categories */}
        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150 hover:border-primary/40">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Root Categories
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Layers size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && categories.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                rootCategoriesCount
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Top-level marketplace sections (Depth 0)
            </p>
          </CardContent>
        </Card>

        {/* 3. Subcategories */}
        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150 hover:border-primary/40">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Subcategories
              </span>
              <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/20">
                <Icons.Folder size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && categories.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                subCategoriesCount
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Nested sub-classifications (Depth 1+)
            </p>
          </CardContent>
        </Card>

        {/* 4. Active Categories */}
        <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150 hover:border-primary/40">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Active Categories
              </span>
              <div className="p-2 rounded-lg bg-success/10 text-success border border-success/20">
                <Icons.Verified size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && categories.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                activeCategoriesCount
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Active marketplace taxonomy (is_active: true)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Categories Card */}
      <Card className="rounded-xl border border-outline-variant/30 bg-surface-container-low text-on-surface shadow-xs transition-colors duration-150">
        <CardHeader className="p-5 pb-4 border-b border-outline-variant/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">Categories Directory</CardTitle>
              <CardDescription className="text-xs text-on-surface-variant mt-0.5">
                Browse hierarchical paths, inspect slugs, modify records, and soft-delete categories.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-full sm:w-64">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, slug, path..."
                  leftIcon={<Icons.Search size={15} />}
                  className="py-1.5 text-xs"
                />
              </div>

              {/* Hierarchy filter */}
              <select
                value={hierarchyFilter}
                onChange={(e) => {
                  setHierarchyFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label="Filter by hierarchy level"
              >
                <option value="all">All Levels</option>
                <option value="root">Root Categories (Depth 0)</option>
                <option value="sub">Subcategories (Depth 1+)</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive (Soft-Deleted)</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Zero Layout Shift Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container/50 border-b border-outline-variant/20 text-xs uppercase font-semibold text-on-surface-variant tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Category Name & Slug
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Hierarchy Path
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Parent Category
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Display Order
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/20">
                {isLoading && categories.length === 0 ? (
                  // Full Geometric Skeleton Rows (CLS = 0)
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          <div className="h-4 w-36 bg-surface-container-high animate-pulse rounded" />
                          <div className="h-3 w-24 bg-surface-container-high animate-pulse rounded" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-44 bg-surface-container-high animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-28 bg-surface-container-high animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-12 bg-surface-container-high animate-pulse rounded" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-6 w-16 bg-surface-container-high animate-pulse rounded-full" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                          <div className="h-8 w-16 bg-surface-container-high animate-pulse rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginatedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-on-surface-variant">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Icons.FolderTree size={36} className="text-on-surface-variant/40" />
                        <span className="font-semibold text-base">No categories found</span>
                        <p className="text-xs text-on-surface-variant max-w-sm">
                          {searchQuery
                            ? `No categories matching "${searchQuery}". Try adjusting your filters.`
                            : "No categories match the active filters."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCategories.map((cat) => {
                    const isRoot = cat.depth === 0;

                    return (
                      <tr
                        key={cat.id}
                        className={`hover:bg-surface-container/30 transition-colors ${
                          !cat.isActive ? "opacity-75 bg-surface-container-lowest/50" : ""
                        }`}
                      >
                        {/* 1. Name & Slug */}
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                isRoot
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}
                            >
                              {isRoot ? (
                                <Icons.Layers size={16} />
                              ) : (
                                <Icons.Folder size={16} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-on-surface truncate">
                                  {cat.name}
                                </span>
                                {isRoot && (
                                  <Badge variant="outline" size="sm" className="text-[10px] px-1.5 py-0">
                                    Root
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs font-mono text-on-surface-variant block truncate mt-0.5">
                                /{cat.slug}
                              </span>
                              {cat.description && (
                                <p className="text-xs text-on-surface-variant/80 truncate max-w-xs mt-1">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Path & Depth */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className="text-xs text-on-surface font-medium block truncate max-w-xs">
                              {cat.path}
                            </span>
                            <Badge
                              variant="secondary"
                              size="sm"
                              className="text-[10px] font-mono"
                            >
                              Depth: {cat.depth}
                            </Badge>
                          </div>
                        </td>

                        {/* 3. Parent Category */}
                        <td className="px-5 py-4">
                          {cat.parentName ? (
                            <span className="text-xs text-on-surface font-medium">
                              {cat.parentName}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant/60 italic">
                              — None (Root) —
                            </span>
                          )}
                        </td>

                        {/* 4. Display Order */}
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-on-surface font-semibold px-2 py-0.5 rounded bg-surface-container-high">
                            {cat.displayOrder}
                          </span>
                        </td>

                        {/* 5. Status */}
                        <td className="px-5 py-4">
                          {cat.isActive ? (
                            <Badge variant="success" size="sm">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" size="sm" className="text-amber-500 border-amber-500/30">
                              Inactive (Soft-Deleted)
                            </Badge>
                          )}
                        </td>

                        {/* 6. Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(cat)}
                              leftIcon={<Icons.Pencil size={13} />}
                              className="cursor-pointer text-xs py-1 px-2.5 h-8"
                            >
                              Edit
                            </Button>

                            {/* Delete / Soft-Delete (set false) or Restore Button */}
                            {cat.isActive ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleOpenDeactivate(cat)}
                                leftIcon={<Icons.Trash size={13} />}
                                className="cursor-pointer text-xs py-1 px-2.5 h-8"
                              >
                                Delete
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreCategory(cat)}
                                disabled={actionInProgressId === cat.id}
                                leftIcon={
                                  actionInProgressId === cat.id ? (
                                    <Spinner size="sm" color="primary" />
                                  ) : (
                                    <Icons.RotateCcw size={13} className="text-success" />
                                  )
                                }
                                className="cursor-pointer text-xs py-1 px-2.5 h-8 text-success hover:bg-success/10"
                              >
                                Restore
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredCategories.length > ITEMS_PER_PAGE && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-outline-variant/20 bg-surface-container-lowest/50">
              <span className="text-xs text-on-surface-variant">
                Showing{" "}
                <span className="font-semibold text-on-surface">
                  {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-on-surface">
                  {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredCategories.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-on-surface">
                  {filteredCategories.length}
                </span>{" "}
                categories
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage <= 1}
                  leftIcon={<Icons.Back size={14} />}
                  className="cursor-pointer text-xs"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    // Show pages near current page
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - validCurrentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                            pageNum === validCurrentPage
                              ? "bg-primary text-on-primary font-bold shadow-xs"
                              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (
                      (pageNum === 2 && validCurrentPage > 3) ||
                      (pageNum === totalPages - 1 && validCurrentPage < totalPages - 2)
                    ) {
                      return (
                        <span key={pageNum} className="text-xs text-on-surface-variant px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage >= totalPages}
                  rightIcon={<Icons.Next size={14} />}
                  className="cursor-pointer text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* 1. EDIT CATEGORY MODAL                                        */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(editingCategory)}
        onClose={() => !isSaving && setEditingCategory(null)}
        title={
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Icons.Pencil size={18} />
            </div>
            <span>Edit Category</span>
          </div>
        }
        description={`Update attributes, slugs, and hierarchical parent for category #${editFormData.id}.`}
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingCategory(null)}
              disabled={isSaving}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isSaving}
              leftIcon={
                isSaving ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Save size={14} />
                )
              }
              className="cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {/* Category ID & Current Path Info */}
          <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase text-on-surface-variant">
                Category ID
              </span>
              <p className="font-mono text-sm font-bold text-on-surface">
                #{editFormData.id}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase text-on-surface-variant">
                Hierarchy Depth
              </span>
              <p className="font-mono text-sm font-bold text-on-surface">
                Depth {editingCategory?.depth ?? 0}
              </p>
            </div>
          </div>

          {/* Category Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" required>
              Category Name
            </Label>
            <Input
              id="edit-name"
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
            />
          </div>

          {/* URL Slug */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-slug">URL Slug</Label>
            <Input
              id="edit-slug"
              value={editFormData.slug}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              className="font-mono text-xs"
            />
          </div>

          {/* Parent Category Selection (Excludes Self) */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-parent">Parent Category</Label>
            <select
              id="edit-parent"
              value={editFormData.parentId === null ? "" : String(editFormData.parentId)}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  parentId: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
            >
              <option value="">— None (Root Category / Depth 0) —</option>
              {flatParents
                // Exclude self from parent options to prevent cyclical references
                .filter((p) => p.id !== editFormData.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {"—".repeat(p.depth)} {p.name} ({p.path})
                  </option>
                ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc">Description</Label>
            <textarea
              id="edit-desc"
              rows={3}
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>

          {/* Display Order & Active Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="edit-order">Display Order</Label>
              <Input
                id="edit-order"
                type="number"
                min={0}
                value={editFormData.displayOrder}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5 flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editFormData.isActive}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  className="rounded border-outline-variant/40 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span className="text-sm font-medium text-on-surface">
                  Active (is_active = TRUE)
                </span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* ------------------------------------------------------------- */}
      {/* 3. SOFT-DELETE (SET FALSE) CONFIRMATION MODAL                 */}
      {/* ------------------------------------------------------------- */}
      <Modal
        isOpen={Boolean(deactivatingCategory)}
        onClose={() => !isDeactivating && setDeactivatingCategory(null)}
        title={
          <div className="flex items-center gap-2 text-error">
            <Icons.Trash size={18} />
            <span>Deactivate Category</span>
          </div>
        }
        description={`Set category "${deactivatingCategory?.name}" to inactive (is_active: false).`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeactivatingCategory(null)}
              disabled={isDeactivating}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDeactivate}
              disabled={isDeactivating}
              leftIcon={
                isDeactivating ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Trash size={14} />
                )
              }
              className="cursor-pointer"
            >
              {isDeactivating ? "Deactivating..." : "Deactivate (Set False)"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            Are you sure you want to delete / deactivate{" "}
            <strong className="text-on-surface">{deactivatingCategory?.name}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 text-xs space-y-1">
            <div className="font-semibold text-on-surface flex items-center gap-1.5">
              <Icons.Security size={14} className="text-primary" />
              Architectural Soft-Delete Policy:
            </div>
            <p>
              Physical deletion of category records is strictly prohibited. This action will toggle{" "}
              <code className="text-primary font-mono font-bold">is_active = FALSE</code> on the PostgreSQL database record.
            </p>
            <p>
              Its hierarchical paths, breadcrumbs, and digital asset relations will remain intact, and can be restored at any time.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Categories;
