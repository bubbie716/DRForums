import { prisma } from "@/lib/prisma";
import {
  DEFAULT_FORUM_ACCESS,
  FULL_FORUM_ACCESS,
  type ForumAccessFlags,
} from "@/lib/forum-access-presets";
import { isFullAccessRoleSlug } from "@/lib/system-roles";

export type ForumRoleAccessRow = {
  roleId: string;
  roleName: string;
  roleSlug: string;
  roleColor: string | null;
  isAdminRole: boolean;
  canView: boolean;
  canRead: boolean;
  canCreateThreads: boolean;
  canReply: boolean;
  canViewOtherThreads: boolean;
  canModerate: boolean;
  hasOverride: boolean;
};

function mergeRoleAccess(
  roleSlug: string,
  override: ForumAccessFlags | null
): ForumAccessFlags & { hasOverride: boolean } {
  if (isFullAccessRoleSlug(roleSlug)) {
    return { ...FULL_FORUM_ACCESS, hasOverride: false };
  }

  if (!override) {
    return { ...DEFAULT_FORUM_ACCESS, hasOverride: false };
  }

  return { ...override, hasOverride: true };
}

export async function getCategoryRoleAccessRows(
  categoryId: string
): Promise<ForumRoleAccessRow[]> {
  const [roles, overrides] = await Promise.all([
    prisma.appRole.findMany({
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
      },
    }),
    prisma.forumRolePermission.findMany({
      where: { categoryId },
      select: {
        roleId: true,
        canView: true,
        canRead: true,
        canCreateThreads: true,
        canReply: true,
        canViewOtherThreads: true,
        canModerate: true,
      },
    }),
  ]);

  const overrideMap = new Map(overrides.map((entry) => [entry.roleId, entry]));

  return roles.map((role) => {
    const override = overrideMap.get(role.id) ?? null;
    const access = mergeRoleAccess(role.slug, override);

    return {
      roleId: role.id,
      roleName: role.name,
      roleSlug: role.slug,
      roleColor: role.color,
      isAdminRole: isFullAccessRoleSlug(role.slug),
      canView: access.canView,
      canRead: access.canRead,
      canCreateThreads: access.canCreateThreads,
      canReply: access.canReply,
      canViewOtherThreads: access.canViewOtherThreads,
      canModerate: access.canModerate,
      hasOverride: access.hasOverride,
    };
  });
}

export async function getForumRoleAccessRows(
  forumId: string
): Promise<ForumRoleAccessRow[]> {
  const [roles, overrides] = await Promise.all([
    prisma.appRole.findMany({
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
      },
    }),
    prisma.forumRolePermission.findMany({
      where: { forumId },
      select: {
        roleId: true,
        canView: true,
        canRead: true,
        canCreateThreads: true,
        canReply: true,
        canViewOtherThreads: true,
        canModerate: true,
      },
    }),
  ]);

  const overrideMap = new Map(overrides.map((entry) => [entry.roleId, entry]));

  return roles.map((role) => {
    const override = overrideMap.get(role.id) ?? null;
    const access = mergeRoleAccess(role.slug, override);

    return {
      roleId: role.id,
      roleName: role.name,
      roleSlug: role.slug,
      roleColor: role.color,
      isAdminRole: isFullAccessRoleSlug(role.slug),
      canView: access.canView,
      canRead: access.canRead,
      canCreateThreads: access.canCreateThreads,
      canReply: access.canReply,
      canViewOtherThreads: access.canViewOtherThreads,
      canModerate: access.canModerate,
      hasOverride: access.hasOverride,
    };
  });
}
