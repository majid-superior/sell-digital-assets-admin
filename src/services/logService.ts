import { apiRequest, ApiError } from "./apiClient.ts";

export type LogSeverity = "debug" | "info" | "warn" | "error" | "critical";
export type LogCategory = "auth" | "admin" | "security" | "system" | "error";
export type LogOutcome = "success" | "failure" | "denied" | "error";

export interface LogEntry {
  id: string;
  created_at: string;
  severity: LogSeverity;
  category: LogCategory;
  action: string;
  source: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  target_id: string | null;
  target_type: string | null;
  outcome: LogOutcome;
  message: string;
  request_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  stack_trace: string | null;
}

export interface LogStats {
  total: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  authCount: number;
  adminCount: number;
  securityCount: number;
}

export interface LogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LogsResponse {
  logs: LogEntry[];
  pagination: LogPagination;
  stats: LogStats;
}

export interface LogQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  severity?: string;
  category?: string;
  outcome?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "created_at" | "severity" | "category" | "action";
  sortOrder?: "asc" | "desc";
}

export class LogServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "LogServiceError";
    this.statusCode = statusCode;
  }
}

let cachedLogsResponse: LogsResponse | null = null;
let cachedQueryKey = "";

function buildQueryKey(params: LogQueryParams): string {
  return JSON.stringify({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search ?? "",
    severity: params.severity ?? "all",
    category: params.category ?? "all",
    outcome: params.outcome ?? "all",
    source: params.source ?? "",
    startDate: params.startDate ?? "",
    endDate: params.endDate ?? "",
    sortBy: params.sortBy ?? "created_at",
    sortOrder: params.sortOrder ?? "desc",
  });
}

function buildSearchParams(params: LogQueryParams): URLSearchParams {
  const query = new URLSearchParams();
  if (params.page && params.page > 1) query.set("page", String(params.page));
  if (params.limit && params.limit !== 20) query.set("limit", String(params.limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.severity && params.severity !== "all") query.set("severity", params.severity);
  if (params.category && params.category !== "all") query.set("category", params.category);
  if (params.outcome && params.outcome !== "all") query.set("outcome", params.outcome);
  if (params.source?.trim()) query.set("source", params.source.trim());
  if (params.startDate) query.set("startDate", params.startDate);
  if (params.endDate) query.set("endDate", params.endDate);
  if (params.sortBy && params.sortBy !== "created_at") query.set("sortBy", params.sortBy);
  if (params.sortOrder && params.sortOrder !== "desc") query.set("sortOrder", params.sortOrder);
  return query;
}

export const logService = {
  getCachedLogs(): LogsResponse | null {
    return cachedLogsResponse;
  },

  getCachedQueryKey(): string {
    return cachedQueryKey;
  },

  clearCache(): void {
    cachedLogsResponse = null;
    cachedQueryKey = "";
  },

  async getLogs(
    params: LogQueryParams = {},
    options: { silent?: boolean } = {},
  ): Promise<LogsResponse> {
    const queryKey = buildQueryKey(params);
    const searchParams = buildSearchParams(params);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/logs?${queryString}` : "/logs";

    try {
      const response = await apiRequest<LogsResponse>(endpoint, {
        silent: options.silent ?? false,
      });

      cachedLogsResponse = response;
      cachedQueryKey = queryKey;
      return response;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new LogServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async getLogById(id: string): Promise<LogEntry> {
    try {
      const log = await apiRequest<LogEntry>(`/logs/${encodeURIComponent(id)}`);
      return log;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new LogServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },

  async cleanupLogs(retentionDays = 90): Promise<{ deletedCount: number }> {
    try {
      const result = await apiRequest<{ deletedCount: number }>("/logs/cleanup", {
        method: "POST",
        body: JSON.stringify({ retentionDays }),
      });
      // Invalidate query cache upon purge
      this.clearCache();
      return result;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw new LogServiceError(err.message, err.statusCode);
      }
      throw err;
    }
  },
};

