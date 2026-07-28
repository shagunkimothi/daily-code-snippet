// The `rounded-xl border border-border-card bg-card shadow-md` shell
// repeated (with minor variance) across nearly every page — one component,
// `padding`/`hover` control the two axes that actually varied.
const PADDING = {
  none: "",
  sm: "p-4",
  md: "px-7 py-6",
  lg: "px-8 py-7",
};

export default function Card({ as: Tag = "div", padding = "md", hover = false, className = "", children, ...props }) {
  return (
    <Tag
      className={`rounded-xl border border-border-card bg-card shadow-md ${PADDING[padding]} ${
        hover ? "transition-transform hover:-translate-y-0.5 hover:border-border-hover" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}
