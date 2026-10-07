import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { Badge, Card, CardTitle, CardDescription, CardContent } from "@/components/ui/index.ts";

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary" size="sm">
            <Icons.Performance size={13} className="mr-1" /> Overview
          </Badge>
          <Badge variant="secondary" size="sm">
            Admin Console
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          System telemetry, business observability, and digital assets administrative overview.
        </p>
      </div>

      {/* Empty State / Placeholder Card */}
      <Card className="min-h-85 flex items-center justify-center text-center p-8">
        <CardContent className="flex flex-col items-center justify-center max-w-md py-6">
          <div className="w-14 h-14 rounded-xl bg-surface-container-high text-primary flex items-center justify-center mb-4 shadow-xs">
            <Icons.Performance size={28} />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight mb-2">
            Dashboard Overview
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed text-on-surface-variant">
            This view is ready for upcoming analytics, real-time metrics, and telemetry widgets.
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
