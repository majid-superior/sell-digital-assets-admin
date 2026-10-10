import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth.ts";
import { authService, AuthError } from "@/services/authService.ts";
import { toast } from "sonner";
import { Icons } from "@/lib/icons/index.ts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Spinner,
} from "@/components/ui/index.ts";

export interface SecurityProps {
  onNavigateToSettings?: () => void;
}

export const Security: React.FC<SecurityProps> = () => {
  const { user, updateUser } = useAuth();

  // Name update form state
  const [name, setName] = useState(user?.name || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Password update form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Initials for avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  // Handle Name Update
  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "Administrator name cannot be empty.",
      });
      return;
    }
    if (trimmedName.length < 2) {
      toast.error("Validation Error", {
        description: "Name must be at least 2 characters.",
      });
      return;
    }

    if (trimmedName === user?.name) {
      toast.info("No changes detected", {
        description: "Your administrator name is already set to this value.",
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      const updatedUser = await authService.updateProfile({ name: trimmedName });
      updateUser(updatedUser);
      toast.success("Profile Name Updated", {
        description: "Your administrator name has been saved successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof AuthError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update administrator name.";
      toast.error("Update Failed", {
        description: message,
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Validation Error", {
        description: "Current password is required.",
      });
      return;
    }

    if (!newPassword) {
      toast.error("Validation Error", {
        description: "New password cannot be empty.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Validation Error", {
        description: "New password must be at least 6 characters.",
      });
      return;
    }

    if (!confirmPassword) {
      toast.error("Validation Error", {
        description: "Confirm password cannot be empty.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Validation Error", {
        description: "Passwords do not match.",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await authService.updateProfile({
        currentPassword,
        password: newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Password Changed", {
        description: "Your administrative password has been changed successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof AuthError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update password.";

      toast.error("Password Update Failed", {
        description: message,
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary" size="sm">
            <Icons.ShieldCheck size={13} className="mr-1" /> Credential Governance
          </Badge>
          <Badge variant="success" size="sm">
            Session Active
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          Security
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          Manage administrator name, authenticated identity, and security access credentials.
        </p>
      </div>

      {/* Operator Identity Card */}
      <Card>
        <CardHeader className="p-5 border-b border-outline-variant/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shadow-xs select-none shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-bold tracking-tight truncate">
                  {user?.name || "Administrator"}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-on-surface-variant mt-0.5 truncate">
                  {user?.email || "—"}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="primary" size="sm" className="capitalize">
                {user?.role || "admin"}
              </Badge>
              <Badge variant="success" size="sm" className="capitalize">
                {user?.status || "active"}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Forms Grid: Update Admin Name & Change Password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Update Admin Name */}
        <Card>
          <CardHeader className="p-5 border-b border-outline-variant/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icons.User size={18} className="text-primary" /> Operator Name
            </CardTitle>
            <CardDescription className="text-xs">
              Update your administrative display name
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input
                  id="admin-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter administrator full name"
                  disabled={isUpdatingName}
                  required
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUpdatingName || !name.trim()}
                  leftIcon={
                    isUpdatingName ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <Icons.Save size={14} />
                    )
                  }
                  className="cursor-pointer"
                >
                  {isUpdatingName ? "Saving..." : "Save Name"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Form 2: Change Password */}
        <Card>
          <CardHeader className="p-5 border-b border-outline-variant/20">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Icons.Lock size={18} className="text-secondary" /> Change Password
            </CardTitle>
            <CardDescription className="text-xs">
              Update authentication password for this administrator account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isUpdatingPassword}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <Icons.EyeOff size={16} />
                    ) : (
                      <Icons.Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={isUpdatingPassword}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <Icons.EyeOff size={16} />
                    ) : (
                      <Icons.Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    disabled={isUpdatingPassword}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <Icons.EyeOff size={16} />
                    ) : (
                      <Icons.Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={
                    isUpdatingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                  leftIcon={
                    isUpdatingPassword ? (
                      <Spinner size="sm" color="white" />
                    ) : (
                      <Icons.Key size={14} />
                    )
                  }
                  className="cursor-pointer"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const Securities = Security;
export const AdminSecurity = Security;
export default Security;

