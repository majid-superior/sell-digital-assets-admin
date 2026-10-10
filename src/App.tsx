import { useState } from "react";
import { useAuth } from "@/hooks/useAuth.ts";
import { useTheme } from "@/hooks/useTheme.ts";
import { Toaster } from "sonner";
import { Layout, type NavTabId } from "@/layouts/index.ts";
import {
  Dashboard,
  Analytics,
  Users,
  Assets,
  Categories,
  Orders,
  Refunds,
  Payouts,
  Curation,
  Coupons,
  Broadcasts,
  Security,
  Branding,
  Appearance,
  Settings,
  Logs,
  Login,
} from "@/pages/index.ts";
import { Modal, Button, Spinner, TopProgressBar } from "@/components/ui/index.ts";
import { Icons } from "@/lib/icons/index.ts";
import { organizationService, userService, categoryService, themeService } from "@/services/index.ts";

export default function App() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>("dashboard");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutModalOpen(false);
    organizationService.clearCache();
    userService.clearCache();
    categoryService.clearCache();
    themeService.clearCache();
    signOut();
    setActiveTab("dashboard");
  };

  return (
    <>
      <TopProgressBar />
      {isLoading ? (
        <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" color="primary" />
          <span className="text-xs text-on-surface-variant font-medium">
            Verifying session credentials...
          </span>
        </div>
      ) : !isAuthenticated ? (
        <Login />
      ) : (
        <>
          <Layout
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onLogout={() => setIsLogoutModalOpen(true)}
          >
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "assets" && (
              <Assets onNavigateToCategories={() => setActiveTab("categories")} />
            )}
            {activeTab === "categories" && <Categories />}
            {activeTab === "users" && <Users />}
            {activeTab === "orders" && <Orders />}
            {activeTab === "refunds" && <Refunds />}
            {activeTab === "payouts" && <Payouts />}
            {activeTab === "curation" && <Curation />}
            {activeTab === "coupons" && <Coupons />}
            {activeTab === "broadcasts" && <Broadcasts />}
            {(activeTab === "security" || activeTab === "securities" || activeTab === "admin-security") && (
              <Security />
            )}
            {(activeTab === "branding" || activeTab === "organizations") && (
              <Branding />
            )}
            {activeTab === "appearance" && <Appearance />}
            {(activeTab === "settings" || activeTab === "platform-settings") && (
              <Settings />
            )}
            {(activeTab === "logs" || activeTab === "audit-logs") && <Logs />}
          </Layout>

          {/* Logout Confirmation Dialog */}
          <Modal
            isOpen={isLogoutModalOpen}
            onClose={() => setIsLogoutModalOpen(false)}
            title="Logout"
            description="Are you sure you want to log out of the admin console?"
            size="sm"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLogoutModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Icons.LogOut size={14} />}
                  onClick={handleLogout}
                >
                  Log out
                </Button>
              </>
            }
          >
            <p className="text-sm text-on-surface-variant">
              Your active session will be ended and secure credentials cleared
              from this browser.
            </p>
          </Modal>
        </>
      )}

      {/* Global Toast Notification Container */}
      <Toaster
        position="bottom-right"
        theme={theme}
        richColors
        closeButton
        toastOptions={{
          className:
            "font-sans rounded-2xl shadow-lg border border-outline-variant/30",
        }}
      />
    </>
  );
}
