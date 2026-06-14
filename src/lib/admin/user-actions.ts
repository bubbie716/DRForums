"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, bumpUserSessionVersion, invalidateAllUserSessions } from "@/lib/auth";
import { assertAdminPermission } from "@/lib/admin/auth";
import { getSessionUser } from "@/lib/auth";
import {
  clearPermissionCache,
  countUsersWithCriticalAdminAccess,
  userHasCriticalAdminAccess,
} from "@/lib/permissions";
import { createRoleChangeNotification } from "@/lib/forum-notifications/create";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";
import { deleteManagedProfileUpload } from "@/lib/profile/uploads";
import { getActiveBan } from "@/lib/bans";
import {
  demoteMemberToTouristAfterMinecraftUnlink,
  syncUserRolesAfterChange,
} from "@/lib/user-member-roles";
import { isStaffRoleSlug } from "@/lib/system-roles";
import {
  isFullAccessRoleSlug,
  SYSTEM_ROLE_SLUGS,
} from "@/lib/system-roles";
import {
  canActorManageRolePriority,
  getActorTopRolePriority,
  roleHierarchyError,
} from "@/lib/role-hierarchy";
import type { Role as LegacyRole } from "@prisma/client";

function legacyRoleForSlug(slug: string): LegacyRole {
  if (isFullAccessRoleSlug(slug)) {
    return "ADMIN";
  }
  if (slug === SYSTEM_ROLE_SLUGS.MODERATOR) {
    return "MODERATOR";
  }
  return "USER";
}

// TODO: Consolidate duplicated AdminActionResult types across admin action modules.
export type AdminActionResult =
  | { success: true; message?: string }
  | { success: false; error: string };

const RESET_PASSWORD = "changeme123";

export async function adminResetUserPassword(
  userId: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.resetPassword");
  if (!perm.success) return perm;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) return { success: false, error: "User not found." };

  const passwordHash = await hashPassword(RESET_PASSWORD);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await invalidateAllUserSessions(userId);
  await bumpUserSessionVersion(userId);

  await createModerationLog({
    actorId: actor.id,
    targetUserId: userId,
    action: MODERATION_ACTIONS.USER_PASSWORD_RESET,
    details: { username: target.username },
  });

  revalidatePath(`/admin/users/${userId}`);
  return {
    success: true,
    message: "Password reset. Tell the user to log in and change it immediately.",
  };
}

export async function adminResetUserProfile(
  userId: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.resetProfile");
  if (!perm.success) return perm;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bannerUrl: true,
    },
  });
  if (!target) return { success: false, error: "User not found." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      bio: null,
      avatarUrl: null,
      bannerUrl: null,
      signature: null,
      signatureEnabled: true,
      profileUpdatedAt: new Date(),
    },
  });

  await Promise.all([
    deleteManagedProfileUpload(target.avatarUrl),
    deleteManagedProfileUpload(target.bannerUrl),
  ]);

  await createModerationLog({
    actorId: actor.id,
    targetUserId: userId,
    action: MODERATION_ACTIONS.USER_PROFILE_RESET,
    details: { username: target.username },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath(`/profile/${target.username}`);
  return { success: true, message: "Public profile has been reset to defaults." };
}

export async function adminUnlinkMinecraft(
  userId: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.unlinkMinecraft");
  if (!perm.success) return perm;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      minecraftUsername: true,
      userRoles: {
        include: {
          role: {
            select: { slug: true },
          },
        },
      },
    },
  });
  if (!target) return { success: false, error: "User not found." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      minecraftUuid: null,
      minecraftUsername: null,
      minecraftLinkedAt: null,
    },
  });

  const hasStaffRole = target.userRoles.some((assignment) =>
    isStaffRoleSlug(assignment.role.slug)
  );

  if (hasStaffRole) {
    await syncUserRolesAfterChange(userId);
  } else {
    await demoteMemberToTouristAfterMinecraftUnlink(userId);
  }

  await createModerationLog({
    actorId: actor.id,
    targetUserId: userId,
    action: MODERATION_ACTIONS.MINECRAFT_UNLINKED,
    details: {
      username: target.username,
      previousMinecraft: target.minecraftUsername,
    },
  });

  revalidatePath(`/admin/users/${userId}`);
  return { success: true, message: "Minecraft account unlinked." };
}

export async function adminAssignRole(
  userId: string,
  roleId: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.changeRole");
  if (!perm.success) return perm;

  const role = await prisma.appRole.findUnique({ where: { id: roleId } });
  if (!role) return { success: false, error: "Role not found." };

  const actorTopPriority = await getActorTopRolePriority(actor.id);
  if (!canActorManageRolePriority(actorTopPriority, role.priority)) {
    return { success: false, error: roleHierarchyError(role.name) };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) return { success: false, error: "User not found." };

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId, assignedById: actor.id },
    update: { assignedById: actor.id },
  });

  const assignments = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
    orderBy: { role: { priority: "asc" } },
  });
  const topSlug = assignments[0]?.role.slug;

  await prisma.user.update({
    where: { id: userId },
    data: { role: topSlug ? legacyRoleForSlug(topSlug) : "USER" },
  });

  await syncUserRolesAfterChange(userId);

  await createModerationLog({
    actorId: actor.id,
    targetUserId: userId,
    action: MODERATION_ACTIONS.USER_ROLE_ASSIGNED,
    details: { username: target.username, role: role.name },
  });

  await createRoleChangeNotification({
    userId,
    actorUserId: actor.id,
    type: "ROLE_ASSIGNED",
    roleName: role.name,
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/messages");
  return { success: true, message: `Assigned role: ${role.name}` };
}

export async function adminRemoveRole(
  userId: string,
  roleId: string
): Promise<AdminActionResult> {
  const actor = await getSessionUser();
  if (!actor) return { success: false, error: "Not authenticated." };

  const perm = await assertAdminPermission(actor.id, "user.changeRole");
  if (!perm.success) return perm;

  const role = await prisma.appRole.findUnique({ where: { id: roleId } });
  if (!role) return { success: false, error: "Role not found." };

  const actorTopPriority = await getActorTopRolePriority(actor.id);
  if (!canActorManageRolePriority(actorTopPriority, role.priority)) {
    return { success: false, error: roleHierarchyError(role.name) };
  }

  const hasCritical = await userHasCriticalAdminAccess(userId);
  if (hasCritical && isFullAccessRoleSlug(role.slug)) {
    const others = await countUsersWithCriticalAdminAccess(userId);
    if (others === 0) {
      return {
        success: false,
        error: "You can't remove the last administrator on the site.",
      };
    }
  }

  await prisma.userRole.deleteMany({ where: { userId, roleId } });

  const remaining = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
    orderBy: { role: { priority: "asc" } },
  });

  const topRole = remaining[0]?.role.slug;
  await prisma.user.update({
    where: { id: userId },
    data: { role: topRole ? legacyRoleForSlug(topRole) : "USER" },
  });

  await syncUserRolesAfterChange(userId);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });

  await createModerationLog({
    actorId: actor.id,
    targetUserId: userId,
    action: MODERATION_ACTIONS.USER_ROLE_REMOVED,
    details: { username: target?.username, role: role.name },
  });

  await createRoleChangeNotification({
    userId,
    actorUserId: actor.id,
    type: "ROLE_REMOVED",
    roleName: role.name,
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/messages");
  return { success: true, message: `Removed role: ${role.name}` };
}

export async function getUserActiveBanForAdmin(userId: string) {
  return getActiveBan(userId);
}
