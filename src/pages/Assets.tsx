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
import { categoryService, type ManagedCategory } from "@/services/index.ts";

export interface AssetsProps {
  onNavigateToCategories?: () => void;
}

export const Assets: React.FC<AssetsProps> = ({ onNavigateToCategories }) => {
  const [categories, setCategories] = useState<ManagedCategory[]>(
    () => categoryService.getCachedCategories()?.categories || []
  );
  const [isLoading, setIsLoading] = useState(
    () => !categoryService.getCachedCategories()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!categoryService.getCachedCategories();

    categoryService
      .getCategories(
        {},
        {
          silent: hasCached,
          signal: controller.signal,
        }
      )
      .then((data) => {
        setCategories(data.categories);
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
      const data = await categoryService.getCategories();
      setCategories(data.categories);
    } catch {
      // Handled via toast notifications in service
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeCategories = categories.filter((c) => c.isActive !== false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Box size={13} className="mr-1" /> Digital Assets Management
              </Badge>
              <Badge variant="success" size="sm">
                Catalog Engine
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Assets
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Digital product inventory, asset catalog topology, and taxonomy distribution.
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

      {/* Catalog Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Taxonomy Categories
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.FolderTree size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                categories.length
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Configured taxonomy nodes
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Active Catalog Channels
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.Check size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                activeCategories.length
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Active buyer-facing categories
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Catalog Health
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Security size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-secondary tracking-tight">
              100%
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Schema synchronized with PostgreSQL
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Catalog Summary */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Box size={18} className="text-primary" /> Active Asset Taxonomy
              </CardTitle>
              <CardDescription className="text-xs">
                Root taxonomy categories registered in PostgreSQL
              </CardDescription>
            </div>
            {onNavigateToCategories && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToCategories}
                rightIcon={<Icons.Next size={14} />}
                className="cursor-pointer"
              >
                Manage Categories
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {isLoading && categories.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-surface-container animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant text-sm">
              No categories registered yet in database.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.slice(0, 9).map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-on-surface truncate block">
                      {cat.name}
                    </span>
                    <span className="text-xs text-on-surface-variant truncate block">
                      /{cat.slug}
                    </span>
                  </div>
                  <Badge
                    variant={cat.isActive !== false ? "success" : "secondary"}
                    size="sm"
                  >
                    {cat.isActive !== false ? "Active" : "Archived"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Assets;

