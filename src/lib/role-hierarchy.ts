import { cache } from "react";
import { prisma } from "@/lib/prisma";

/** Lower priority number = higher rank (Founder is 1). */
export const getActorTopRolePriority = cache(
  async (userId: string): Promise<number | null> => {
    const assignment = await prisma.userRole.findFirst({
      where: { userId },
      orderBy: { role: { priority: "asc" } },
      select: {
        role: {
          select: { priority: true },
        },
      },
    });

    return assignment?.role.priority ?? null;
  }
);

export function canActorManageRolePriority(
  actorTopPriority: number | null,
  targetRolePriority: number
): boolean {
  if (actorTopPriority === null) {
    return false;
  }

  return targetRolePriority >= actorTopPriority;
}

export function roleHierarchyError(targetRoleName: string): string {
  return `You can't manage the ${targetRoleName} role because it outranks your own.`;
}
