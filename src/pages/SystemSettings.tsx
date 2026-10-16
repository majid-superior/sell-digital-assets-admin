import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Label,
  Checkbox,
  Spinner,
} from "@/components/ui/index.ts";
import {
  organizationService,
  OrganizationServiceError,
  type SystemSettings,
  defaultSystemSettings,
} from "@/services/index.ts";

export interface SystemSettingsPageProps {
  onUpdate?: (updated: SystemSettings) => void;
}

export const SystemSettingsPage: React.FC<SystemSettingsPageProps> = ({ onUpdate }) => {
  const [settings, setSettings] = useState<SystemSettings>(() =>
    organizationService.getCachedSystemSettings() || defaultSystemSettings
  );
  const [isLoading, setIsLoading] = useState(
    () => !organizationService.getCachedSystemSettings()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form edit state
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load from backend
  const refreshSettings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await organizationService.getSystemSettings();
      setSettings(data);
      setFormData(data);
      setHasUnsavedChanges(false);
      toast.success("Settings Synced", {
        description: "Latest system settings retrieved from PostgreSQL.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server.";
      toast.error("Failed to Load Settings", { description: message });
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    organizationService
      .getSystemSettings({ signal: controller.signal })
      .then((data) => {
        setSettings(data);
        setFormData(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const handleChange = (
    field: keyof SystemSettings,
    value: number | boolean
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleResetDefaults = () => {
    setFormData(defaultSystemSettings);
    setHasUnsavedChanges(true);
    toast.info("Defaults Loaded", {
      description: "Default system parameters applied. Click 'Save Changes' to persist.",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.sessionIdleTimeoutMinutes < 1 || formData.sessionIdleTimeoutMinutes > 1440) {
      toast.error("Validation Error", {
        description: "Session idle timeout must be between 1 and 1440 minutes (24 hours).",
      });
      return;
    }

    if (formData.accessTokenTtlMinutes < 1 || formData.accessTokenTtlMinutes > 1440) {
      toast.error("Validation Error", {
        description: "Access token TTL must be between 1 and 1440 minutes.",
      });
      return;
    }

    if (formData.refreshTokenTtlDays < 1 || formData.refreshTokenTtlDays > 365) {
      toast.error("Validation Error", {
        description: "Refresh token TTL must be between 1 and 365 days.",
      });
      return;
    }

    if (formData.rememberMeTtlDays < 1 || formData.rememberMeTtlDays > 365) {
      toast.error("Validation Error", {
        description: "Remember-me duration must be between 1 and 365 days.",
      });
      return;
    }

    if (formData.maxLoginAttempts < 1 || formData.maxLoginAttempts > 50) {
      toast.error("Validation Error", {
        description: "Max login attempts must be between 1 and 50.",
      });
      return;
    }

    if (formData.passwordMinLength < 6 || formData.passwordMinLength > 128) {
      toast.error("Validation Error", {
        description: "Password minimum length must be at least 6 characters.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const updated = await organizationService.updateSystemSettings(formData);
      setSettings(updated);
      setFormData(updated);
      setHasUnsavedChanges(false);

      if (onUpdate) {
        onUpdate(updated);
      }

      toast.success("System Settings Saved", {
        description: "Session timeouts and token TTLs have been updated in PostgreSQL and applied across the suite.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof OrganizationServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to persist system settings on the server.";
      toast.error("Save Failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" color="primary" />
        <span className="text-sm text-on-surface-variant font-medium">
          Loading system settings from database...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="primary" size="sm">
                <Icons.Sliders size={13} className="mr-1" /> System Settings
              </Badge>
              <Badge variant="success" size="sm">
                Live PostgreSQL
              </Badge>
              <Badge variant="outline" size="sm">
                Multi-Tenant Bound
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              Policies
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Configure session idle timeouts, JWT access and refresh token lifetimes, authentication security policies, and organization platform governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSettings}
              disabled={isRefreshing || isSaving}
              leftIcon={
                isRefreshing ? (
                  <Spinner size="sm" color="primary" />
                ) : (
                  <Icons.Performance size={14} />
                )
              }
            >
              {isRefreshing ? "Syncing..." : "Sync Server"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={isSaving}
              leftIcon={<Icons.RotateCcw size={14} />}
            >
              Defaults
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              leftIcon={
                isSaving ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Save size={14} />
                )
              }
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Session Idle Timeout
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-on-surface">
              {formData.sessionIdleTimeoutMinutes}{" "}
              <span className="text-sm font-normal text-on-surface-variant">Minutes</span>
            </div>
            <p className="text-xs text-on-surface-variant/80 mt-1">
              Inactivity threshold before session expiry prompt
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Access Token TTL
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-on-surface">
              {formData.accessTokenTtlMinutes}{" "}
              <span className="text-sm font-normal text-on-surface-variant">Minutes</span>
            </div>
            <p className="text-xs text-on-surface-variant/80 mt-1">
              Short-lived JWT access token expiration
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Refresh Token TTL
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-on-surface">
              {formData.refreshTokenTtlDays}{" "}
              <span className="text-sm font-normal text-on-surface-variant">Days</span>
            </div>
            <p className="text-xs text-on-surface-variant/80 mt-1">
              Valid duration for seamless silent refresh
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
              Lockout Threshold
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-on-surface">
              {formData.maxLoginAttempts}{" "}
              <span className="text-sm font-normal text-on-surface-variant">Attempts</span>
            </div>
            <p className="text-xs text-on-surface-variant/80 mt-1">
              Bad logins before account is locked for {formData.lockoutDurationMinutes}m
            </p>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Session & Token Lifetimes */}
        <Card>
          <CardHeader className="border-b border-outline-variant/20 p-5">
            <div className="flex items-center gap-2">
              <Icons.Performance size={18} className="text-primary" />
              <CardTitle className="text-lg font-bold">Session & Token Timings</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Control the precise lifespan of user sessions, JWT access tokens, and background renewal tokens across the entire platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="sessionIdleTimeoutMinutes" className="font-semibold text-sm">
                Default Session Idle Timeout (Minutes)
              </Label>
              <Input
                id="sessionIdleTimeoutMinutes"
                type="number"
                min={1}
                max={1440}
                value={formData.sessionIdleTimeoutMinutes}
                onChange={(e) =>
                  handleChange("sessionIdleTimeoutMinutes", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                When a user remains idle for this duration, they are notified: &quot;Session ended, sign in again&quot; and redirected securely to sign in.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessTokenTtlMinutes" className="font-semibold text-sm">
                Access Token Lifetime (Minutes)
              </Label>
              <Input
                id="accessTokenTtlMinutes"
                type="number"
                min={1}
                max={1440}
                value={formData.accessTokenTtlMinutes}
                onChange={(e) =>
                  handleChange("accessTokenTtlMinutes", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                Bearer token duration validated by API middleware. Frontend automatically performs silent refresh when it expires.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refreshTokenTtlDays" className="font-semibold text-sm">
                Standard Refresh Token Lifetime (Days)
              </Label>
              <Input
                id="refreshTokenTtlDays"
                type="number"
                min={1}
                max={365}
                value={formData.refreshTokenTtlDays}
                onChange={(e) =>
                  handleChange("refreshTokenTtlDays", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                How many days a standard login session remains eligible for background token refreshing before requiring manual sign-in.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rememberMeTtlDays" className="font-semibold text-sm">
                Extended &apos;Remember Me&apos; Session (Days)
              </Label>
              <Input
                id="rememberMeTtlDays"
                type="number"
                min={1}
                max={365}
                value={formData.rememberMeTtlDays}
                onChange={(e) =>
                  handleChange("rememberMeTtlDays", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                Maximum refresh lifetime granted when users explicitly check &quot;Remember me on this device&quot;.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Security & Lockout Policies */}
        <Card>
          <CardHeader className="border-b border-outline-variant/20 p-5">
            <div className="flex items-center gap-2">
              <Icons.ShieldCheck size={18} className="text-primary" />
              <CardTitle className="text-lg font-bold">Authentication & Account Security</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Protect user accounts against brute-force attacks and configure password complexity requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts" className="font-semibold text-sm">
                Max Failed Login Attempts
              </Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min={1}
                max={50}
                value={formData.maxLoginAttempts}
                onChange={(e) =>
                  handleChange("maxLoginAttempts", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                Consecutive incorrect password attempts before the account is temporarily locked to prevent credential stuffing.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDurationMinutes" className="font-semibold text-sm">
                Lockout Duration (Minutes)
              </Label>
              <Input
                id="lockoutDurationMinutes"
                type="number"
                min={1}
                max={1440}
                value={formData.lockoutDurationMinutes}
                onChange={(e) =>
                  handleChange("lockoutDurationMinutes", parseInt(e.target.value, 10) || 1)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                Minutes a locked account must wait before sign in can be attempted again.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordMinLength" className="font-semibold text-sm">
                Minimum Password Length
              </Label>
              <Input
                id="passwordMinLength"
                type="number"
                min={6}
                max={128}
                value={formData.passwordMinLength}
                onChange={(e) =>
                  handleChange("passwordMinLength", parseInt(e.target.value, 10) || 6)
                }
                className="w-full"
              />
              <p className="text-xs text-on-surface-variant">
                Minimum character length enforced during registration and password reset.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Checkbox
                id="requireSpecialChar"
                checked={formData.requireSpecialChar}
                onChange={(e) => handleChange("requireSpecialChar", e.target.checked)}
              />
              <div>
                <Label htmlFor="requireSpecialChar" className="font-semibold text-sm cursor-pointer">
                  Require Special Characters
                </Label>
                <p className="text-xs text-on-surface-variant">
                  Enforces at least one symbol or special character in all passwords.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Platform Governance */}
        <Card>
          <CardHeader className="border-b border-outline-variant/20 p-5">
            <div className="flex items-center gap-2">
              <Icons.Building size={18} className="text-primary" />
              <CardTitle className="text-lg font-bold">Platform Governance & Access Controls</CardTitle>
            </div>
            <CardDescription className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Control public registration availability, email verification enforcement, and maintenance mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <Checkbox
                id="allowUserRegistration"
                checked={formData.allowUserRegistration}
                onChange={(e) => handleChange("allowUserRegistration", e.target.checked)}
              />
              <div>
                <Label htmlFor="allowUserRegistration" className="font-semibold text-sm cursor-pointer">
                  Allow Public User Registration
                </Label>
                <p className="text-xs text-on-surface-variant">
                  When enabled, buyers and creators can self-register via /signup. When disabled, only administrators can invite or create accounts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="requireEmailVerification"
                checked={formData.requireEmailVerification}
                onChange={(e) => handleChange("requireEmailVerification", e.target.checked)}
              />
              <div>
                <Label htmlFor="requireEmailVerification" className="font-semibold text-sm cursor-pointer">
                  Require Email Verification
                </Label>
                <p className="text-xs text-on-surface-variant">
                  Enforces email confirmation before creators can publish products or request payouts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-outline-variant/20">
              <Checkbox
                id="maintenanceMode"
                checked={formData.maintenanceMode}
                onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
              />
              <div>
                <Label htmlFor="maintenanceMode" className="font-semibold text-sm text-error cursor-pointer">
                  Emergency Maintenance Mode
                </Label>
                <p className="text-xs text-on-surface-variant">
                  Displays maintenance banners and pauses new order checkout processing across the public website while allowing admin access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar Footer */}
        <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <div className="text-xs text-on-surface-variant">
            {hasUnsavedChanges ? (
              <span className="text-warning font-medium flex items-center gap-1.5">
                <Icons.ServerError size={14} /> You have unsaved changes. Remember to click &quot;Save Changes&quot;.
              </span>
            ) : (
              <span className="text-success font-medium flex items-center gap-1.5">
                <Icons.Success size={14} /> All system settings are synchronized with PostgreSQL.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving || !hasUnsavedChanges}
              leftIcon={
                isSaving ? (
                  <Spinner size="sm" color="white" />
                ) : (
                  <Icons.Save size={14} />
                )
              }
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SystemSettingsPage;
