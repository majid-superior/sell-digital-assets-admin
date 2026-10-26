import React, { useState } from "react";
import { Header } from "./Header.tsx";
import { Sidebar, type NavTabId } from "./Sidebar.tsx";
import { Footer } from "./Footer.tsx";

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: NavTabId;
  onSelectTab?: (tabId: NavTabId) => void;
  onSignOut?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab = "dashboard",
  onSelectTab = () => {},
  onSignOut,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch (err: unknown) {
      void err;
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch (err: unknown) {
        void err;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-row transition-colors duration-200">
      {/* Side Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSignOut={onSignOut}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area with Header and Footer */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onToggleCollapse={handleToggleCollapse}
          isSidebarCollapsed={isSidebarCollapsed}
          onSelectTab={onSelectTab}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 lg:space-y-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
