import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Spinner from "./Spinner";

// Canonical button — reconciles the flat-primary CTA (MySnippets/NotFound/
// ErrorBoundary) and the gradient CTA (AddSnippet) that had drifted apart
// into one variant set every page now shares.
const VARIANTS = {
  primary: "bg-primary font-bold text-[#03080e] shadow-primary hover:bg-primary-hover",
  secondary:
    "border border-border-card bg-card font-medium text-text-secondary shadow-sm hover:border-border-hover hover:bg-primary-subtle hover:text-primary",
  ghost: "font-medium text-text-secondary hover:bg-card-hover hover:text-text",
  danger: "bg-red font-bold text-white shadow-sm hover:opacity-90",
  outline:
    "border border-border bg-transparent font-medium text-text-secondary hover:border-primary hover:text-primary",
};

const SIZES = {
  sm: "gap-1.5 px-3 py-1.5 text-xs",
  md: "gap-[7px] px-[1.1rem] py-[0.55rem] text-[0.84rem]",
  lg: "gap-2 px-6 py-3 text-[15px]",
};

// Hoisted once at module scope — creating these inside the component body
// (motion.create(...) on every render) would mint a new component type
// each render and force React to remount the DOM node every time.
const MotionButton = motion.create("button");
const MotionLink = motion.create(Link);

// `as="link"` renders a react-router <Link> (pass `to`) styled identically
// to a button, for nav actions that should look like the rest of the CTA
// set (e.g. Dashboard's "Add Snippet"/"View All Snippets").
const Button = forwardRef(function Button(
  { as = "button", variant = "primary", size = "md", loading = false, disabled = false, className = "", children, ...props },
  ref
) {
  const classes = `inline-flex items-center justify-center whitespace-nowrap rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  if (as === "link") {
    const isDisabled = disabled || loading;
    return (
      <MotionLink
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        aria-disabled={isDisabled || undefined}
        className={`${classes} ${isDisabled ? "pointer-events-none opacity-50" : ""}`}
        {...props}
      >
        {loading && <Spinner size={14} className="mr-1.5" />}
        {children}
      </MotionLink>
    );
  }

  return (
    <MotionButton
      ref={ref}
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading && <Spinner size={14} className="mr-1.5" />}
      {children}
    </MotionButton>
  );
});

export default Button;
