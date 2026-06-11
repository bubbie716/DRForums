import type { Role } from "@prisma/client";
import type { DisplayRole } from "@/lib/display-role";
import { cn } from "@/lib/utils";

export type { DisplayRole };

type RoleBadgeProps = {
  displayRole?: DisplayRole | null;
  /** @deprecated Legacy enum role — used in thread posts until migrated */
  role?: Role;
  className?: string;
};

export function RoleBadge({ displayRole, role, className }: RoleBadgeProps) {
  if (displayRole) {
    const { name, color } = displayRole;

    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
          !color && "bg-yellow/40 text-accent-dark border border-yellow",
          className
        )}
        style={
          color
            ? {
                backgroundColor: `${color}25`,
                color,
                border: `1px solid ${color}50`,
              }
            : undefined
        }
      >
        {name}
      </span>
    );
  }

  if (!role || role === "USER") return null;

  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-yellow/50 text-accent border border-accent/30">
      {role === "ADMIN" ? "Admin" : "Mod"}
    </span>
  );
}
