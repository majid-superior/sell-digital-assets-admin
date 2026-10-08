import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Modal,
  Spinner,
} from "@/components/ui/index.ts";
import { userService, UserServiceError } from "@/services/index.ts";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "seller" | "buyer" | string;
  status: "active" | "deactive" | string;
  createdAt: string;
  phone?: string;
  location?: string;
}

const ITEMS_PER_PAGE = 10;

export const Users: React.FC = () => {
  // Real backend users state with in-memory cache initialization (zero mock data)
  const [users, setUsers] = useState<ManagedUser[]>(
    () => userService.getCachedUsers()?.users || []
  );
  const [isLoading, setIsLoading] = useState(
    () => !userService.getCachedUsers()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Table search and filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [viewingUser, setViewingUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<ManagedUser | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState<ManagedUser>({
    id: "",
    name: "",
    email: "",
    role: "buyer",
    status: "active",
    createdAt: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Refresh users from backend server
  const refreshUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await userService.getAllUsers({ page: 1, limit: 100 });
      setUsers(result.users);
    } catch (err: unknown) {
      const message =
        err instanceof UserServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to connect to the backend server. Please verify the API is running.";
      toast.error("Failed to Load Users", {
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const hasCached = !!userService.getCachedUsers();

    // Revalidate with server (silent if already cached)
    userService
      .getAllUsers({ page: 1, limit: 100 }, { silent: hasCached, signal: controller.signal })
      .then((result) => {
        setUsers(result.users);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!hasCached) {
          const message =
            err instanceof UserServiceError
              ? err.message
              : err instanceof Error
              ? err.message
              : "Failed to connect to the backend server. Please verify the API is running.";
          toast.error("Failed to Load Users", {
            description: message,
          });
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Top metric computations directly from real database users
  const totalRegisteredUsers = users.length;
  const totalSellers = users.filter((u) => u.role.toLowerCase() === "seller").length;
  const totalBuyers = users.filter((u) => u.role.toLowerCase() === "buyer").length;
  const totalActiveUsers = users.filter((u) => u.status.toLowerCase() === "active").length;

  // Filtered users for table
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query);

      const matchesRole =
        roleFilter === "all" || user.role.toLowerCase() === roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" || user.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, validCurrentPage]);

  // Open View Modal
  const handleOpenView = (user: ManagedUser) => {
    setViewingUser(user);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: ManagedUser) => {
    setEditFormData({ ...user });
    setEditingUser(user);
    if (viewingUser) {
      setViewingUser(null);
    }
  };

  // Open Deactivate Confirmation Modal
  const handleOpenDeactivate = (user: ManagedUser) => {
    setDeactivatingUser(user);
  };

  // Save Edit Form directly to backend server
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = editFormData.name.trim();
    const trimmedEmail = editFormData.email.trim();

    if (!trimmedName) {
      toast.error("Validation Error", {
        description: "User name is required.",
      });
      return;
    }

    if (!trimmedEmail) {
      toast.error("Validation Error", {
        description: "Email address is required.",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address.",
      });
      return;
    }

    setIsSavingEdit(true);

    try {
      const updatedUser = await userService.updateUser(editFormData.id, {
        name: trimmedName,
        email: trimmedEmail,
        role: editFormData.role,
        status: editFormData.status,
      });

      setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));

      toast.success("User Details Saved", {
        description: `Account credentials for ${updatedUser.name} have been updated on the backend server.`,
      });

      setEditingUser(null);
    } catch (err: unknown) {
      const message =
        err instanceof UserServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to update user on backend server.";
      toast.error("Update Failed", {
        description: message,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Confirm Deactivate User directly on backend server
  const handleConfirmDeactivate = async () => {
    if (!deactivatingUser) return;

    setIsDeactivating(true);
    try {
      await userService.deactivateUser(deactivatingUser.id);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === deactivatingUser.id ? { ...u, status: "deactive" } : u
        )
      );

      toast.success("User Deactivated", {
        description: `${deactivatingUser.name}'s status has been set to deactive on the backend server.`,
      });

      setDeactivatingUser(null);
    } catch (err: unknown) {
      const message =
        err instanceof UserServiceError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Failed to deactivate user on backend server.";
      toast.error("Deactivation Failed", {
        description: message,
      });
    } finally {
      setIsDeactivating(false);
    }
  };

  // Avatar initials generator
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="primary" size="sm">
                <Icons.Users size={13} className="mr-1" /> Backend Database
              </Badge>
              <Badge variant="success" size="sm">
                Live Server
              </Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface">
              User Management
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-on-surface-variant max-w-2xl mt-1">
              Live marketplace users from the REST API server and PostgreSQL database.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshUsers}
            disabled={isLoading || isRefreshing}
            leftIcon={
              isRefreshing ? (
                <Spinner size="sm" color="primary" />
              ) : (
                <Icons.Performance size={14} />
              )
            }
            className="shrink-0 cursor-pointer hidden sm:flex"
          >
            {isRefreshing ? "Syncing..." : "Sync Server"}
          </Button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Registered Users */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Total Users
              </span>
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Icons.Users size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalRegisteredUsers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Registered database accounts
            </p>
          </CardContent>
        </Card>

        {/* 2. Registered as Seller */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Registered Sellers
              </span>
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                <Icons.Store size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalSellers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Active merchants and creators
            </p>
          </CardContent>
        </Card>

        {/* 3. Registered as Buyer */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Registered Buyers
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.ShoppingCart size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalBuyers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Customer base and consumers
            </p>
          </CardContent>
        </Card>

        {/* 4. Active User Accounts */}
        <Card className="hover:border-primary/40 transition-colors">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Active Accounts
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icons.UserCheck size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="text-3xl font-extrabold text-on-surface tracking-tight">
              {isLoading && users.length === 0 ? (
                <span className="inline-block h-8 w-16 bg-surface-container-high animate-pulse rounded" />
              ) : (
                totalActiveUsers
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-1">
              Operational verified accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="p-5 pb-4 border-b border-outline-variant/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold">All Users</CardTitle>
              <CardDescription className="text-xs text-on-surface-variant mt-0.5">
                Browse, inspect, modify, and manage user statuses directly on the server.
              </CardDescription>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-full sm:w-64">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, email, ID..."
                  leftIcon={<Icons.Search size={15} />}
                  className="py-1.5 text-xs"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label="Filter by role"
              >
                <option value="all">All Roles</option>
                <option value="seller">Sellers</option>
                <option value="buyer">Buyers</option>
                <option value="admin">Admins</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="deactive">Deactive</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && users.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <Spinner size="lg" color="primary" />
              <p className="text-sm font-medium">Loading users from backend database...</p>
            </div>
          ) : (
            <>
              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container/50 border-b border-outline-variant/20 text-xs uppercase font-semibold text-on-surface-variant tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">
                        User Details
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Role
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-3.5">
                        Joined Date
                      </th>
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-on-surface-variant">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Icons.Search size={28} className="text-on-surface-variant/40" />
                            <p className="font-semibold text-base">No users found</p>
                            <p className="text-xs text-on-surface-variant/70">
                              Try adjusting your search criteria or resetting filters.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const isDeactive = user.status.toLowerCase() === "deactive";
                        return (
                          <tr
                            key={user.id}
                            className="hover:bg-surface-container/40 transition-colors"
                          >
                            {/* User Identity Column */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0 select-none shadow-xs">
                                  {getInitials(user.name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-on-surface truncate">
                                    {user.name}
                                  </p>
                                  <p className="text-xs text-on-surface-variant truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Role Column */}
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={
                                  user.role.toLowerCase() === "admin"
                                    ? "primary"
                                    : user.role.toLowerCase() === "seller"
                                    ? "secondary"
                                    : "outline"
                                }
                                size="sm"
                                className="capitalize"
                              >
                                {user.role}
                              </Badge>
                            </td>

                            {/* Status Column */}
                            <td className="px-5 py-3.5">
                              <Badge
                                variant={isDeactive ? "error" : "success"}
                                size="sm"
                                className="capitalize"
                              >
                                {user.status}
                              </Badge>
                            </td>

                            {/* Joined Date Column */}
                            <td className="px-5 py-3.5 text-xs text-on-surface-variant font-mono">
                              {user.createdAt}
                            </td>

                            {/* Actions Column */}
                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Icon Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenView(user)}
                                  aria-label={`View ${user.name}`}
                                  title="View User Details"
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                                >
                                  <Icons.Eye size={16} />
                                </button>

                                {/* Edit Icon Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(user)}
                                  aria-label={`Edit ${user.name}`}
                                  title="Edit User"
                                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                                >
                                  <Icons.Edit size={16} />
                                </button>

                                {/* Delete / Deactivate Icon Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeactivate(user)}
                                  disabled={isDeactive}
                                  aria-label={`Deactivate ${user.name}`}
                                  title={isDeactive ? "User already deactive" : "Deactivate User"}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDeactive
                                      ? "text-on-surface-variant/30 cursor-not-allowed"
                                      : "text-on-surface-variant hover:text-error hover:bg-error/10"
                                  }`}
                                >
                                  <Icons.Trash size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {filteredUsers.length > 0 && (
                <div className="p-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-variant">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-on-surface">
                      {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-on-surface">
                      {Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredUsers.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-on-surface">
                      {filteredUsers.length}
                    </span>{" "}
                    users
                  </div>

                  {/* Page navigation buttons */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={validCurrentPage <= 1}
                      className="px-2.5 py-1 text-xs"
                    >
                      <Icons.ChevronLeft size={14} className="mr-1" /> Prev
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                          pageNumber === validCurrentPage
                            ? "bg-primary text-on-primary shadow-xs"
                            : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={validCurrentPage >= totalPages}
                      className="px-2.5 py-1 text-xs"
                    >
                      Next <Icons.ChevronRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 1. View User Popup Modal */}
      <Modal
        isOpen={Boolean(viewingUser)}
        onClose={() => setViewingUser(null)}
        title="User Details"
        description="Detailed account profile and server records."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewingUser(null)}
            >
              Close
            </Button>
            {viewingUser && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Icons.Edit size={14} />}
                onClick={() => handleOpenEdit(viewingUser)}
              >
                Edit User
              </Button>
            )}
          </>
        }
      >
        {viewingUser && (
          <div className="space-y-4">
            {/* User Header Identity */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0 select-none shadow-xs">
                {getInitials(viewingUser.name)}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-lg text-on-surface truncate">
                  {viewingUser.name}
                </h4>
                <p className="text-xs text-on-surface-variant truncate">
                  {viewingUser.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge
                    variant={
                      viewingUser.role.toLowerCase() === "admin"
                        ? "primary"
                        : viewingUser.role.toLowerCase() === "seller"
                        ? "secondary"
                        : "outline"
                    }
                    size="sm"
                    className="capitalize"
                  >
                    {viewingUser.role}
                  </Badge>
                  <Badge
                    variant={
                      viewingUser.status.toLowerCase() === "deactive"
                        ? "error"
                        : "success"
                    }
                    size="sm"
                    className="capitalize"
                  >
                    {viewingUser.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Detailed metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 space-y-0.5 sm:col-span-2">
                <span className="font-semibold text-on-surface-variant/70 uppercase text-[10px]">
                  Database User ID (UUID)
                </span>
                <p className="font-mono font-medium text-on-surface break-all">
                  {viewingUser.id}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 space-y-0.5">
                <span className="font-semibold text-on-surface-variant/70 uppercase text-[10px]">
                  Registered Date
                </span>
                <p className="font-medium text-on-surface font-mono">
                  {viewingUser.createdAt}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/20 space-y-0.5">
                <span className="font-semibold text-on-surface-variant/70 uppercase text-[10px]">
                  Backend Source
                </span>
                <p className="font-medium text-on-surface">
                  PostgreSQL (Live)
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. Edit User Popup Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => {
          if (!isSavingEdit) setEditingUser(null);
        }}
        title="Edit User Profile"
        description="Update account credentials and marketplace role directly on the backend server."
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingUser(null)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-edit-form"
              variant="primary"
              size="sm"
              leftIcon={<Icons.Save size={15} />}
              isLoading={isSavingEdit}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <form
          id="user-edit-form"
          onSubmit={handleSaveEdit}
          noValidate
          className="space-y-4"
        >
          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="user-name" required>
                Full Name
              </Label>
              <Input
                id="user-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="User full name"
                leftIcon={<Icons.User size={16} />}
                disabled={isSavingEdit}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="user-email" required>
                Email Address
              </Label>
              <Input
                id="user-email"
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="user@example.com"
                leftIcon={<Icons.Mail size={16} />}
                disabled={isSavingEdit}
              />
            </div>
          </div>

          {/* Role & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="user-role" required>
                Account Role
              </Label>
              <select
                id="user-role"
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, role: e.target.value }))
                }
                disabled={isSavingEdit}
                className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="user-status" required>
                Account Status
              </Label>
              <select
                id="user-status"
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                disabled={isSavingEdit}
                className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="deactive">Deactive</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* 3. Confirm Deactivate User Popup Modal */}
      <Modal
        isOpen={Boolean(deactivatingUser)}
        onClose={() => {
          if (!isDeactivating) setDeactivatingUser(null);
        }}
        title="Deactivate User Account"
        description="Confirmation required to change account status on backend server."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivatingUser(null)}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              leftIcon={<Icons.Trash size={14} />}
              isLoading={isDeactivating}
              onClick={handleConfirmDeactivate}
            >
              Confirm Deactivation
            </Button>
          </>
        }
      >
        {deactivatingUser && (
          <div className="space-y-3">
            <p className="text-sm text-on-surface">
              Are you sure you want to deactivate{" "}
              <strong className="text-on-surface">{deactivatingUser.name}</strong>?
            </p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Their account status will be set to{" "}
              <span className="font-semibold text-error">deactive</span> in the database.
              They will be restricted from participating in new marketplace transactions.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users;
