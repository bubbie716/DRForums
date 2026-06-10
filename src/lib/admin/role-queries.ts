import { prisma } from "@/lib/prisma";

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

export async function getAllPermissionsGrouped() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  const grouped = new Map<string, typeof permissions>();
  for (const p of permissions) {
    const list = grouped.get(p.category) ?? [];
    list.push(p);
    grouped.set(p.category, list);
  }

  return Array.from(grouped.entries()).map(([category, items]) => ({
    category,
    permissions: items,
  }));
}
