const VARIANT_CLASSES = {
  success: "bg-green text-[#03080e]",
  error: "bg-red text-white",
  info: "bg-primary text-[#03080e]",
};

export default function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-[999] rounded-md px-5 py-3 text-sm font-bold shadow-lg ${
        VARIANT_CLASSES[toast.variant] || VARIANT_CLASSES.success
      }`}
    >
      {toast.message}
    </div>
  );
}
