import Spinner from "../ui/Spinner";

export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner size={32} className="text-primary" />
      <p className="font-mono text-xs tracking-wide">{label}</p>
    </div>
  );
}
