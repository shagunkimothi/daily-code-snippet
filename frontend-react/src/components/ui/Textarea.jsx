import { forwardRef } from "react";

const Textarea = forwardRef(function Textarea(
  { label, error, helperText, className = "", id, ...props },
  ref
) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-text-secondary">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
        className={`w-full rounded-md border bg-input-bg px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none ${
          error ? "border-red focus:border-red" : "border-border focus:border-primary"
        } ${className}`}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs text-red">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="mt-1.5 text-xs text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default Textarea;
