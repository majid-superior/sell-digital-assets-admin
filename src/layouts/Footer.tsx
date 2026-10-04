import React from "react";

export interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  return (
    <footer
      role="contentinfo"
      className={`border-t border-outline-variant/30 py-4 px-4 sm:px-6 lg:px-8 mt-auto text-xs text-on-surface-variant/70 text-center transition-colors ${className}`}
    >
      <p>© 2026 Sell Digital Assets, Inc.</p>
    </footer>
  );
};

export default Footer;
