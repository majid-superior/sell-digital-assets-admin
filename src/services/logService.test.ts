import { describe, it, expect, beforeEach, vi } from "vitest";
import { logService, LogServiceError, type LogEntry, type LogsResponse } from "./logService.ts";
import * as apiClient from "./apiClient.ts";

describe("logService", () => {
  const mockResponse: LogsResponse = {
    logs: [
      {
        id: "00000000-0000-0000-0000-000000000001",
        created_at: "2026-10-27T10:00:00.000Z",
        severity: "info",
        category: "auth",
        action: "auth.login",
        source: "auth",
        actor_id: "00000000-0000-0000-0000-000000000001",
        actor_email: "admin@selldigitalassets.com",
        actor_role: "admin",
        target_id: null,
        target_type: null,
        outcome: "success",
        message: "User signed in successfully",
        request_id: "req-12345",
        ip_address: "127.0.0.1",
        user_agent: "Mozilla/5.0",
        metadata: { role: "admin" },
        stack_trace: null,
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    },
    stats: {
      total: 1,
      errorCount: 0,
      warnCount: 0,
      infoCount: 1,
      authCount: 1,
      adminCount: 0,
      securityCount: 0,
    },
  };

  beforeEach(() => {
    logService.clearCache();
    vi.restoreAllMocks();
  });

  describe("Cache Lifecycle", () => {
    it("should start with null cached logs", () => {
      expect(logService.getCachedLogs()).toBeNull();
      expect(logService.getCachedQueryKey()).toBe("");
    });

    it("should clear cache when clearCache is called", () => {
      logService.clearCache();
      expect(logService.getCachedLogs()).toBeNull();
    });
  });

  describe("getLogs", () => {

    it("should fetch logs and populate the in-memory cache", async () => {
      const apiSpy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockResponse);

      const result = await logService.getLogs({ page: 1, limit: 20 });

      expect(apiSpy).toHaveBeenCalledWith("/logs", { silent: false });
      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe("auth.login");
      expect(logService.getCachedLogs()).toEqual(mockResponse);
    });

    it("should properly serialize filter query parameters", async () => {
      const apiSpy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockResponse);

      await logService.getLogs({
        page: 2,
        limit: 50,
        search: "admin",
        severity: "error",
        category: "admin",
        outcome: "failure",
        sortOrder: "asc",
      });

      expect(apiSpy).toHaveBeenCalledWith(
        "/logs?page=2&limit=50&search=admin&severity=error&category=admin&outcome=failure&sortOrder=asc",
        { silent: false },
      );
    });

    it("should wrap ApiError into LogServiceError on failure", async () => {
      vi.spyOn(apiClient, "apiRequest").mockRejectedValueOnce(
        new apiClient.ApiError("Unauthorized access to logs", 403),
      );

      await expect(logService.getLogs()).rejects.toThrow(LogServiceError);
    });
  });

  describe("getLogById", () => {
    it("should fetch a specific log by ID", async () => {
      const mockLog: LogEntry = {
        id: "log-uuid-1",
        created_at: "2026-10-27T10:00:00.000Z",
        severity: "error",
        category: "error",
        action: "error.unhandled",
        source: "api",
        actor_id: null,
        actor_email: null,
        actor_role: null,
        target_id: null,
        target_type: null,
        outcome: "error",
        message: "Unhandled application exception",
        request_id: "req-err-1",
        ip_address: "127.0.0.1",
        user_agent: "Node/22",
        metadata: { errName: "Error" },
        stack_trace: "Error: something failed\n    at test",
      };

      const apiSpy = vi.spyOn(apiClient, "apiRequest").mockResolvedValueOnce(mockLog);

      const log = await logService.getLogById("log-uuid-1");

      expect(apiSpy).toHaveBeenCalledWith("/logs/log-uuid-1");
      expect(log.id).toBe("log-uuid-1");
      expect(log.severity).toBe("error");
    });
  });

  describe("cleanupLogs", () => {
    it("should invoke cleanup endpoint and clear the cache", async () => {
      const apiSpy = vi
        .spyOn(apiClient, "apiRequest")
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce({ deletedCount: 15 });

      // First set cache
      await logService.getLogs();
      expect(logService.getCachedLogs()).not.toBeNull();

      const result = await logService.cleanupLogs(90);

      expect(apiSpy).toHaveBeenLastCalledWith("/logs/cleanup", {
        method: "POST",
        body: JSON.stringify({ retentionDays: 90 }),
      });
      expect(result.deletedCount).toBe(15);
      expect(logService.getCachedLogs()).toBeNull();
    });
  });
});
