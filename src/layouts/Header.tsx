import React from "react";
import { useTheme } from "@/hooks/useTheme.ts";
import { useAuth } from "@/hooks/useAuth.ts";
import { Icons } from "@/lib/icons/index.ts";

export interface HeaderProps {
  onToggleSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onNewAssetClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "AD";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b border-outline-variant/30 bg-surface/90 px-4 sm:px-6 backdrop-blur-md transition-colors">
      {/* Left: Mobile Sidebar Toggle & Admin Identity (Image Name Login As Role) */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="lg:hidden p-2 -ml-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          <Icons.Menu size={20} />
        </button>

        {/* Admin Avatar / Image */}
        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0 select-none shadow-xs">
          {initials}
        </div>

        {/* Name, "Login As", and Role in one line */}
        <div className="flex items-center gap-2 text-sm truncate">
          <span className="font-semibold text-on-surface truncate">
            {user?.name}
          </span>
          <span className="text-xs text-on-surface-variant shrink-0">
            Login as - {user?.role}
          </span>
        </div>
      </div>

      {/* Right: Theme Toggle */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? (
            <Icons.ThemeLight size={20} className="text-amber-400" />
          ) : (
            <Icons.ThemeDark size={20} className="text-on-surface-variant" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
