import React, { useState } from "react";
import { Icons } from "@/lib/icons/index.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "@/components/ui/index.ts";

export const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string>("all");

  const now = new Date();
  const formattedTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const auditEvents = [
    {
      id: "evt-1",
      action: "Admin Session Authenticated",
      category: "auth",
      user: user?.email || "admin@selldigitalassets.com",
      status: "SUCCESS",
      time: formattedTime,
    },
    {
      id: "evt-2",
      action: "PostgreSQL Database Connection Initialized",
      category: "system",
      user: "System Daemon",
      status: "SUCCESS",
      time: formattedTime,
    },
    {
      id: "evt-3",
      action: "In-Memory Client Cache Synchronized",
      category: "cache",
      user: user?.email || "admin@selldigitalassets.com",
      status: "SUCCESS",
      time: formattedTime,
    },
  ];

  const filteredEvents =
    filter === "all"
      ? auditEvents
      : auditEvents.filter((e) => e.category === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary" size="sm">
              <Icons.ScrollText size={13} className="mr-1" /> System Observability
            </Badge>
            <Badge variant="success" size="sm">
              Live Audit Trail
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Audit Logs
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
            Real-time administrative operations, authentication events, and governance tracking.
          </p>
        </div>
      </div>

      {/* Audit Stream */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.ScrollText size={18} className="text-primary" /> Session Activity Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological ledger of administrative operations
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "all"
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("auth")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "auth"
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Auth
              </button>
              <button
                type="button"
                onClick={() => setFilter("system")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  filter === "system"
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                System
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="divide-y divide-outline-variant/20">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-surface-container border border-outline-variant/20 text-primary shrink-0">
                    <Icons.Check size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">
                      {evt.action}
                    </p>
                    <p className="text-on-surface-variant truncate">
                      Operator: <span className="text-primary font-medium">{evt.user}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="success" size="sm">
                    {evt.status}
                  </Badge>
                  <span className="text-on-surface-variant text-[11px] font-mono">
                    {evt.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogs;

