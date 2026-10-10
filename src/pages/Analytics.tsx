import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { EmptyState } from "@/components/ui/index.ts";

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-outline-variant/30 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          Analytics
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          Performance metrics, reporting, and platform analytics.
        </p>
      </div>

      <EmptyState
        icon={<Icons.TrendingUp size={28} />}
        title="No Analytics Data"
        description="This section is an empty placeholder. Backend analytics service will be integrated later."
      />
    </div>
  );
};

export default Analytics;
