// Same shimmer effect as the original .skeleton-pulse class in style.css
// (used by dashboard.js's showSkeletons()) — ports it to a reusable
// component instead of one page hand-coding the gradient/animation.
export default function Skeleton({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-shimmer rounded-sm bg-[length:200%_100%] bg-[linear-gradient(90deg,var(--card-elevated)_25%,var(--card-hover)_50%,var(--card-elevated)_75%)] ${className}`}
    />
  );
}
