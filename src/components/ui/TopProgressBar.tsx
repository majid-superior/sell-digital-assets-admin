import React, { useEffect, useState } from "react";
import { useGlobalLoading } from "@/lib/loadingManager.ts";

export const TopProgressBar: React.FC = () => {
  const isLoading = useGlobalLoading();
  const [isRendered, setIsRendered] = useState(isLoading);

  // Adjust state during render when loading starts (official React 19 pattern)
  if (isLoading && !isRendered) {
    setIsRendered(true);
  }

  useEffect(() => {
    if (!isLoading && isRendered) {
      // Keep visible briefly for smooth fade-out before unmounting
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isRendered]);

  if (!isRendered && !isLoading) {
    return null;
  }

  return (
    <div
      role="progressbar"
      aria-label="Loading content"
      aria-busy={isLoading}
      className={`fixed top-0 left-0 right-0 z-50 h-0.75 pointer-events-none overflow-hidden transition-opacity duration-300 ${
        isLoading ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-primary/10" />

      {/* Moving progress bar */}
      <div className="h-full w-full bg-linear-to-r from-primary via-secondary to-primary origin-left animate-top-progress" />
    </div>
  );
};

export default TopProgressBar;
