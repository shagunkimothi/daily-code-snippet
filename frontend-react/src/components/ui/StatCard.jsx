import { useEffect, useState } from "react";
import Card from "./Card";
import Skeleton from "../Skeleton/Skeleton";

function useAnimatedCount(target, active) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const steps = 30;
    let step = 0;
    const timer = setInterval(() => {
      step += 1;
      setValue(Math.min(Math.round((target / steps) * step), target));
      if (step >= steps) clearInterval(timer);
    }, 800 / steps);
    return () => clearInterval(timer);
  }, [target, active]);
  return value;
}

// Shared by Dashboard's quiet stats row and the Analytics page — a single
// number in a quiet, equal-weight tile with a brief count-up animation.
// `value` may be a number (animates) or a string (renders as-is, e.g. "12%").
export default function StatCard({ label, value, loading, suffix = "" }) {
  const numeric = typeof value === "number";
  const animated = useAnimatedCount(numeric ? value : 0, !loading && numeric);
  return (
    <Card hover padding="sm" className="text-center sm:px-4 sm:py-4">
      <h3 className="mb-2 font-mono text-[0.58rem] font-bold uppercase tracking-[0.12em] text-muted">{label}</h3>
      {loading ? (
        <Skeleton className="mx-auto h-7 w-10" />
      ) : (
        <p className="font-mono text-xl font-extrabold leading-none text-text">
          {numeric ? animated : value}
          {suffix}
        </p>
      )}
    </Card>
  );
}
