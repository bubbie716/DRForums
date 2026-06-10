"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { assertAdminPermission } from "@/lib/admin/auth";
import {
  normalizeAdminSlug,
  validateAdminDescription,
  validateAdminName,
  validateAdminSlug,
  validateSortOrder,
} from "@/lib/admin/validation";
import {
  buildFieldChanges,
  createModerationLog,
  MODERATION_ACTIONS,
} from "@/lib/moderation-log";

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

export type AdminDeleteCategoryResult =
  | { success: true; deletedForums: number; deletedThreads: number }
  | { success: false; error: string };

type CategoryInput = {
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isVisible: boolean;
};

type ForumInput = {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isVisible: boolean;
  isLocked: boolean;
};

function revalidateForumPaths() {
  revalidatePath("/");
  revalidatePath("/admin/forums");
}

async function requireForumStructureAdmin() {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false as const, error: "Not authenticated." };
  }

  const permission = await assertAdminPermission(actor.id, "admin.forums.manage");
  if (!permission.success) {
    return permission;
  }

  return { success: true as const, actor };
}

async function ensureUniqueCategorySlug(
  slug: string,
  excludeId?: string
): Promise<AdminActionResult | null> {
  const existing = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && existing.id !== excludeId) {
    return { success: false, error: "A category with this URL name already exists." };
  }

  return null;
}

async function ensureUniqueForumSlug(
  slug: string,
  excludeId?: string
): Promise<AdminActionResult | null> {
  const existing = await prisma.forum.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && existing.id !== excludeId) {
    return {
      success: false,
      error: "A subcategory with this URL name already exists.",
    };
  }

  return null;
}

function validateCategoryInput(input: CategoryInput): AdminActionResult | null {
  const nameValidation = validateAdminName(input.name, "Category name");
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  const slugValidation = validateAdminSlug(input.slug, "Category URL name");
  if (!slugValidation.valid) {
    return { success: false, error: slugValidation.error };
  }

  const descriptionValidation = validateAdminDescription(input.description);
  if (!descriptionValidation.valid) {
    return { success: false, error: descriptionValidation.error };
  }

  const sortOrderValidation = validateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid) {
    return { success: false, error: sortOrderValidation.error };
  }

  return null;
}

function validateForumInput(input: ForumInput): AdminActionResult | null {
  if (!input.categoryId) {
    return { success: false, error: "Parent category is required." };
  }

  const nameValidation = validateAdminName(input.name, "Subcategory name");
  if (!nameValidation.valid) {
    return { success: false, error: nameValidation.error };
  }

  const slugValidation = validateAdminSlug(input.slug, "Subcategory URL name");
  if (!slugValidation.valid) {
    return { success: false, error: slugValidation.error };
  }

  const descriptionValidation = validateAdminDescription(input.description);
  if (!descriptionValidation.valid) {
    return { success: false, error: descriptionValidation.error };
  }

  const sortOrderValidation = validateSortOrder(input.sortOrder);
  if (!sortOrderValidation.valid) {
    return { success: false, error: sortOrderValidation.error };
  }

  return null;
}

export async function createCategory(
  input: CategoryInput
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const validationError = validateCategoryInput(input);
  if (validationError) {
    return validationError;
  }

  const slug = normalizeAdminSlug(input.slug);
  const slugError = await ensureUniqueCategorySlug(slug);
  if (slugError) {
    return slugError;
  }

  const category = await prisma.category.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.CATEGORY_CREATED,
    details: {
      categoryId: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      sortOrder: category.sortOrder,
      isVisible: category.isVisible,
    },
  });

  revalidateForumPaths();
  redirect("/admin/forums");
}

export async function updateCategory(
  id: string,
  input: CategoryInput
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const validationError = validateCategoryInput(input);
  if (validationError) {
    return validationError;
  }

  const slug = normalizeAdminSlug(input.slug);
  const slugError = await ensureUniqueCategorySlug(slug, id);
  if (slugError) {
    return slugError;
  }

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const trimmedName = input.name.trim();
  const trimmedDescription = input.description?.trim() || null;
  const changes = buildFieldChanges([
    { key: "name", label: "Name", from: category.name, to: trimmedName },
    { key: "slug", label: "URL name", from: category.slug, to: slug },
    {
      key: "description",
      label: "Description",
      from: category.description,
      to: trimmedDescription,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      from: category.sortOrder,
      to: input.sortOrder,
    },
    {
      key: "isVisible",
      label: "Visible",
      from: category.isVisible,
      to: input.isVisible,
    },
  ]);

  await prisma.category.update({
    where: { id },
    data: {
      name: trimmedName,
      slug,
      description: trimmedDescription,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
    },
  });

  if (changes.length > 0) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.CATEGORY_UPDATED,
      details: {
        categoryId: id,
        name: trimmedName,
        slug,
        changes,
      },
    });
  }

  revalidateForumPaths();
  return { success: true };
}

export async function deleteCategory(
  id: string
): Promise<AdminDeleteCategoryResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      forums: {
        include: {
          _count: {
            select: { threads: true },
          },
        },
      },
      _count: {
        select: { forums: true },
      },
    },
  });

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const deletedForums = category._count.forums;
  const deletedThreads = category.forums.reduce(
    (total, forum) => total + forum._count.threads,
    0
  );

  await prisma.category.delete({ where: { id } });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.CATEGORY_DELETED,
    details: {
      categoryId: id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      deletedForums,
      deletedThreads,
    },
  });

  revalidateForumPaths();
  return { success: true, deletedForums, deletedThreads };
}

export async function toggleCategoryVisibility(
  id: string
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const category = await prisma.category.findUnique({
    where: { id },
    select: { name: true, slug: true, isVisible: true },
  });

  if (!category) {
    return { success: false, error: "Category not found." };
  }

  const nextVisible = !category.isVisible;

  await prisma.category.update({
    where: { id },
    data: { isVisible: nextVisible },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.CATEGORY_VISIBILITY_TOGGLED,
    details: {
      categoryId: id,
      name: category.name,
      slug: category.slug,
      changes: buildFieldChanges([
        {
          key: "isVisible",
          label: "Visible",
          from: category.isVisible,
          to: nextVisible,
        },
      ]),
    },
  });

  revalidateForumPaths();
  return { success: true };
}

export async function moveCategoryOrder(
  id: string,
  direction: "up" | "down"
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, sortOrder: true },
  });

  const index = categories.findIndex((category) => category.id === id);
  if (index === -1) {
    return { success: false, error: "Category not found." };
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) {
    return { success: true };
  }

  const current = categories[index];
  const target = categories[swapIndex];

  await prisma.$transaction([
    prisma.category.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.category.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.CATEGORY_REORDERED,
    details: {
      categoryId: current.id,
      name: current.name,
      slug: current.slug,
      direction,
      changes: buildFieldChanges([
        {
          key: "sortOrder",
          label: "Sort order",
          from: current.sortOrder,
          to: target.sortOrder,
        },
      ]),
    },
  });

  revalidateForumPaths();
  return { success: true };
}

export async function createForum(input: ForumInput): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const validationError = validateForumInput(input);
  if (validationError) {
    return validationError;
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true },
  });

  if (!category) {
    return { success: false, error: "Parent category not found." };
  }

  const slug = normalizeAdminSlug(input.slug);
  const slugError = await ensureUniqueForumSlug(slug);
  if (slugError) {
    return slugError;
  }

  const forum = await prisma.forum.create({
    data: {
      categoryId: input.categoryId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
      isLocked: input.isLocked,
    },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORUM_CREATED,
    details: {
      forumId: forum.id,
      categoryId: category.id,
      categoryName: category.name,
      name: forum.name,
      slug: forum.slug,
      description: forum.description,
      sortOrder: forum.sortOrder,
      isVisible: forum.isVisible,
      isLocked: forum.isLocked,
    },
  });

  revalidateForumPaths();
  redirect("/admin/forums");
}

export async function updateForum(
  id: string,
  input: ForumInput
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const validationError = validateForumInput(input);
  if (validationError) {
    return validationError;
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true, name: true },
  });

  if (!category) {
    return { success: false, error: "Parent category not found." };
  }

  const slug = normalizeAdminSlug(input.slug);
  const slugError = await ensureUniqueForumSlug(slug, id);
  if (slugError) {
    return slugError;
  }

  const forum = await prisma.forum.findUnique({
    where: { id },
  });

  if (!forum) {
    return { success: false, error: "Subcategory not found." };
  }

  const previousCategory = await prisma.category.findUnique({
    where: { id: forum.categoryId },
    select: { name: true },
  });

  const trimmedName = input.name.trim();
  const trimmedDescription = input.description?.trim() || null;
  const changes = buildFieldChanges([
    { key: "name", label: "Name", from: forum.name, to: trimmedName },
    { key: "slug", label: "URL name", from: forum.slug, to: slug },
    {
      key: "description",
      label: "Description",
      from: forum.description,
      to: trimmedDescription,
    },
    {
      key: "categoryId",
      label: "Parent category",
      from: previousCategory?.name ?? forum.categoryId,
      to: category.name,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      from: forum.sortOrder,
      to: input.sortOrder,
    },
    {
      key: "isVisible",
      label: "Visible",
      from: forum.isVisible,
      to: input.isVisible,
    },
    {
      key: "isLocked",
      label: "Locked",
      from: forum.isLocked,
      to: input.isLocked,
    },
  ]);

  await prisma.forum.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: trimmedName,
      slug,
      description: trimmedDescription,
      sortOrder: input.sortOrder,
      isVisible: input.isVisible,
      isLocked: input.isLocked,
    },
  });

  if (changes.length > 0) {
    await createModerationLog({
      actorId: actor.id,
      action: MODERATION_ACTIONS.FORUM_UPDATED,
      details: {
        forumId: id,
        categoryId: category.id,
        categoryName: category.name,
        name: trimmedName,
        slug,
        changes,
      },
    });
  }

  revalidateForumPaths();
  revalidatePath(`/forum/${forum.slug}`);
  revalidatePath(`/forum/${slug}`);
  return { success: true };
}

export async function deleteForum(id: string): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const forum = await prisma.forum.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      _count: {
        select: { threads: true },
      },
    },
  });

  if (!forum) {
    return { success: false, error: "Subcategory not found." };
  }

  if (forum._count.threads > 0) {
    return {
      success: false,
      error:
        "This subcategory cannot be deleted because it still contains threads.",
    };
  }

  await prisma.forum.delete({ where: { id } });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORUM_DELETED,
    details: {
      forumId: id,
      name: forum.name,
      slug: forum.slug,
      categoryName: forum.category.name,
      threadCount: forum._count.threads,
    },
  });

  revalidateForumPaths();
  revalidatePath(`/forum/${forum.slug}`);
  return { success: true };
}

export async function toggleForumVisibility(
  id: string
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const forum = await prisma.forum.findUnique({
    where: { id },
    select: {
      name: true,
      slug: true,
      isVisible: true,
      category: { select: { name: true } },
    },
  });

  if (!forum) {
    return { success: false, error: "Subcategory not found." };
  }

  const nextVisible = !forum.isVisible;

  await prisma.forum.update({
    where: { id },
    data: { isVisible: nextVisible },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORUM_VISIBILITY_TOGGLED,
    details: {
      forumId: id,
      name: forum.name,
      slug: forum.slug,
      categoryName: forum.category.name,
      changes: buildFieldChanges([
        {
          key: "isVisible",
          label: "Visible",
          from: forum.isVisible,
          to: nextVisible,
        },
      ]),
    },
  });

  revalidateForumPaths();
  revalidatePath(`/forum/${forum.slug}`);
  return { success: true };
}

export async function toggleForumLock(id: string): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const forum = await prisma.forum.findUnique({
    where: { id },
    select: {
      name: true,
      slug: true,
      isLocked: true,
      category: { select: { name: true } },
    },
  });

  if (!forum) {
    return { success: false, error: "Subcategory not found." };
  }

  const nextLocked = !forum.isLocked;

  await prisma.forum.update({
    where: { id },
    data: { isLocked: nextLocked },
  });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORUM_LOCK_TOGGLED,
    details: {
      forumId: id,
      name: forum.name,
      slug: forum.slug,
      categoryName: forum.category.name,
      changes: buildFieldChanges([
        {
          key: "isLocked",
          label: "Locked",
          from: forum.isLocked,
          to: nextLocked,
        },
      ]),
    },
  });

  revalidateForumPaths();
  revalidatePath(`/forum/${forum.slug}`);
  return { success: true };
}

export async function moveForumOrder(
  id: string,
  direction: "up" | "down"
): Promise<AdminActionResult> {
  const auth = await requireForumStructureAdmin();
  if (!auth.success) return auth;
  const { actor } = auth;

  const forum = await prisma.forum.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      sortOrder: true,
      category: { select: { name: true } },
    },
  });

  if (!forum) {
    return { success: false, error: "Subcategory not found." };
  }

  const forums = await prisma.forum.findMany({
    where: { categoryId: forum.categoryId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, sortOrder: true },
  });

  const index = forums.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= forums.length) {
    return { success: true };
  }

  const current = forums[index];
  const target = forums[swapIndex];

  await prisma.$transaction([
    prisma.forum.update({
      where: { id: current.id },
      data: { sortOrder: target.sortOrder },
    }),
    prisma.forum.update({
      where: { id: target.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORUM_REORDERED,
    details: {
      forumId: current.id,
      name: current.name,
      slug: current.slug,
      categoryName: forum.category.name,
      direction,
      changes: buildFieldChanges([
        {
          key: "sortOrder",
          label: "Sort order",
          from: current.sortOrder,
          to: target.sortOrder,
        },
      ]),
    },
  });

  revalidateForumPaths();
  return { success: true };
}
