import { cn } from "@/lib/utils";

type AdminStatusBadgeProps = {
  label: string;
  variant?: "muted" | "warning" | "danger";
};

export function AdminStatusBadge({
  label,
  variant = "muted",
}: AdminStatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border",
        variant === "muted" &&
          "bg-surface text-text-secondary border-border",
        variant === "warning" &&
          "bg-yellow/50 text-accent border-accent/30",
        variant === "danger" &&
          "bg-red-50 text-red-700 border-red-200"
      )}
    >
      {label}
    </span>
  );
}
