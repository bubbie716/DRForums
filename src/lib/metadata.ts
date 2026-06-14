import type { Metadata } from "next";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { canAccessFormAdmin } from "@/lib/form/access";
import { canViewForum, canViewThread } from "@/lib/forumAccess";
import { getForumBySlug, getThreadById } from "@/lib/forum/queries";
import { getFormByIdForAdmin, getSubmissionDetail } from "@/lib/form/queries";
import {
  getAdminCategoryById,
  getAdminForumById,
} from "@/lib/admin/queries";
import { getAdminUserDetail } from "@/lib/admin/user-queries";
import { hasEveryPermission } from "@/lib/permissions";
import { getAllRequiredPermissions } from "@/lib/permissions/requirements";

export async function getThreadPageTitle(threadId: string): Promise<string> {
  const user = await getSessionUser();
  const canView = await canViewThread(user?.id ?? null, threadId);

  if (!canView) {
    return "Thread";
  }

  const thread = await getThreadById(threadId);
  return thread?.title ?? "Thread";
}

export async function getForumPageTitle(slug: string): Promise<string> {
  const forum = await getForumBySlug(slug);
  if (!forum) {
    return "Forum";
  }

  const user = await getSessionUser();
  const canView = await canViewForum(user?.id ?? null, forum.id);

  if (!canView) {
    return "Forum";
  }

  return forum.name;
}

export async function getAdminPageTitle(): Promise<string> {
  return "Admin";
}

async function canViewAdminDashboard(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) {
    return false;
  }

  if (isAdmin(user.role)) {
    return true;
  }

  const requiredKeys = [
    "admin.dashboard.view",
    ...getAllRequiredPermissions("admin.dashboard.view"),
  ];

  return hasEveryPermission(user.id, requiredKeys);
}

export async function getAdminForumEditTitle(forumId: string): Promise<string> {
  if (!(await canViewAdminDashboard())) {
    return "Admin";
  }

  const forum = await getAdminForumById(forumId);
  return forum ? `Edit ${forum.name}` : "Admin";
}

export async function getAdminCategoryEditTitle(
  categoryId: string
): Promise<string> {
  if (!(await canViewAdminDashboard())) {
    return "Admin";
  }

  const category = await getAdminCategoryById(categoryId);
  return category ? `Edit ${category.name}` : "Admin";
}

export async function getAdminUserDetailTitle(userId: string): Promise<string> {
  if (!(await canViewAdminDashboard())) {
    return "Admin";
  }

  const user = await getAdminUserDetail(userId);
  return user ? `${user.username} · Admin` : "Admin";
}

export async function getAdminFormEditTitle(formId: string): Promise<string> {
  const user = await getSessionUser();
  if (!user || !(await canAccessFormAdmin(user.id))) {
    return "Admin";
  }

  const form = await getFormByIdForAdmin(formId);
  return form ? `Edit ${form.title} · Admin` : "Admin";
}

export async function getAdminFormSubmissionsTitle(
  formId: string
): Promise<string> {
  const user = await getSessionUser();
  if (!user || !(await canAccessFormAdmin(user.id))) {
    return "Admin";
  }

  const form = await getFormByIdForAdmin(formId);
  return form ? `Submissions · ${form.title} · Admin` : "Admin";
}

export async function getAdminSubmissionDetailTitle(
  submissionId: string
): Promise<string> {
  const user = await getSessionUser();
  if (!user || !(await canAccessFormAdmin(user.id))) {
    return "Admin";
  }

  const submission = await getSubmissionDetail(submissionId);
  return submission ? `Submission · ${submission.formTitle} · Admin` : "Admin";
}

export async function forumPageMetadata(slug: string): Promise<Metadata> {
  return { title: await getForumPageTitle(slug) };
}

export async function threadPageMetadata(threadId: string): Promise<Metadata> {
  return { title: await getThreadPageTitle(threadId) };
}

export async function getNewThreadPageTitle(slug: string): Promise<string> {
  const title = await getForumPageTitle(slug);
  return title === "Forum" ? "New Thread" : `New Thread · ${title}`;
}

export async function newThreadPageMetadata(slug: string): Promise<Metadata> {
  return { title: await getNewThreadPageTitle(slug) };
}
