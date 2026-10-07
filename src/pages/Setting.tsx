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
} from "@/components/ui/index.ts";

export const Setting: React.FC = () => {
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
        description: "Name cannot be empty.",
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
        description: "Your name is already set to this value.",
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      const updatedUser = await authService.updateProfile({ name: trimmedName });
      updateUser(updatedUser);
      toast.success("Profile Updated", {
        description: "Your name has been updated successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof AuthError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update profile name.";
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
        description: "Your password has been changed successfully.",
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
            <Icons.Settings size={13} className="mr-1" /> Account Settings
          </Badge>
          <Badge variant="success" size="sm">
            Authenticated
          </Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
          User Settings
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
          Review your authenticated account information and manage personal security credentials.
        </p>
      </div>

      {/* 1. Login User Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shadow-xs select-none shrink-0 mt-0.5 sm:mt-0">
                {initials}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xl font-bold tracking-tight truncate">
                  {user?.name || "System Admin"}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-on-surface-variant mt-0.5 truncate">
                  {user?.email || "admin@selldigitalassets.com"}
                </CardDescription>
                {/* Mobile Badges (Neatly aligned under email on small screens to prevent overflow) */}
                <div className="flex sm:hidden items-center gap-2 mt-2.5">
                  <Badge variant="primary" size="sm" className="capitalize">
                    {user?.role || "admin"}
                  </Badge>
                  <Badge variant="success" size="sm" className="capitalize">
                    {user?.status || "active"}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Desktop Badges (Right-aligned on sm screens and larger) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
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

      {/* Grid of Update Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Update Name Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.User size={18} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Update Profile Name</CardTitle>
                <CardDescription className="text-xs text-on-surface-variant mt-0.5">
                  Change your display name as shown in the top header and system audits.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateName} noValidate className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="setting-name" required>
                  Full Name
                </Label>
                <Input
                  id="setting-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftIcon={<Icons.User size={16} />}
                  disabled={isUpdatingName}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isUpdatingName}
                  leftIcon={<Icons.Save size={16} />}
                >
                  Save Name
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 3. Update Password Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Lock size={18} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Change Password</CardTitle>
                <CardDescription className="text-xs text-on-surface-variant mt-0.5">
                  Update your authentication password to keep your account secure.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdatePassword} noValidate className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1">
                <Label htmlFor="current-password" required>
                  Current Password
                </Label>
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  leftIcon={<Icons.Key size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="pointer-events-auto p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                    >
                      {showCurrentPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  }
                  autoComplete="current-password"
                  disabled={isUpdatingPassword}
                />
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <Label htmlFor="new-password" required>
                  New Password
                </Label>
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  leftIcon={<Icons.Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="pointer-events-auto p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  }
                  autoComplete="new-password"
                  disabled={isUpdatingPassword}
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1">
                <Label htmlFor="confirm-password" required>
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<Icons.Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="pointer-events-auto p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                    </button>
                  }
                  autoComplete="new-password"
                  disabled={isUpdatingPassword}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  isLoading={isUpdatingPassword}
                  leftIcon={<Icons.Save size={16} />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Setting;

