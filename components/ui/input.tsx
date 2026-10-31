import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const errorId = error && inputId ? `${inputId}-error` : undefined;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`w-full rounded-xl border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent disabled:opacity-50 disabled:bg-surface ${error ? "border-danger focus:ring-danger/25 focus:border-danger" : "border-border hover:border-accent/40 dark:hover:border-accent/50"} ${className}`}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-danger mt-1">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
