export const LAYOUT_TOKENS = {
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2.5rem", // 40px
    "2xl": "4rem", // 64px
  },
  gutters: {
    mobile: "0.75rem",
    tablet: "1rem",
    desktop: "1.5rem",
  },
  margins: {
    mobile: "1rem",
    tablet: "1.5rem",
    desktop: "2.5rem",
  },
  radii: {
    default: "0.25rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1360px",
  },
} as const;
