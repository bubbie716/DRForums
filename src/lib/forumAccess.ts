import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Role as LegacyRole } from "@prisma/client";
import {
  DEFAULT_FORUM_ACCESS,
  FULL_FORUM_ACCESS,
  type ForumAccessFlags,
} from "@/lib/forum-access-presets";
import { isFullAccessRoleSlug } from "@/lib/system-roles";
import { hasPermission } from "@/lib/permissions";

export type ForumAccess = ForumAccessFlags;

type PermissionOverride = {
  roleId: string;
  categoryId: string | null;
  forumId: string | null;
  canView: boolean;
  canRead: boolean;
  canCreateThreads: boolean;
  canReply: boolean;
  canViewOtherThreads: boolean;
  canModerate: boolean;
};

type AccessFlag = keyof ForumAccess;

const ACCESS_FLAGS: AccessFlag[] = [
  "canView",
  "canRead",
  "canCreateThreads",
  "canReply",
  "canViewOtherThreads",
  "canModerate",
];

async function getDefaultRoleId(): Promise<string | null> {
  const role = await prisma.appRole.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  return role?.id ?? null;
}

export const getUserRoleIds = cache(async (userId: string | null): Promise<string[]> => {
  if (userId) {
    const assignments = await prisma.userRole.findMany({
      where: { userId },
      select: { roleId: true },
    });

    if (assignments.length > 0) {
      return assignments.map((assignment) => assignment.roleId);
    }
  }

  const defaultRoleId = await getDefaultRoleId();
  return defaultRoleId ? [defaultRoleId] : [];
});

export const userHasAdminRole = cache(async (userId: string | null): Promise<boolean> => {
  if (!userId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      userRoles: {
        include: {
          role: {
            select: { slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    return false;
  }

  if (user.role === LegacyRole.ADMIN) {
    return true;
  }

  return user.userRoles.some((assignment) =>
    isFullAccessRoleSlug(assignment.role.slug)
  );
});

async function loadOverridesForRoles(roleIds: string[]): Promise<PermissionOverride[]> {
  if (roleIds.length === 0) {
    return [];
  }

  return prisma.forumRolePermission.findMany({
    where: { roleId: { in: roleIds } },
    select: {
      roleId: true,
      categoryId: true,
      forumId: true,
      canView: true,
      canRead: true,
      canCreateThreads: true,
      canReply: true,
      canViewOtherThreads: true,
      canModerate: true,
    },
  });
}

function getOverrideForRole(
  overrides: PermissionOverride[],
  roleId: string,
  forumId: string,
  categoryId: string
): ForumAccessFlags | null {
  const forumOverride = overrides.find(
    (entry) => entry.roleId === roleId && entry.forumId === forumId
  );

  if (forumOverride) {
    return {
      canView: forumOverride.canView,
      canRead: forumOverride.canRead,
      canCreateThreads: forumOverride.canCreateThreads,
      canReply: forumOverride.canReply,
      canViewOtherThreads: forumOverride.canViewOtherThreads,
      canModerate: forumOverride.canModerate,
    };
  }

  const categoryOverride = overrides.find(
    (entry) => entry.roleId === roleId && entry.categoryId === categoryId
  );

  if (categoryOverride) {
    return {
      canView: categoryOverride.canView,
      canRead: categoryOverride.canRead,
      canCreateThreads: categoryOverride.canCreateThreads,
      canReply: categoryOverride.canReply,
      canViewOtherThreads: categoryOverride.canViewOtherThreads,
      canModerate: categoryOverride.canModerate,
    };
  }

  return null;
}

function resolveAccessFlag(
  roleIds: string[],
  forumId: string,
  categoryId: string,
  flag: AccessFlag,
  overrides: PermissionOverride[]
): boolean {
  for (const roleId of roleIds) {
    const roleAccess = getOverrideForRole(overrides, roleId, forumId, categoryId);
    const value = roleAccess ? roleAccess[flag] : DEFAULT_FORUM_ACCESS[flag];
    if (value) {
      return true;
    }
  }

  return false;
}

function buildForumAccess(
  roleIds: string[],
  forumId: string,
  categoryId: string,
  overrides: PermissionOverride[]
): ForumAccess {
  return {
    canView: resolveAccessFlag(roleIds, forumId, categoryId, "canView", overrides),
    canRead: resolveAccessFlag(roleIds, forumId, categoryId, "canRead", overrides),
    canCreateThreads: resolveAccessFlag(
      roleIds,
      forumId,
      categoryId,
      "canCreateThreads",
      overrides
    ),
    canReply: resolveAccessFlag(roleIds, forumId, categoryId, "canReply", overrides),
    canViewOtherThreads: resolveAccessFlag(
      roleIds,
      forumId,
      categoryId,
      "canViewOtherThreads",
      overrides
    ),
    canModerate: resolveAccessFlag(
      roleIds,
      forumId,
      categoryId,
      "canModerate",
      overrides
    ),
  };
}

export async function getForumAccess(
  userId: string | null,
  forumId: string
): Promise<ForumAccess> {
  if (userId && (await userHasAdminRole(userId))) {
    return FULL_FORUM_ACCESS;
  }

  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: { id: true, categoryId: true },
  });

  if (!forum) {
    return HIDDEN_ACCESS();
  }

  const roleIds = await getUserRoleIds(userId);
  const overrides = await loadOverridesForRoles(roleIds);
  return buildForumAccess(roleIds, forum.id, forum.categoryId, overrides);
}

function HIDDEN_ACCESS(): ForumAccess {
  return {
    canView: false,
    canRead: false,
    canCreateThreads: false,
    canReply: false,
    canViewOtherThreads: false,
    canModerate: false,
  };
}

export async function canViewForum(
  userId: string | null,
  forumId: string
): Promise<boolean> {
  const access = await getForumAccess(userId, forumId);
  return access.canView;
}

export async function canReadForum(
  userId: string | null,
  forumId: string
): Promise<boolean> {
  const access = await getForumAccess(userId, forumId);
  return access.canRead;
}

export async function canCreateThread(
  userId: string | null,
  forumId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  if (!(await hasPermission(userId, "forum.thread.create"))) {
    return false;
  }

  const access = await getForumAccess(userId, forumId);
  return access.canCreateThreads;
}

export async function canReplyToThread(
  userId: string | null,
  threadId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      authorId: true,
      forumId: true,
    },
  });

  if (!thread) {
    return false;
  }

  if (!(await hasPermission(userId, "forum.thread.reply"))) {
    return false;
  }

  const access = await getForumAccess(userId, thread.forumId);
  if (!access.canReply) {
    return false;
  }

  if (access.canViewOtherThreads || access.canModerate) {
    return true;
  }

  return thread.authorId === userId;
}

export async function canViewThread(
  userId: string | null,
  threadId: string
): Promise<boolean> {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: {
      authorId: true,
      forumId: true,
      forum: {
        select: { categoryId: true },
      },
    },
  });

  if (!thread) {
    return false;
  }

  const access = await getForumAccess(userId, thread.forumId);
  if (!access.canView) {
    return false;
  }

  if (!access.canRead) {
    return false;
  }

  if (access.canViewOtherThreads || access.canModerate) {
    return true;
  }

  return userId !== null && thread.authorId === userId;
}

export async function canModerateForum(
  userId: string | null,
  forumId: string
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  const access = await getForumAccess(userId, forumId);
  return access.canModerate;
}

export async function getForumAccessMap(
  userId: string | null,
  forumIds: string[]
): Promise<Map<string, ForumAccess>> {
  if (forumIds.length === 0) {
    return new Map();
  }

  if (userId && (await userHasAdminRole(userId))) {
    return new Map(forumIds.map((forumId) => [forumId, FULL_FORUM_ACCESS]));
  }

  const forums = await prisma.forum.findMany({
    where: { id: { in: forumIds } },
    select: { id: true, categoryId: true },
  });

  const roleIds = await getUserRoleIds(userId);
  const overrides = await loadOverridesForRoles(roleIds);

  const map = new Map<string, ForumAccess>();
  for (const forum of forums) {
    map.set(
      forum.id,
      buildForumAccess(roleIds, forum.id, forum.categoryId, overrides)
    );
  }

  return map;
}

export function isAccessFlag(value: string): value is AccessFlag {
  return ACCESS_FLAGS.includes(value as AccessFlag);
}
