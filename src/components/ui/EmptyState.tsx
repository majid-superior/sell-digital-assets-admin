import React, { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";

export interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon,
      title,
      description,
      action,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-lowest/50",
          className
        )}
        {...props}
      >
        {icon && (
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-surface-container-high/60 text-on-surface-variant mb-4 shadow-xs">
            {icon}
          </div>
        )}
        <h4 className="text-lg font-semibold text-on-surface mb-1">{title}</h4>
        {description && (
          <p className="text-sm text-on-surface-variant max-w-sm mb-6 leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-1">{action}</div>}
        {children}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
