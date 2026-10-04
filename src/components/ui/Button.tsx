import React, { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";
import { Spinner } from "./Spinner.tsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:opacity-90 active:scale-[0.98] shadow-xs",
  secondary:
    "bg-secondary text-on-secondary hover:opacity-90 active:scale-[0.98] shadow-xs",
  outline:
    "border border-outline-variant/60 text-on-surface bg-transparent hover:bg-surface-container-high/60 active:scale-[0.98]",
  ghost:
    "text-on-surface bg-transparent hover:bg-surface-container-high/60 active:scale-[0.98]",
  danger:
    "bg-error text-on-error hover:opacity-90 active:scale-[0.98] shadow-xs",
  destructive:
    "bg-error text-on-error hover:opacity-90 active:scale-[0.98] shadow-xs",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg font-medium",
  md: "h-10 px-4 text-sm gap-2 rounded-lg font-medium",
  lg: "h-12 px-6 text-base gap-2.5 rounded-lg font-semibold",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading ? "true" : undefined}
        className={cn(
          "inline-flex items-center justify-center select-none font-medium transition-all duration-150 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner
            size={size === "lg" ? "md" : "sm"}
            color="current"
            className="shrink-0"
          />
        ) : (
          leftIcon && <span className="inline-flex shrink-0 items-center">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
