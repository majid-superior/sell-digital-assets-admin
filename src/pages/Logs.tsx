import React, { useState, useEffect, useMemo } from "react";
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
  EmptyState,
} from "@/components/ui/index.ts";
import {
  logService,
  LogServiceError,
  type LogEntry,
  type LogStats,
  type LogSeverity,
  type LogCategory,
  type LogOutcome,
  type LogQueryParams,
} from "@/services/index.ts";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type DatePreset = "all" | "24h" | "7d" | "30d";

export const Logs: React.FC = () => {
  // In-memory cache initialization for 0ms tab switching (Universal Loading Pattern)
  const cached = logService.getCachedLogs();

  const [logs, setLogs] = useState<LogEntry[]>(() => cached?.logs || []);
  const [stats, setStats] = useState<LogStats | null>(() => cached?.stats || null);
  const [totalLogs, setTotalLogs] = useState<number>(() => cached?.pagination.total || 0);
  const [totalPages, setTotalPages] = useState<number>(() => cached?.pagination.totalPages || 1);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cached);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 350);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal inspection states
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [retentionDaysInput, setRetentionDaysInput] = useState(90);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculate start/end dates from active preset
  const dateRange = useMemo<{ startDate?: string; endDate?: string }>(() => {
    if (datePreset === "all") return {};
    const now = new Date();
    const start = new Date();
    switch (datePreset) {
      case "24h":
        start.setHours(now.getHours() - 24);
        break;
      case "7d":
        start.setDate(now.getDate() - 7);
        break;
      case "30d":
        start.setDate(now.getDate() - 30);
        break;
    }
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [datePreset]);

  // Re-fetch when filters or pagination changes (conforming to SWR and React 19 purity)
  useEffect(() => {
    let isSubscribed = true;
    const hasCached = !!logService.getCachedLogs();

    const params: LogQueryParams = {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      severity: severityFilter !== "all" ? severityFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      outcome: outcomeFilter !== "all" ? outcomeFilter : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      sortBy: "created_at",
      sortOrder,
    };

    logService
      .getLogs(params, { silent: hasCached })
      .then((response) => {
        if (!isSubscribed) return;
        setLogs(response.logs);
        setStats(response.stats);
        setTotalLogs(response.pagination.total);
        setTotalPages(response.pagination.totalPages);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isSubscribed) return;
        setIsLoading(false);
        if (!hasCached) {
          const message =
            err instanceof LogServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to load audit logs from backend server.";
          toast.error("Failed to Retrieve Logs", { description: message });
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [
    currentPage,
    pageSize,
    debouncedSearch,
    severityFilter,
    categoryFilter,
    outcomeFilter,
    dateRange,
    sortOrder,
  ]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const params: LogQueryParams = {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      severity: severityFilter !== "all" ? severityFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
      outcome: outcomeFilter !== "all" ? outcomeFilter : undefined,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      sortBy: "created_at",
      sortOrder,
    };
    try {
      const response = await logService.getLogs(params, { silent: true });
      setLogs(response.logs);
      setStats(response.stats);
      setTotalLogs(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      toast.success("Logs Synchronized", {
        description: "Audit trail refreshed from live database.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof LogServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to sync audit logs.";
      toast.error("Sync Failed", { description: message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSeverityFilter("all");
    setCategoryFilter("all");
    setOutcomeFilter("all");
    setDatePreset("all");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    severityFilter !== "all" ||
    categoryFilter !== "all" ||
    outcomeFilter !== "all" ||
    datePreset !== "all" ||
    sortOrder !== "desc";

  // Retention cleanup
  const handleExecuteCleanup = async () => {
    if (retentionDaysInput < 7) {
      toast.error("Invalid Retention Period", {
        description: "Retention safety policy mandates keeping at least 7 days of audit records.",
      });
      return;
    }

    setIsCleaningUp(true);
    try {
      const result = await logService.cleanupLogs(retentionDaysInput);
      toast.success("Retention Purge Complete", {
        description: `Successfully cleaned up ${result.deletedCount} log records older than ${retentionDaysInput} days.`,
      });
      setIsCleanupModalOpen(false);
      handleRefresh();
    } catch (err: unknown) {
      const message =
        err instanceof LogServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to purge audit records.";
      toast.error("Retention Purge Failed", { description: message });
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    if (!text || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to Clipboard", { description: key });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Badge helpers
  const getSeverityBadge = (severity: LogSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <Badge variant="error" size="sm" className="font-bold uppercase tracking-wider bg-error/20 border-error/40 text-error">
            Critical
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error" size="sm" className="font-bold uppercase tracking-wider">
            Error
          </Badge>
        );
      case "warn":
        return (
          <Badge variant="warning" size="sm" className="font-bold uppercase tracking-wider">
            Warning
          </Badge>
        );
      case "info":
        return (
          <Badge variant="primary" size="sm" className="font-semibold uppercase tracking-wider">
            Info
          </Badge>
        );
      case "debug":
      default:
        return (
          <Badge variant="default" size="sm" className="font-medium uppercase tracking-wider">
            Debug
          </Badge>
        );
    }
  };

  const getOutcomeBadge = (outcome: LogOutcome) => {
    switch (outcome) {
      case "success":
        return (
          <Badge variant="success" size="sm">
            <Icons.Success size={11} className="mr-1" /> Success
          </Badge>
        );
      case "denied":
        return (
          <Badge variant="warning" size="sm">
            <Icons.Lock size={11} className="mr-1" /> Denied
          </Badge>
        );
      case "failure":
        return (
          <Badge variant="warning" size="sm">
            <Icons.AlertCircle size={11} className="mr-1" /> Failure
          </Badge>
        );
      case "error":
      default:
        return (
          <Badge variant="error" size="sm">
            <Icons.XCircle size={11} className="mr-1" /> Error
          </Badge>
        );
    }
  };

  const getCategoryBadge = (category: LogCategory) => {
    switch (category) {
      case "auth":
        return (
          <Badge variant="primary" size="sm">
            <Icons.User size={11} className="mr-1" /> Auth
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="secondary" size="sm">
            <Icons.Settings size={11} className="mr-1" /> Admin
          </Badge>
        );
      case "security":
        return (
          <Badge variant="warning" size="sm">
            <Icons.Security size={11} className="mr-1" /> Security
          </Badge>
        );
      case "error":
        return (
          <Badge variant="error" size="sm">
            <Icons.ServerError size={11} className="mr-1" /> App Error
          </Badge>
        );
      case "system":
      default:
        return (
          <Badge variant="default" size="sm">
            <Icons.Performance size={11} className="mr-1" /> System
          </Badge>
        );
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatDateParts = (isoString: string) => {
    if (!isoString) return { date: "—", time: "" };
    try {
      const d = new Date(isoString);
      const date = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const time = d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      return { date, time };
    } catch {
      return { date: isoString, time: "" };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.ScrollText size={13} className="mr-1" /> Audit Observability
              </Badge>
              <Badge variant="success" size="sm">
                PostgreSQL Engine
              </Badge>
              <Badge variant="outline" size="sm">
                Real-Time Telemetry
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              System & Audit Logs
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Immutable audit trails, administrative mutations, security authentications, and platform telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCleanupModalOpen(true)}
              leftIcon={<Icons.Trash size={14} />}
              className="cursor-pointer"
            >
              Retention Policy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              leftIcon={
                isRefreshing ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.RefreshCw size={14} />
                )
              }
              className="cursor-pointer"
            >
              {isRefreshing ? "Syncing..." : "Sync Logs"}
            </Button>
          </div>
        </div>
      </div>

      {/* Top 4 Telemetry Stat Cards (Zero CLS layout structure) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Logs */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Total Logs
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.ScrollText size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && !stats ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                stats?.total.toLocaleString() ?? totalLogs.toLocaleString()
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1 truncate">
              Persisted audit records
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Errors & Exceptions */}
        <Card className="hover:border-error/40 transition-colors">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Errors & Critical
              </span>
              <div className="p-2 rounded-lg bg-error/10 text-error border border-error/20">
                <Icons.ServerError size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-error tracking-tight">
              {isLoading && !stats ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                stats?.errorCount.toLocaleString() ?? 0
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1 truncate">
              Application & server errors
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Security & Auth Events */}
        <Card className="hover:border-warning/40 transition-colors">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Security & Auth
              </span>
              <div className="p-2 rounded-lg bg-warning/10 text-warning border border-warning/20">
                <Icons.Security size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && !stats ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                ((stats?.authCount ?? 0) + (stats?.securityCount ?? 0)).toLocaleString()
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1 truncate">
              Sign-ins, lockouts & permissions
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Administrative Actions */}
        <Card className="hover:border-secondary/40 transition-colors">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Admin Mutations
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Settings size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && !stats ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                stats?.adminCount.toLocaleString() ?? 0
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1 truncate">
              Operator CRUD operations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Data Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6 border-b border-outline-variant/20">
          <div className="space-y-4">
            {/* Top row: Search input & Date Range Presets */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="relative flex-1 min-w-0 max-w-xl">
                <Icons.Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 pointer-events-none"
                />
                <Input
                  type="text"
                  placeholder="Search logs by action, actor, message, resource ID, or correlation ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-9 text-xs sm:text-sm h-10 w-full"
                  aria-label="Search logs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface p-0.5 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <Icons.Close size={14} />
                  </button>
                )}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                <span className="text-xs font-semibold text-on-surface-variant/70 mr-1 shrink-0 flex items-center gap-1">
                  <Icons.Clock size={13} /> Time:
                </span>
                {(
                  [
                    { id: "all", label: "All Time" },
                    { id: "24h", label: "Last 24h" },
                    { id: "7d", label: "Last 7d" },
                    { id: "30d", label: "Last 30d" },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setDatePreset(preset.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors cursor-pointer shrink-0 ${
                      datePreset === preset.id
                        ? "bg-primary text-on-primary shadow-xs"
                        : "bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: Dropdown filters & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Severity Dropdown */}
                <select
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-32"
                  aria-label="Filter by severity"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="error">Error</option>
                  <option value="warn">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>

                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-36"
                  aria-label="Filter by category"
                >
                  <option value="all">All Categories</option>
                  <option value="auth">Authentication</option>
                  <option value="admin">Admin Actions</option>
                  <option value="security">Security</option>
                  <option value="error">Application Errors</option>
                  <option value="system">System Events</option>
                </select>

                {/* Outcome Dropdown */}
                <select
                  value={outcomeFilter}
                  onChange={(e) => {
                    setOutcomeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-32"
                  aria-label="Filter by outcome"
                >
                  <option value="all">All Outcomes</option>
                  <option value="success">Success</option>
                  <option value="failure">Failure</option>
                  <option value="denied">Denied</option>
                  <option value="error">Error</option>
                </select>

                {/* Sort Order */}
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as "desc" | "asc");
                    setCurrentPage(1);
                  }}
                  className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  aria-label="Sort order"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>

              {/* Reset button if filters active */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  leftIcon={<Icons.RotateCcw size={13} />}
                  className="text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            /* Dimensional loading state with zero layout shift */
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Spinner size="lg" color="primary" />
              <p className="text-sm font-medium">Loading audit logs from PostgreSQL...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 px-4">
              <EmptyState
                icon={<Icons.ScrollText size={32} />}
                title={hasActiveFilters ? "No Matching Logs" : "No Logs Recorded Yet"}
                description={
                  hasActiveFilters
                    ? "No log entries match your current search and filter criteria. Try broadening your filters."
                    : "Administrative actions, authentications, and system exceptions will be permanently recorded here."
                }
                action={
                  hasActiveFilters ? (
                    <Button variant="primary" size="sm" onClick={handleResetFilters}>
                      Clear All Filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Responsive Accessible Table conforming to modern-web-guidance (responsive-table) */}
              <div
                tabIndex={0}
                role="region"
                aria-label="System and Audit Logs"
                className="overflow-x-auto w-full overscroll-x-contain"
              >
                <table className="w-full text-left text-sm border-collapse">
                  <caption className="sr-only">Platform Audit and System Logs Table</caption>
                  <thead className="sticky top-0 z-10 bg-surface-container-high/90 backdrop-blur-xs border-b border-outline-variant/30 text-[11px] uppercase font-semibold text-on-surface-variant tracking-wider">
                    <tr>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Timestamp
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Severity
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Category & Action
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Actor
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Resource
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 min-w-64">
                        Summary
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        Outcome
                      </th>
                      <th scope="col" className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15 text-xs sm:text-sm">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="hover:bg-surface-container/50 transition-colors cursor-pointer group"
                      >
                        {/* Timestamp */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-on-surface-variant font-mono text-[11px]">
                          {(() => {
                            const { date, time } = formatDateParts(log.created_at);
                            return (
                              <>
                                <div className="font-semibold text-on-surface">{date}</div>
                                <div className="text-[10px] text-on-surface-variant/70 font-mono">{time}</div>
                              </>
                            );
                          })()}
                        </td>

                        {/* Severity */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Category & Action */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            {getCategoryBadge(log.category)}
                            <span className="font-mono text-[11px] font-semibold text-on-surface">
                              {log.action}
                            </span>
                          </div>
                        </td>

                        {/* Actor */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          {log.actor_email ? (
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-on-surface truncate max-w-44">
                                {log.actor_email}
                              </span>
                              {log.actor_role && (
                                <span className="text-[10px] text-on-surface-variant/70 uppercase tracking-wide">
                                  {log.actor_role}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-on-surface-variant/60 italic text-[11px]">System</span>
                          )}
                        </td>

                        {/* Resource */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap font-mono text-[11px] text-on-surface-variant">
                          {log.target_type ? (
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-on-surface">{log.target_type}:</span>
                              <span className="truncate max-w-28 text-on-surface-variant/80" title={log.target_id || ""}>
                                {log.target_id || "—"}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Message Summary */}
                        <td className="px-3 sm:px-4 py-3 min-w-64 max-w-xs md:max-w-md">
                          <p className="truncate text-on-surface font-medium" title={log.message}>
                            {log.message}
                          </p>
                          {log.request_id && (
                            <span className="text-[10px] font-mono text-on-surface-variant/50">
                              req: {log.request_id.slice(0, 13)}...
                            </span>
                          )}
                        </td>

                        {/* Outcome */}
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          {getOutcomeBadge(log.outcome)}
                        </td>

                        {/* Row Action */}
                        <td className="px-3 sm:px-4 py-3 text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="text-xs h-7.5 px-2.5 opacity-90 group-hover:opacity-100 cursor-pointer"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="border-t border-outline-variant/20 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                  <span>
                    Showing{" "}
                    <strong className="text-on-surface">
                      {totalLogs === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                    </strong>{" "}
                    to{" "}
                    <strong className="text-on-surface">
                      {Math.min(currentPage * pageSize, totalLogs)}
                    </strong>{" "}
                    of <strong className="text-on-surface">{totalLogs.toLocaleString()}</strong> logs
                  </span>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1.5 ml-3">
                    <span className="text-on-surface-variant/70">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded border border-outline-variant/30 bg-surface px-2 py-1 text-xs font-medium text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || isLoading}
                    leftIcon={<Icons.Back size={13} />}
                    className="cursor-pointer"
                  >
                    Previous
                  </Button>
                  <span className="px-2.5 py-1 rounded bg-surface-container-high text-xs font-semibold text-on-surface">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
                    rightIcon={<Icons.Next size={13} />}
                    className="cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Log Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-extrabold text-base sm:text-lg text-on-surface">
                Log Details
              </span>
              {getSeverityBadge(selectedLog.severity)}
              {getOutcomeBadge(selectedLog.outcome)}
              {getCategoryBadge(selectedLog.category)}
            </div>
          }
          description="Detailed audit event record with sanitized telemetry and execution context."
          size="xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-[11px] font-mono text-on-surface-variant/60 truncate max-w-xs">
                Log ID: {selectedLog.id}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="cursor-pointer"
              >
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto overscroll-contain pr-1">
            {/* Safe Summary Message Card */}
            <div className="p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-high/40">
              <div className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70 mb-1">
                Event Summary
              </div>
              <p className="text-sm font-semibold text-on-surface leading-relaxed">
                {selectedLog.message}
              </p>
            </div>

            {/* Core Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Timestamp */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="text-[11px] font-medium text-on-surface-variant">Timestamp</div>
                <div className="font-mono font-medium text-on-surface">
                  {formatDate(selectedLog.created_at)}
                </div>
                <div className="text-[10px] text-on-surface-variant/60 font-mono">
                  {selectedLog.created_at}
                </div>
              </div>

              {/* Action & Source */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="text-[11px] font-medium text-on-surface-variant">Action & Module</div>
                <div className="font-mono font-bold text-primary">
                  {selectedLog.action}
                </div>
                <div className="text-[10px] text-on-surface-variant/70">
                  Source: <span className="font-mono">{selectedLog.source}</span>
                </div>
              </div>

              {/* Correlation / Request ID */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-on-surface-variant">Correlation Request ID</span>
                  {selectedLog.request_id && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.request_id || "", "Request ID")}
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      title="Copy Request ID"
                    >
                      <Icons.Copy size={12} />
                      {copiedKey === "Request ID" ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                <div className="font-mono text-on-surface break-all text-[11px]">
                  {selectedLog.request_id || "—"}
                </div>
              </div>

              {/* Actor Identity */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="text-[11px] font-medium text-on-surface-variant">Actor</div>
                <div className="font-semibold text-on-surface truncate">
                  {selectedLog.actor_email || "System / Anonymous"}
                </div>
                <div className="text-[10px] text-on-surface-variant/70 flex items-center gap-2">
                  <span>Role: <strong>{selectedLog.actor_role || "—"}</strong></span>
                  {selectedLog.actor_id && (
                    <span className="font-mono text-on-surface-variant/50 truncate">
                      ID: {selectedLog.actor_id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              </div>

              {/* Target Resource */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="text-[11px] font-medium text-on-surface-variant">Target Resource</div>
                <div className="font-semibold text-on-surface">
                  {selectedLog.target_type ? selectedLog.target_type.toUpperCase() : "—"}
                </div>
                <div className="font-mono text-[11px] text-on-surface-variant/80 break-all">
                  {selectedLog.target_id || "—"}
                </div>
              </div>

              {/* Client Network Context */}
              <div className="p-3 rounded-lg border border-outline-variant/20 bg-surface-container-lowest dark:bg-surface-container-low space-y-1">
                <div className="text-[11px] font-medium text-on-surface-variant">Client IP & User Agent</div>
                <div className="font-mono text-on-surface text-[11px]">
                  IP: {selectedLog.ip_address || "—"}
                </div>
                <div
                  className="text-[10px] text-on-surface-variant/70 truncate"
                  title={selectedLog.user_agent || ""}
                >
                  {selectedLog.user_agent || "—"}
                </div>
              </div>
            </div>

            {/* Structured Metadata Inspector */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                    Structured Context Metadata
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(selectedLog.metadata, null, 2),
                        "Metadata JSON",
                      )
                    }
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icons.Copy size={12} />
                    {copiedKey === "Metadata JSON" ? "Copied" : "Copy JSON"}
                  </button>
                </div>
                <pre className="p-3 rounded-lg border border-outline-variant/25 bg-surface-container-lowest dark:bg-surface-container-high/60 text-on-surface font-mono text-[11px] overflow-x-auto max-h-48 overscroll-contain">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Stack Trace (if present for server exceptions) */}
            {selectedLog.stack_trace && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-error">
                    Exception Stack Trace
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(selectedLog.stack_trace || "", "Stack Trace")
                    }
                    className="text-xs text-error hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Icons.Copy size={12} />
                    {copiedKey === "Stack Trace" ? "Copied" : "Copy Stack"}
                  </button>
                </div>
                <pre className="p-3 rounded-lg border border-error/30 bg-error/5 text-error font-mono text-[11px] overflow-x-auto max-h-56 overscroll-contain whitespace-pre-wrap break-all">
                  {selectedLog.stack_trace}
                </pre>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Retention Policy Cleanup Dialog */}
      <Modal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
        title="Audit Logs Retention Purge"
        description="Permanently delete historical audit log records to optimize database storage."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCleanupModalOpen(false)}
              disabled={isCleaningUp}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExecuteCleanup}
              disabled={isCleaningUp}
              leftIcon={
                isCleaningUp ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Trash size={14} />
                )
              }
            >
              {isCleaningUp ? "Purging..." : "Purge Old Logs"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-on-surface-variant">
          <p>
            Choose the retention threshold. Any audit record older than the specified number of days will be permanently removed.
          </p>

          <div className="space-y-1.5">
            <label htmlFor="retentionDays" className="text-xs font-semibold text-on-surface">
              Retention Window (Days)
            </label>
            <Input
              id="retentionDays"
              type="number"
              min={7}
              max={365}
              value={retentionDaysInput}
              onChange={(e) => setRetentionDaysInput(Math.max(7, Number(e.target.value)))}
              className="w-full text-sm font-mono"
            />
            <p className="text-[11px] text-on-surface-variant/70">
              Minimum retention period is strictly <strong>7 days</strong> to ensure audit compliance.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export const AuditLogs = Logs;
export default Logs;
