import { cn } from "@/lib/utils";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: "default" | "accent" | "warning" | "danger";
};

export function AdminStatCard({
  label,
  value,
  subtext,
  variant = "default",
}: AdminStatCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6",
        variant === "accent" && "border-accent/30 bg-yellow/10",
        variant === "warning" && "border-yellow/60 bg-yellow/20",
        variant === "danger" && "border-red-200 bg-red-50/50"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold text-text-dark">{value}</p>
      {subtext ? (
        <p className="mt-1 text-sm text-text-secondary">{subtext}</p>
      ) : null}
    </div>
  );
}
