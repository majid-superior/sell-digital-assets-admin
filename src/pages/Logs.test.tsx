import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Logs } from "./Logs.tsx";
import { logService, type LogsResponse } from "@/services/index.ts";

const mockResponse: LogsResponse = {
  logs: [
    {
      id: "log-1",
      created_at: "2026-10-27T10:00:00.000Z",
      severity: "info",
      category: "admin",
      action: "settings.update",
      source: "admin-console",
      actor_id: "usr-admin-1",
      actor_email: "superadmin@assetdrop.com",
      actor_role: "admin",
      target_id: "org-1",
      target_type: "organization",
      outcome: "success",
      message: "Administrator updated platform fee percentage",
      request_id: "req-abc-12345",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0 Chrome/130.0",
      metadata: { previousFee: 5, newFee: 3 },
      stack_trace: null,
    },
    {
      id: "log-2",
      created_at: "2026-10-27T10:15:00.000Z",
      severity: "error",
      category: "security",
      action: "auth.login_failed",
      source: "auth-gateway",
      actor_id: null,
      actor_email: null,
      actor_role: null,
      target_id: "sec-token-99",
      target_type: "token",
      outcome: "denied",
      message: "Multiple failed sign-in attempts detected from unrecognized IP",
      request_id: "req-sec-99999",
      ip_address: "10.0.0.99",
      user_agent: "Curl/8.4.0",
      metadata: { reason: "rate_limited" },
      stack_trace: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
  stats: {
    total: 2,
    errorCount: 1,
    warnCount: 0,
    infoCount: 1,
    authCount: 1,
    adminCount: 1,
    securityCount: 0,
  },
};

describe("Logs Page (Responsive & Zero Horizontal Scroll)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    logService.clearCache();
    vi.spyOn(logService, "getCachedLogs").mockReturnValue(mockResponse);
    vi.spyOn(logService, "getLogs").mockResolvedValue(mockResponse);
  });

  it("renders page header, telemetry cards, and filter controls", () => {
    render(<Logs />);

    expect(screen.getByText("System & Audit Logs")).toBeInTheDocument();
    expect(screen.getByText("Total Logs")).toBeInTheDocument();
    expect(screen.getByText("Errors & Critical")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search logs by action/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by severity")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by category")).toBeInTheDocument();
  });

  it("renders responsive desktop table with prioritized column classes and table-fixed geometry", () => {
    render(<Logs />);

    const tableRegion = screen.getByRole("region", { name: "System and Audit Logs Table" });
    expect(tableRegion).toBeInTheDocument();
    expect(tableRegion).toHaveClass("hidden", "md:block", "w-full", "overflow-hidden");

    const table = tableRegion.querySelector("table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass("w-full", "table-fixed");

    // Check prioritized columns
    const actorHeaders = screen.getAllByRole("columnheader", { name: /actor/i });
    expect(actorHeaders.length).toBeGreaterThan(0);
    expect(actorHeaders[0]).toHaveClass("hidden", "lg:table-cell");

    const resourceHeaders = screen.getAllByRole("columnheader", { name: /resource/i });
    expect(resourceHeaders.length).toBeGreaterThan(0);
    expect(resourceHeaders[0]).toHaveClass("hidden", "xl:table-cell");
  });

  it("renders responsive mobile card layout without horizontal scrolling", () => {
    const { container } = render(<Logs />);

    const mobileContainer = container.querySelector(".md\\:hidden");
    expect(mobileContainer).toBeInTheDocument();

    // Verify both log messages are rendered in the mobile card list
    expect(screen.getAllByText("Administrator updated platform fee percentage").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Multiple failed sign-in attempts detected from unrecognized IP").length).toBeGreaterThanOrEqual(1);
  });

  it("opens log inspection modal when clicking inspect or a row", async () => {
    render(<Logs />);

    const inspectButtons = screen.getAllByRole("button", { name: /inspect/i });
    expect(inspectButtons.length).toBeGreaterThan(0);

    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Log Details")).toBeInTheDocument();
      expect(screen.getByText(/Detailed audit event record with sanitized telemetry/i)).toBeInTheDocument();
      expect(screen.getByText(/Log ID: log-1/i)).toBeInTheDocument();
      expect(screen.getByText("req-abc-12345")).toBeInTheDocument();
    });

    // Close the modal via footer Close button
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    fireEvent.click(closeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Detailed audit event record with sanitized telemetry/i)).not.toBeInTheDocument();
    });
  });

  it("filters updates when selecting severity or search queries", async () => {
    const getLogsSpy = vi.spyOn(logService, "getLogs").mockResolvedValue(mockResponse);

    render(<Logs />);

    const searchInput = screen.getByPlaceholderText(/search logs by action/i);
    fireEvent.change(searchInput, { target: { value: "platform fee" } });

    const severitySelect = screen.getByLabelText("Filter by severity");
    fireEvent.change(severitySelect, { target: { value: "error" } });

    await waitFor(() => {
      expect(getLogsSpy).toHaveBeenCalled();
    });
  });
});
