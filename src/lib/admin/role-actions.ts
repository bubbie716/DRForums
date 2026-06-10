"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertAdminPermission } from "@/lib/admin/auth";
import {
  buildFieldChanges,
  createModerationLog,
  MODERATION_ACTIONS,
} from "@/lib/moderation-log";
import { createRoleChangeNotification } from "@/lib/forum-notifications/create";
import { clearPermissionCache } from "@/lib/permissions";
import { CRITICAL_ADMIN_PERMISSIONS } from "@/lib/permissions/definitions";
import { isFullAccessRoleSlug } from "@/lib/system-roles";
import {
  expandPermissionKeys,
  validatePermissionKeys,
} from "@/lib/permissions/requirements";

export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

type RoleInput = {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  permissionIds: string[];
};

async function getNextRolePriority(): Promise<number> {
  const result = await prisma.appRole.aggregate({
    _max: { priority: true },
  });

  return (result._max.priority ?? 0) + 1;
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function resolvePermissionIds(
  permissionIds: string[]
): Promise<
  { success: true; permissionIds: string[] } | { success: false; error: string }
> {
  const selectedPermissions = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true, key: true },
  });

  const validation = validatePermissionKeys(
    selectedPermissions.map((permission) => permission.key)
  );
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const expandedKeys = expandPermissionKeys(
    selectedPermissions.map((permission) => permission.key)
  );
  const expandedPermissions = await prisma.permission.findMany({
    where: { key: { in: [...expandedKeys] } },
    select: { id: true },
  });

  return {
    success: true,
    permissionIds: expandedPermissions.map((permission) => permission.id),
  };
}

export async function adminCreateRole(input: RoleInput): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.roles.manage");
  if (!perm.success) return perm;

  const slug = normalizeSlug(input.slug);
  if (!slug) return { success: false, error: "Internal ID is required." };

  const existing = await prisma.appRole.findUnique({ where: { slug } });
  if (existing) return { success: false, error: "That internal ID is already taken." };

  if (input.isDefault) {
    await prisma.appRole.updateMany({ data: { isDefault: false } });
  }

  const resolvedPermissions = await resolvePermissionIds(input.permissionIds);
  if (!resolvedPermissions.success) {
    return resolvedPermissions;
  }

  const role = await prisma.appRole.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      priority: await getNextRolePriority(),
      isDefault: input.isDefault,
      isSystem: false,
      permissions: {
        create: resolvedPermissions.permissionIds.map((permissionId) => ({
          permissionId,
        })),
      },
    },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.ROLE_CREATED,
    details: {
      roleId: role.id,
      name: role.name,
      slug: role.slug,
      permissionCount: input.permissionIds.length,
    },
  });

  revalidatePath("/admin/roles");
  return { success: true, message: "Role created." };
}

export async function adminUpdateRole(
  roleId: string,
  input: RoleInput
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.roles.manage");
  if (!perm.success) return perm;

  const role = await prisma.appRole.findUnique({ where: { id: roleId } });
  if (!role) return { success: false, error: "Role not found." };

  const slug = normalizeSlug(input.slug);
  const slugConflict = await prisma.appRole.findFirst({
    where: { slug, id: { not: roleId } },
  });
  if (slugConflict) return { success: false, error: "That internal ID is already taken." };

  if (role.isSystem && isFullAccessRoleSlug(role.slug)) {
    const newPerms = await prisma.permission.findMany({
      where: { id: { in: input.permissionIds } },
      select: { key: true },
    });
    const keys = new Set(newPerms.map((p) => p.key));
    for (const critical of CRITICAL_ADMIN_PERMISSIONS) {
      if (!keys.has(critical)) {
        return {
          success: false,
          error: "Founder and System Administrator must always keep full admin access.",
        };
      }
    }
  }

  const previousPermissionIds = (
    await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    })
  ).map((entry) => entry.permissionId);

  if (input.isDefault) {
    await prisma.appRole.updateMany({
      where: { id: { not: roleId } },
      data: { isDefault: false },
    });
  }

  const resolvedPermissions = await resolvePermissionIds(input.permissionIds);
  if (!resolvedPermissions.success) {
    return resolvedPermissions;
  }

  await prisma.$transaction([
    prisma.appRole.update({
      where: { id: roleId },
      data: {
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        color: input.color?.trim() || null,
        isDefault: input.isDefault,
      },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...resolvedPermissions.permissionIds.map((permissionId) =>
      prisma.rolePermission.create({ data: { roleId, permissionId } })
    ),
  ]);

  const affectedUsers = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true },
  });
  for (const u of affectedUsers) {
    clearPermissionCache(u.userId);
  }

  const addedPermissionIds = resolvedPermissions.permissionIds.filter(
    (permissionId) => !previousPermissionIds.includes(permissionId)
  );
  const removedPermissionIds = previousPermissionIds.filter(
    (permissionId) => !resolvedPermissions.permissionIds.includes(permissionId)
  );
  const permissionChanges =
    addedPermissionIds.length > 0 || removedPermissionIds.length > 0
      ? await prisma.permission.findMany({
          where: {
            id: { in: [...addedPermissionIds, ...removedPermissionIds] },
          },
          select: { id: true, key: true },
        })
      : [];
  const permissionLabelById = new Map(
    permissionChanges.map((permission) => [permission.id, permission.key])
  );

  const changes = buildFieldChanges([
    { key: "name", label: "Name", from: role.name, to: input.name.trim() },
    { key: "slug", label: "Internal ID", from: role.slug, to: slug },
    {
      key: "description",
      label: "Description",
      from: role.description,
      to: input.description?.trim() || null,
    },
    { key: "color", label: "Color", from: role.color, to: input.color?.trim() || null },
    { key: "isDefault", label: "Default role", from: role.isDefault, to: input.isDefault },
  ]);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.ROLE_UPDATED,
    details: {
      roleId,
      name: input.name.trim(),
      slug,
      changes,
      permissionsAdded: addedPermissionIds.map(
        (permissionId) => permissionLabelById.get(permissionId) ?? permissionId
      ),
      permissionsRemoved: removedPermissionIds.map(
        (permissionId) => permissionLabelById.get(permissionId) ?? permissionId
      ),
    },
  });

  revalidatePath("/admin/roles");
  revalidatePath(`/admin/roles/${roleId}/edit`);
  return { success: true, message: "Role updated." };
}

export async function adminDeleteRole(roleId: string): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.roles.manage");
  if (!perm.success) return perm;

  const role = await prisma.appRole.findUnique({
    where: { id: roleId },
    include: {
      _count: { select: { users: true } },
      users: { select: { userId: true } },
    },
  });
  if (!role) return { success: false, error: "Role not found." };
  if (role.isSystem) return { success: false, error: "Built-in roles can't be deleted." };

  const affectedUserIds = role.users.map((assignment) => assignment.userId);

  await prisma.appRole.delete({ where: { id: roleId } });

  for (const userId of affectedUserIds) {
    clearPermissionCache(userId);
    await createRoleChangeNotification({
      userId,
      actorUserId: actor.id,
      type: "ROLE_REMOVED",
      roleName: role.name,
    });
  }

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.ROLE_DELETED,
    details: {
      roleId,
      name: role.name,
      slug: role.slug,
      usersUnassigned: role._count.users,
    },
  });

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
  revalidatePath("/messages");
  const message =
    role._count.users > 0
      ? `Role deleted. ${role._count.users} member${
          role._count.users === 1 ? "" : "s"
        } removed from this role.`
      : "Role deleted.";
  return { success: true, message };
}

export async function moveRoleOrder(
  roleId: string,
  direction: "up" | "down"
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "admin.roles.manage");
  if (!perm.success) return perm;

  const roles = await prisma.appRole.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, priority: true },
  });

  const index = roles.findIndex((role) => role.id === roleId);
  if (index === -1) {
    return { success: false, error: "Role not found." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= roles.length) {
    return { success: true };
  }

  const current = roles[index];
  const target = roles[swapIndex];

  await prisma.$transaction([
    prisma.appRole.update({
      where: { id: current.id },
      data: { priority: target.priority },
    }),
    prisma.appRole.update({
      where: { id: target.id },
      data: { priority: current.priority },
    }),
  ]);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.ROLE_REORDERED,
    details: {
      roleId: current.id,
      name: current.name,
      slug: current.slug,
      direction,
      changes: buildFieldChanges([
        {
          key: "priority",
          label: "Rank",
          from: current.priority,
          to: target.priority,
        },
      ]),
    },
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

export async function adminCreateRoleAndRedirect(formData: FormData) {
  const permissionIds = formData.getAll("permissionIds").map(String);
  const result = await adminCreateRole({
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    color: String(formData.get("color") ?? ""),
    isDefault: formData.get("isDefault") === "on",
    permissionIds,
  });
  if (result.success) redirect("/admin/roles?notice=role-created");
  return result;
}

export async function adminUpdateRoleAndRedirect(roleId: string, formData: FormData) {
  const permissionIds = formData.getAll("permissionIds").map(String);
  const result = await adminUpdateRole(roleId, {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    color: String(formData.get("color") ?? ""),
    isDefault: formData.get("isDefault") === "on",
    permissionIds,
  });
  if (result.success) redirect(`/admin/roles/${roleId}/edit?notice=role-updated`);
  return result;
}
