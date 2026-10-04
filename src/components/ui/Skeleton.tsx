import React, { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";

export type SkeletonVariant = "text" | "circular" | "rounded" | "rectangular";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: "rounded-md h-4 w-full",
  circular: "rounded-full",
  rounded: "rounded-xl",
  rectangular: "rounded-none",
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    { variant = "rounded", width, height, className, style, ...props },
    ref
  ) => {
    const inlineStyle: React.CSSProperties = {
      ...(width !== undefined && { width }),
      ...(height !== undefined && { height }),
      ...style,
    };

    return (
      <div
        ref={ref}
        style={inlineStyle}
        className={cn(
          "animate-pulse bg-surface-container-high/60 shrink-0",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";
