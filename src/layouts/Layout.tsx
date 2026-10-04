import React, { useState } from "react";
import { Header } from "./Header.tsx";
import { Sidebar, type NavTabId } from "./Sidebar.tsx";
import { Footer } from "./Footer.tsx";

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: NavTabId;
  onSelectTab?: (tabId: NavTabId) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab = "dashboard",
  onSelectTab = () => {},
  searchQuery = "",
  onSearchChange,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-row transition-colors duration-200">
      {/* Side Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={onLogout}
      />

      {/* Main Content Area with Header and Footer */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default Layout;
