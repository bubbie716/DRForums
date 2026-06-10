"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  applyPresetToRole,
  type ForumAccessFlags,
  type ForumAccessPresetId,
  getPresetById,
} from "@/lib/forum-access-presets";
import {
  buildFieldChanges,
  createModerationLog,
  MODERATION_ACTIONS,
} from "@/lib/moderation-log";
import { isFullAccessRoleSlug } from "@/lib/system-roles";

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

export type ForumRolePermissionInput = {
  roleId: string;
  canView: boolean;
  canRead: boolean;
  canCreateThreads: boolean;
  canReply: boolean;
  canViewOtherThreads: boolean;
  canModerate: boolean;
};

const PERMISSION_FIELDS: Array<{ key: keyof ForumAccessFlags; label: string }> = [
  { key: "canView", label: "View" },
  { key: "canRead", label: "Read" },
  { key: "canCreateThreads", label: "Create Threads" },
  { key: "canReply", label: "Reply" },
  { key: "canViewOtherThreads", label: "View Other Threads" },
  { key: "canModerate", label: "Moderate" },
];

function validatePermissionInput(input: ForumRolePermissionInput): string | null {
  if (!input.canView && input.canRead) {
    return "People must be able to see the forum in the list before they can open it.";
  }

  if (!input.canRead && (input.canCreateThreads || input.canReply)) {
    return "Posting requires opening and reading the forum first.";
  }

  return null;
}

async function saveCategoryRolePermissions(
  categoryId: string,
  permissions: ForumRolePermissionInput[]
): Promise<AdminActionResult> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const roles = await prisma.appRole.findMany({
    select: { id: true, name: true, slug: true },
  });
  const roleMap = new Map(roles.map((role) => [role.id, role]));

  const existing = await prisma.forumRolePermission.findMany({
    where: { categoryId },
  });
  const existingMap = new Map(existing.map((entry) => [entry.roleId, entry]));

  const changes: Array<{ key: string; label: string; from: string; to: string }> =
    [];

  for (const input of permissions) {
    const role = roleMap.get(input.roleId);
    if (!role) {
      return { success: false, error: "Invalid role selected." };
    }

    if (isFullAccessRoleSlug(role.slug)) {
      continue;
    }

    const validationError = validatePermissionInput(input);
    if (validationError) {
      return { success: false, error: `${role.name}: ${validationError}` };
    }

    const previous = existingMap.get(input.roleId);
    const previousValues: ForumAccessFlags = previous
      ? {
          canView: previous.canView,
          canRead: previous.canRead,
          canCreateThreads: previous.canCreateThreads,
          canReply: previous.canReply,
          canViewOtherThreads: previous.canViewOtherThreads,
          canModerate: previous.canModerate,
        }
      : {
          canView: true,
          canRead: true,
          canCreateThreads: true,
          canReply: true,
          canViewOtherThreads: true,
          canModerate: false,
        };

    const nextValues: ForumAccessFlags = {
      canView: input.canView,
      canRead: input.canRead,
      canCreateThreads: input.canCreateThreads,
      canReply: input.canReply,
      canViewOtherThreads: input.canViewOtherThreads,
      canModerate: input.canModerate,
    };

    const fieldChanges = buildFieldChanges(
      PERMISSION_FIELDS.map((field) => ({
        key: `${role.slug}.${field.key}`,
        label: `${role.name} — ${field.label}`,
        from: previousValues[field.key],
        to: nextValues[field.key],
      }))
    );

    if (fieldChanges.length === 0) {
      continue;
    }

    changes.push(
      ...fieldChanges.map((change) => ({
        key: change.key,
        label: change.label,
        from: change.from,
        to: change.to,
      }))
    );

    await prisma.forumRolePermission.upsert({
      where: {
        roleId_categoryId: {
          roleId: input.roleId,
          categoryId,
        },
      },
      create: {
        roleId: input.roleId,
        categoryId,
        ...nextValues,
      },
      update: nextValues,
    });
  }

  if (changes.length > 0) {
    await createModerationLog({
      action: MODERATION_ACTIONS.CATEGORY_ROLE_PERMISSION_UPDATED,
      details: {
        categoryId,
        name: category.name,
        slug: category.slug,
        changes,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/admin/forums/categories/${categoryId}/edit`);

  return { success: true };
}

async function saveForumRolePermissions(
  forumId: string,
  permissions: ForumRolePermissionInput[]
): Promise<AdminActionResult> {
  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: {
      id: true,
      name: true,
      slug: true,
      category: {
        select: { name: true },
      },
    },
  });

  if (!forum) {
    return { success: false, error: "Forum not found." };
  }

  const roles = await prisma.appRole.findMany({
    select: { id: true, name: true, slug: true },
  });
  const roleMap = new Map(roles.map((role) => [role.id, role]));

  const existing = await prisma.forumRolePermission.findMany({
    where: { forumId },
  });
  const existingMap = new Map(existing.map((entry) => [entry.roleId, entry]));

  const changes: Array<{ key: string; label: string; from: string; to: string }> =
    [];

  for (const input of permissions) {
    const role = roleMap.get(input.roleId);
    if (!role) {
      return { success: false, error: "Invalid role selected." };
    }

    if (isFullAccessRoleSlug(role.slug)) {
      continue;
    }

    const validationError = validatePermissionInput(input);
    if (validationError) {
      return { success: false, error: `${role.name}: ${validationError}` };
    }

    const previous = existingMap.get(input.roleId);
    const previousValues: ForumAccessFlags = previous
      ? {
          canView: previous.canView,
          canRead: previous.canRead,
          canCreateThreads: previous.canCreateThreads,
          canReply: previous.canReply,
          canViewOtherThreads: previous.canViewOtherThreads,
          canModerate: previous.canModerate,
        }
      : {
          canView: true,
          canRead: true,
          canCreateThreads: true,
          canReply: true,
          canViewOtherThreads: true,
          canModerate: false,
        };

    const nextValues: ForumAccessFlags = {
      canView: input.canView,
      canRead: input.canRead,
      canCreateThreads: input.canCreateThreads,
      canReply: input.canReply,
      canViewOtherThreads: input.canViewOtherThreads,
      canModerate: input.canModerate,
    };

    const fieldChanges = buildFieldChanges(
      PERMISSION_FIELDS.map((field) => ({
        key: `${role.slug}.${field.key}`,
        label: `${role.name} — ${field.label}`,
        from: previousValues[field.key],
        to: nextValues[field.key],
      }))
    );

    if (fieldChanges.length === 0) {
      continue;
    }

    changes.push(
      ...fieldChanges.map((change) => ({
        key: change.key,
        label: change.label,
        from: change.from,
        to: change.to,
      }))
    );

    await prisma.forumRolePermission.upsert({
      where: {
        roleId_forumId: {
          roleId: input.roleId,
          forumId,
        },
      },
      create: {
        roleId: input.roleId,
        forumId,
        ...nextValues,
      },
      update: nextValues,
    });
  }

  if (changes.length > 0) {
    await createModerationLog({
      action: MODERATION_ACTIONS.FORUM_ROLE_PERMISSION_UPDATED,
      details: {
        forumId,
        name: forum.name,
        slug: forum.slug,
        categoryName: forum.category.name,
        changes,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/forum/${forum.slug}`);
  revalidatePath(`/admin/forums/${forumId}/edit`);

  return { success: true };
}

export async function updateCategoryRolePermissions(
  categoryId: string,
  permissions: ForumRolePermissionInput[]
): Promise<AdminActionResult> {
  await requireAdminPermission("admin.forums.manage");
  return saveCategoryRolePermissions(categoryId, permissions);
}

export async function updateForumRolePermissions(
  forumId: string,
  permissions: ForumRolePermissionInput[]
): Promise<AdminActionResult> {
  await requireAdminPermission("admin.forums.manage");
  return saveForumRolePermissions(forumId, permissions);
}

export async function applyCategoryRoleAccessPreset(
  categoryId: string,
  presetId: ForumAccessPresetId
): Promise<AdminActionResult> {
  await requireAdminPermission("admin.forums.manage");

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true },
  });

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const roles = await prisma.appRole.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  getPresetById(presetId);

  const permissions = roles
    .filter((role) => !isFullAccessRoleSlug(role.slug))
    .map((role) => {
      const values = applyPresetToRole(presetId, role.slug);
      return {
        roleId: role.id,
        ...values,
      };
    });

  return saveCategoryRolePermissions(categoryId, permissions);
}

export async function applyForumRoleAccessPreset(
  forumId: string,
  presetId: ForumAccessPresetId
): Promise<AdminActionResult> {
  await requireAdminPermission("admin.forums.manage");

  const forum = await prisma.forum.findUnique({
    where: { id: forumId },
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { name: true } },
    },
  });

  if (!forum) {
    return { success: false, error: "Forum not found." };
  }

  const roles = await prisma.appRole.findMany({
    orderBy: [{ priority: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  getPresetById(presetId);

  const permissions = roles
    .filter((role) => !isFullAccessRoleSlug(role.slug))
    .map((role) => {
      const values = applyPresetToRole(presetId, role.slug);
      return {
        roleId: role.id,
        ...values,
      };
    });

  return saveForumRolePermissions(forumId, permissions);
}
