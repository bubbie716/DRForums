"use client";

type AdminConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AdminConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: AdminConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-text-dark/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="Close modal"
      />
      <div
        className="relative w-full max-w-md bg-white border border-border rounded-2xl shadow-warm-lg p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <h2 id="confirm-title" className="text-lg font-extrabold text-text-dark">
          {title}
        </h2>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed whitespace-pre-line">
          {message}
        </p>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 px-5 py-2.5 text-sm font-semibold rounded-xl border border-border text-text-dark hover:bg-hover transition-colors disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              variant === "danger"
                ? "min-h-11 px-5 py-2.5 text-sm font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                : "min-h-11 px-5 py-2.5 text-sm font-bold rounded-xl bg-gradient-orange text-white hover:shadow-warm transition-all disabled:opacity-60"
            }
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
