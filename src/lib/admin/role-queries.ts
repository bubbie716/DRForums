import { prisma } from "@/lib/prisma";
import { PERMISSION_DEFINITIONS } from "@/lib/permissions/definitions";

const PERMISSION_DEFINITION_BY_KEY = new Map(
  PERMISSION_DEFINITIONS.map((definition) => [definition.key, definition])
);

export async function getAdminRoles() {
  const roles = await prisma.appRole.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { users: true, permissions: true } },
    },
  });
  return roles;
}

export async function getAdminRoleDetail(roleId: string) {
  return prisma.appRole.findUnique({
    where: { id: roleId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });
}

function normalizePermissionLabel<
  T extends {
    key: string;
    label: string;
    category: string;
    description: string | null;
  },
>(permission: T): T {
  const definition = PERMISSION_DEFINITION_BY_KEY.get(permission.key);
  if (!definition) {
    return permission;
  }

  return {
    ...permission,
    label: definition.label,
    category: definition.category,
    description: definition.description ?? null,
  };
}

export async function getAllPermissionsGrouped() {
  const validKeys = PERMISSION_DEFINITIONS.map((definition) => definition.key);

  const permissions = await prisma.permission.findMany({
    where: { key: { in: validKeys } },
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const grouped = new Map<
    string,
    ReturnType<typeof normalizePermissionLabel<(typeof permissions)[number]>>[]
  >();

  for (const permission of permissions) {
    const normalized = normalizePermissionLabel(permission);
    const list = grouped.get(normalized.category) ?? [];
    list.push(normalized);
    grouped.set(normalized.category, list);
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    permissions: items.sort((a, b) => a.label.localeCompare(b.label)),
  }));
}
