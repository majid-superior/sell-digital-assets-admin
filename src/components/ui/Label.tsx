import React, { forwardRef } from "react";
import { cn } from "@/lib/utils.ts";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ required, className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-xs font-semibold text-on-surface uppercase tracking-wider select-none inline-flex items-center gap-1",
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-error" aria-hidden="true">
            *
          </span>
        )}
      </label>
    );
  }
);

Label.displayName = "Label";
