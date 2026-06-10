import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

type AdminRoleBadgeProps = {
  role: Role | string;
  color?: string | null;
  className?: string;
};

export function AdminRoleBadge({ role, color, className }: AdminRoleBadgeProps) {
  const label = typeof role === "string" ? role : role;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide",
        !color && "bg-yellow/40 text-accent border border-accent/20",
        className
      )}
      style={
        color
          ? { backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }
          : undefined
      }
    >
      {label}
    </span>
  );
}
