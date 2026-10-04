import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from "@/components/ui/index.ts";

export interface CompanyInfo {
  name: string;
  shortName: string;
  title: string;
  tagline: string;
  description: string;
}

const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Sell Digital Assets API",
  shortName: "Sell Digital Assets",
  title: "Sell Digital Assets API",
  tagline: "System Status & Observability Dashboard",
  description:
    "Enterprise-grade digital assets marketplace and license distribution REST API platform.",
};

export interface CompanyProps {
  data?: CompanyInfo;
}

export const Company: React.FC<CompanyProps> = ({
  data = DEFAULT_COMPANY_INFO,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary" size="sm">
            <Icons.Security size={13} className="mr-1" /> Organization Info
          </Badge>
          <Badge variant="success" size="sm">
            Active System
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          Company Details
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          Core identity and platform profile metadata for the digital assets infrastructure.
        </p>
      </div>

      {/* Main Company Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                <Icons.Brand size={26} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  {data.title}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-primary mt-0.5">
                  {data.tagline}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              REST API Platform
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2">
          {/* Key Value Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Company Name
              </span>
              <p className="text-base font-semibold text-on-surface">
                {data.name}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Short Name
              </span>
              <p className="text-base font-semibold text-on-surface">
                {data.shortName}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Title
              </span>
              <p className="text-base font-semibold text-on-surface">
                {data.title}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Tagline
              </span>
              <p className="text-sm sm:text-base font-medium text-on-surface">
                {data.tagline}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-1.5 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Description
              </span>
              <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant">
                {data.description}
              </p>
            </div>
          </div>

          {/* Integration Status Footer Note */}
          <div className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 flex items-center justify-between gap-4 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2">
              <Icons.Performance size={16} className="text-primary shrink-0" />
              <span>
                Metadata ready for backend integration via REST endpoint.
              </span>
            </div>
            <span className="font-mono text-[11px] text-on-surface-variant/70">
              status: 200 OK
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Company;
