import type { Role } from "@prisma/client";

type RoleBadgeProps = {
  role: Role;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  if (role === "USER") return null;

  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-yellow/50 text-accent border border-accent/30">
      {role === "ADMIN" ? "Admin" : "Mod"}
    </span>
  );
}
