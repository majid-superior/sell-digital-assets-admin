import { useState, useEffect } from "react";
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
  Banner,
  Hero,
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
import {
  organizationService,
  userService,
  categoryService,
  themeService,
  assetService,
  notificationService,
  bannerService,
} from "@/services/index.ts";

const VALID_TAB_IDS: NavTabId[] = [
  "dashboard",
  "analytics",
  "assets",
  "categories",
  "users",
  "orders",
  "refunds",
  "payouts",
  "curation",
  "coupons",
  "broadcasts",
  "hero",
  "banner",
  "banners",
  "security",
  "branding",
  "appearance",
  "logs",
  "organizations",
  "settings",
  "platform-settings",
  "securities",
  "admin-security",
  "audit-logs",
  "system-settings",
];

function normalizeTab(raw: string): NavTabId {
  switch (raw) {
    case "organizations":
      return "branding";
    case "securities":
    case "admin-security":
      return "security";
    case "platform-settings":
      return "settings";
    case "audit-logs":
      return "logs";
    case "banners":
      return "banner";
    default:
      if (VALID_TAB_IDS.includes(raw as NavTabId)) {
        return raw as NavTabId;
      }
      return "dashboard";
  }
}

function getTabFromHash(): NavTabId {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase().trim();
  return normalizeTab(hash);
}

export default function App() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>(() => getTabFromHash());
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  useEffect(() => {
    const handleHashSync = () => {
      const currentTab = getTabFromHash();
      setActiveTab(currentTab);
    };

    window.addEventListener("hashchange", handleHashSync);
    window.addEventListener("popstate", handleHashSync);

    // If authenticated and no hash is present in URL, establish initial hash route
    if (isAuthenticated) {
      if (!window.location.hash) {
        window.history.replaceState(null, "", "#/dashboard");
      }
    }

    return () => {
      window.removeEventListener("hashchange", handleHashSync);
      window.removeEventListener("popstate", handleHashSync);
    };
  }, [isAuthenticated]);

  const handleSelectTab = (tabId: NavTabId) => {
    const canonical = normalizeTab(tabId);
    setActiveTab(canonical);
    if (window.location.hash !== `#/${canonical}`) {
      window.history.pushState(null, "", `#/${canonical}`);
    }
  };

  const handleSignOut = () => {
    setIsSignOutModalOpen(false);
    organizationService.clearCache();
    userService.clearCache();
    categoryService.clearCache();
    themeService.clearCache();
    assetService.clearCache();
    notificationService.clearCache();
    bannerService.clearCache();
    signOut();
    setActiveTab("dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
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
            onSelectTab={handleSelectTab}
            onSignOut={() => setIsSignOutModalOpen(true)}
          >
            {activeTab === "dashboard" && <Dashboard />}
            {activeTab === "analytics" && <Analytics />}
            {activeTab === "assets" && (
              <Assets
                onNavigateToCategories={() => handleSelectTab("categories")}
              />
            )}
            {activeTab === "categories" && <Categories />}
            {activeTab === "users" && <Users />}
            {activeTab === "orders" && <Orders />}
            {activeTab === "refunds" && <Refunds />}
            {activeTab === "payouts" && <Payouts />}
            {activeTab === "curation" && <Curation />}
            {activeTab === "coupons" && <Coupons />}
            {activeTab === "broadcasts" && <Broadcasts />}
            {activeTab === "hero" && <Hero />}
            {(activeTab === "banner" || activeTab === "banners") && <Banner />}
            {(activeTab === "security" ||
              activeTab === "securities" ||
              activeTab === "admin-security") && <Security />}
            {(activeTab === "branding" || activeTab === "organizations") && (
              <Branding />
            )}
            {activeTab === "appearance" && <Appearance />}
            {(activeTab === "settings" ||
              activeTab === "platform-settings") && <Settings />}
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
        offset={{ bottom: 150, right: 30 }}
        toastOptions={{
          className:
            "font-sans rounded-2xl shadow-lg border border-outline-variant/30",
        }}
      />
    </>
  );
}
