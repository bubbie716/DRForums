"use client";

import { cn } from "@/lib/utils";

type AdminNoticeProps = {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
};

export function AdminNotice({ type, message, onDismiss }: AdminNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium flex items-start justify-between gap-3",
        type === "success" && "bg-green-50 border-green-200 text-green-800",
        type === "error" && "bg-red-50 border-red-200 text-red-800",
        type === "info" && "bg-yellow/30 border-border text-text-dark"
      )}
      role="alert"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-current opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
