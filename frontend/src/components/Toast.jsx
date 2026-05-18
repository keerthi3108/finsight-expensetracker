import { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  const icon =
    type === "success" ? "✓" : type === "error" ? "!" : type === "warning" ? "⚠" : "…";
  useEffect(() => {
    if (!message) return undefined;
    const t = window.setTimeout(onClose, 3800);
    return () => window.clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast-${type}`} role="status">
      <span className="toast-icon">{icon}</span>
      <span>{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );
}
