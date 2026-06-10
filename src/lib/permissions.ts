import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Role as LegacyRole } from "@prisma/client";
import { CRITICAL_ADMIN_PERMISSIONS } from "@/lib/permissions/definitions";

export { PERMISSION_DEFINITIONS, ALL_PERMISSION_KEYS } from "@/lib/permissions/definitions";

const permissionCache = new Map<string, { permissions: Set<string>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  const assignments = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const permissions = new Set<string>();
  for (const assignment of assignments) {
    for (const rp of assignment.role.permissions) {
      permissions.add(rp.permission.key);
    }
  }

  permissionCache.set(userId, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return permissions;
}

export function clearPermissionCache(userId?: string): void {
  if (userId) {
    permissionCache.delete(userId);
    return;
  }
  permissionCache.clear();
}

export async function hasPermission(
  userId: string,
  permissionKey: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.has(permissionKey);
}

export async function hasAnyPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionKeys.some((key) => permissions.has(key));
}

export async function hasEveryPermission(
  userId: string,
  permissionKeys: string[]
): Promise<boolean> {
  if (permissionKeys.length === 0) {
    return true;
  }

  const permissions = await getUserPermissions(userId);
  return permissionKeys.every((key) => permissions.has(key));
}

export async function requirePermission(
  userId: string,
  permissionKey: string
): Promise<void> {
  const allowed = await hasPermission(userId, permissionKey);
  if (!allowed) {
    throw new Error("FORBIDDEN");
  }
}

export const getUserDisplayRole = cache(async (userId: string) => {
  const assignments = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
    orderBy: { role: { priority: "asc" } },
  });

  return assignments[0]?.role ?? null;
});

export async function userHasCriticalAdminAccess(userId: string): Promise<boolean> {
  return hasAnyPermission(userId, CRITICAL_ADMIN_PERMISSIONS);
}

export async function countUsersWithCriticalAdminAccess(
  excludeUserId?: string
): Promise<number> {
  const adminRoleUsers = await prisma.userRole.findMany({
    where: {
      userId: excludeUserId ? { not: excludeUserId } : undefined,
      role: {
        permissions: {
          some: {
            permission: {
              key: { in: CRITICAL_ADMIN_PERMISSIONS },
            },
          },
        },
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  return adminRoleUsers.length;
}

/** Map legacy enum role to default app role slug for fallback checks */
export function legacyRoleToSlug(role: LegacyRole): string {
  switch (role) {
    case "ADMIN":
      return "system-administrator";
    case "MODERATOR":
      return "moderator";
    default:
      return "tourist";
  }
}
