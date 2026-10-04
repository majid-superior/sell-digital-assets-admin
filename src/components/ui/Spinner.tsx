import React from "react";
import { cn } from "@/lib/utils.ts";

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | number;
  color?: "primary" | "secondary" | "current" | "white";
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 28,
};

const colorClasses = {
  primary: "text-primary",
  secondary: "text-secondary",
  current: "text-current",
  white: "text-white",
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  color = "primary",
  className,
  ...props
}) => {
  const pixelSize = typeof size === "number" ? size : sizeMap[size] || 20;

  return (
    <svg
      role="status"
      aria-label="Loading"
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "animate-spin shrink-0",
        colorClasses[color] || colorClasses.primary,
        className
      )}
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
