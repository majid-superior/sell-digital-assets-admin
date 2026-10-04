import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils.ts";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error,
      leftIcon,
      rightIcon,
      helperText,
      className,
      id: customId,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const isError = Boolean(error);
    const errorMessage = typeof error === "string" ? error : undefined;
    const descriptionId = `${id}-description`;

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-on-surface-variant/70">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={isError ? "true" : undefined}
            aria-describedby={
              errorMessage || helperText ? descriptionId : undefined
            }
            className={cn(
              "w-full rounded-lg border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 transition-all",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary",
              leftIcon ? "pl-10" : undefined,
              rightIcon ? "pr-10" : undefined,
              isError
                ? "border-error focus:ring-error focus:border-error focus-visible:ring-error text-error"
                : undefined,
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute right-3.5 flex items-center text-on-surface-variant/70">
              {rightIcon}
            </div>
          )}
        </div>
        {errorMessage ? (
          <p
            id={descriptionId}
            className="mt-1 text-xs text-error flex items-center gap-1 font-medium"
          >
            {errorMessage}
          </p>
        ) : helperText ? (
          <p id={descriptionId} className="mt-1 text-xs text-on-surface-variant">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
