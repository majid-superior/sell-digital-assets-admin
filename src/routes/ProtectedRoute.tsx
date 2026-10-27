// src/routes/ProtectedRoute.tsx
import React from "react";
import { useAuth } from "../hooks/useAuth.ts";

export interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = ["ADMIN"],
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const userRole = (user.role || "").toUpperCase();
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  if (!normalizedAllowed.includes(userRole)) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied (403 Forbidden)</h1>
        <p className="text-on-surface-variant max-w-md">
          Organization Administrator privileges are strictly required to access this resource.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;

