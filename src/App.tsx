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
  SystemSettingsPage,
  Logs,
  SignIn,
} from "@/pages/index.ts";
import { Modal, Button, Spinner, TopProgressBar } from "@/components/ui/index.ts";
import { Icons } from "@/lib/icons/index.ts";
import { organizationService, userService, categoryService, themeService, assetService } from "@/services/index.ts";

export default function App() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>("dashboard");
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  const handleSignOut = () => {
    setIsSignOutModalOpen(false);
    organizationService.clearCache();
    userService.clearCache();
    categoryService.clearCache();
    themeService.clearCache();
    assetService.clearCache();
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
        <SignIn />
      ) : (
        <>
          <Layout
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onSignOut={() => setIsSignOutModalOpen(true)}
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
            {activeTab === "system-settings" && <SystemSettingsPage />}
            {(activeTab === "logs" || activeTab === "audit-logs") && <Logs />}
          </Layout>

          {/* Sign Out Confirmation Dialog */}
          <Modal
            isOpen={isSignOutModalOpen}
            onClose={() => setIsSignOutModalOpen(false)}
            title="Sign Out"
            description="Are you sure you want to sign out of the admin console?"
            size="sm"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSignOutModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Icons.SignOut size={14} />}
                  onClick={handleSignOut}
                >
                  Sign Out
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
