import { forwardRef } from "react";

// Canonicalizes AddSnippet's hand-rolled `inputClass` constant (previously
// pasted onto every <input>/<select>/<textarea> in that file) into a real
// component with label/error/helper slots. Uses the --input-bg token that
// already existed in index.css but nothing was actually consuming yet.
const Input = forwardRef(function Input(
  { label, error, helperText, endAdornment, className = "", id, ...props },
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
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined}
          className={`w-full rounded-md border bg-input-bg px-4 py-3 text-sm text-text placeholder:text-muted focus:outline-none ${
            endAdornment ? "pr-11" : ""
          } ${error ? "border-red focus:border-red" : "border-border focus:border-primary"} ${className}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{endAdornment}</div>
        )}
      </div>
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

export default Input;
