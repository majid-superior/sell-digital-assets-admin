import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { EmptyState } from "@/components/ui/index.ts";

export const Broadcasts: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="border-b border-outline-variant/30 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          Broadcasts
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          Platform announcements, newsletter campaigns, and notification broadcasts.
        </p>
      </div>

      <EmptyState
        icon={<Icons.Megaphone size={28} />}
        title="No Broadcasts Found"
        description="This section is an empty placeholder. Backend broadcast service will be integrated later."
      />
    </div>
  );
};

export default Broadcasts;

