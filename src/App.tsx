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
  logService,
} from "@/services/index.ts";

const VALID_TAB_IDS: NavTabId[] = [
  "dashboard",
  "analytics",
  "analytics-revenue",
  "analytics-supply",
  "analytics-search",
  "analytics-behavior",
  "analytics-retention",
  "analytics-marketing",
  "analytics-growth",
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
    case "analytics":
    case "analytics-revenue":
    case "analytics/revenue":
      return "analytics-revenue";
    case "analytics-supply":
    case "analytics/supply":
      return "analytics-supply";
    case "analytics-search":
    case "analytics/search":
      return "analytics-search";
    case "analytics-behavior":
    case "analytics/behavior":
      return "analytics-behavior";
    case "analytics-retention":
    case "analytics/retention":
      return "analytics-retention";
    case "analytics-marketing":
    case "analytics/marketing":
      return "analytics-marketing";
    case "analytics-growth":
    case "analytics/growth":
      return "analytics-growth";
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

function getTabFromUrl(): NavTabId {
  if (typeof window === "undefined") return "dashboard";

  // Backward compatibility: If URL still contains a legacy hash (e.g., #/categories or #/analytics-behavior)
  if (window.location.hash) {
    const legacyHash = window.location.hash.replace(/^#\/?/, "").toLowerCase().trim();
    if (legacyHash) {
      return normalizeTab(legacyHash);
    }
  }

  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase().trim();
  return normalizeTab(path);
}

export default function App() {
  const { theme } = useTheme();
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTabId>(() => getTabFromUrl());
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);

  useEffect(() => {
    const handleUrlSync = () => {
      const currentTab = getTabFromUrl();
      setActiveTab(currentTab);
    };

    window.addEventListener("popstate", handleUrlSync);
    window.addEventListener("hashchange", handleUrlSync);

    // If authenticated, align the address bar to the clean canonical path
    if (isAuthenticated) {
      const canonical = getTabFromUrl();
      const targetPath = `/${canonical}`;

      // Clean up legacy hash or set initial clean path if on root '/' or aliased path
      if (window.location.hash || window.location.pathname !== targetPath) {
        window.history.replaceState(null, "", targetPath);
      }
    }

    return () => {
      window.removeEventListener("popstate", handleUrlSync);
      window.removeEventListener("hashchange", handleUrlSync);
    };
  }, [isAuthenticated]);

  const handleSelectTab = (tabId: NavTabId) => {
    const canonical = normalizeTab(tabId);
    setActiveTab(canonical);
    const targetPath = `/${canonical}`;
    if (window.location.pathname !== targetPath || window.location.hash) {
      window.history.pushState(null, "", targetPath);
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
    logService.clearCache();
    signOut();
    setActiveTab("dashboard");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/");
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
            {(activeTab === "analytics" ||
              activeTab === "analytics-revenue" ||
              activeTab === "analytics-supply" ||
              activeTab === "analytics-search" ||
              activeTab === "analytics-behavior" ||
              activeTab === "analytics-retention" ||
              activeTab === "analytics-marketing" ||
              activeTab === "analytics-growth") && (
              <Analytics
                activeSubTab={activeTab}
                onSelectSubTab={handleSelectTab}
              />
            )}
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
