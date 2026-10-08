import React from "react";
import { Icons } from "@/lib/icons/index.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui/index.ts";

export interface SecuritiesProps {
  onNavigateToSettings?: () => void;
}

export type AdminSecurityProps = SecuritiesProps;

export const Securities: React.FC<SecuritiesProps> = ({ onNavigateToSettings }) => {
  const { user } = useAuth();

  const isRemembered = !!localStorage.getItem("sda_admin_token");

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="primary" size="sm">
              <Icons.ShieldCheck size={13} className="mr-1" /> Securities & Governance
            </Badge>
            <Badge variant="success" size="sm">
              Session Active
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
            Securities
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
            Authentication governance, administrative session securities, and access controls.
          </p>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Authorization Level
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Verified size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-on-surface uppercase tracking-tight">
              {user?.role || "ADMIN"}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Superuser platform permissions
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Session Storage
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Lock size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-on-surface tracking-tight">
              {isRemembered ? "Persistent" : "Single-Session"}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              {isRemembered ? "Remember Me (localStorage)" : "Ephemeral (sessionStorage)"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                API Security
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.ShieldCheck size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              Enforced
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Bearer token authorization header
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Credential Observability */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Icons.Security size={18} className="text-primary" /> Active Operator Identity
              </CardTitle>
              <CardDescription className="text-xs">
                Credentials currently authenticated against backend JWT service
              </CardDescription>
            </div>
            {onNavigateToSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToSettings}
                rightIcon={<Icons.Next size={14} />}
                className="cursor-pointer"
              >
                Change Password
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="text-on-surface-variant font-medium">Administrator Name</span>
              <p className="font-bold text-sm text-on-surface">
                {user?.name || "Administrator"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="text-on-surface-variant font-medium">Email Address</span>
              <p className="font-bold text-sm text-primary">
                {user?.email || "admin@selldigitalassets.com"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const AdminSecurity = Securities;
export default Securities;
