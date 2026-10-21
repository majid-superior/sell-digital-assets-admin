import React, { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-surface-container-high text-on-surface-variant border border-outline-variant/30",
  primary:
    "bg-primary/10 text-primary border border-primary/20",
  secondary:
    "bg-secondary/10 text-secondary border border-secondary/20",
  success:
    "bg-success/10 text-success border border-success/20",
  warning:
    "bg-warning/10 text-warning border border-warning/20",
  error:
    "bg-error/10 text-error border border-error/20",
  outline:
    "border border-outline-variant/60 text-on-surface bg-transparent",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] font-semibold gap-1 rounded-full",
  md: "px-2.5 py-1 text-xs font-semibold gap-1.5 rounded-full",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = "default",
      size = "md",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium leading-none tracking-wide transition-colors select-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
