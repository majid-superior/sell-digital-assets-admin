import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils.ts";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      id: customId,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const isError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : undefined;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={id}
          className={cn(
            "inline-flex items-start gap-3 select-none cursor-pointer group",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              disabled={disabled}
              aria-invalid={isError ? "true" : undefined}
              className={cn(
                "peer h-4 w-4 shrink-0 rounded border border-outline-variant/40 bg-surface accent-primary transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isError && "border-error focus-visible:ring-error",
                "disabled:cursor-not-allowed disabled:opacity-50",
                className
              )}
              {...props}
            />
          </div>

          {(label || description) && (
            <div className="flex flex-col">
              {label && (
                <span className="text-sm font-medium text-on-surface leading-tight group-hover:text-primary transition-colors">
                  {label}
                </span>
              )}
              {description && (
                <span className="text-xs text-on-surface-variant mt-0.5 leading-normal">
                  {description}
                </span>
              )}
            </div>
          )}
        </label>
        {errorMessage && (
          <p className="text-xs text-error font-medium pl-7">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
