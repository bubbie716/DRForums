"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createModerationLog, MODERATION_ACTIONS } from "@/lib/moderation-log";
import { getFormByIdForAdmin, getFormSubmissionCount } from "@/lib/form/queries";
import { syncFormForumPermissions } from "@/lib/form/forum-sync";
import {
  formatFormReviewPostContent,
  type ReviewedFormSubmissionStatus,
} from "@/lib/form/review-messages";
import { validateFormInput } from "@/lib/form/validation";
import { validatePostContent } from "@/lib/forum/validation";
import { generateForumSlug } from "@/lib/slug";
import type { FormActionResult, FormInput } from "@/lib/form/types";
import {
  ForumNotificationType,
  type FormSubmissionStatus,
} from "@prisma/client";

async function assertFormPermission(
  userId: string,
  permission: string
): Promise<FormActionResult | null> {
  if (!(await hasPermission(userId, permission))) {
    return { success: false, error: "You do not have permission to perform this action." };
  }
  return null;
}

async function ensureUniqueForumSlug(
  slug: string,
  excludeForumId?: string
): Promise<FormActionResult | null> {
  const existing = await prisma.forum.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && existing.id !== excludeForumId) {
    return {
      success: false,
      error: "A forum with this URL already exists. Try a different form title.",
    };
  }

  return null;
}

function revalidateFormPaths(formId: string, forumSlug?: string) {
  revalidatePath("/admin/forms");
  revalidatePath(`/admin/forms/${formId}/edit`);
  revalidatePath(`/admin/forms/${formId}/submissions`);
  revalidatePath("/");
  if (forumSlug) {
    revalidatePath(`/forum/${forumSlug}`);
  }
}

function fieldCreateData(fields: FormInput["fields"]) {
  return fields.map((field) => ({
    label: field.label,
    description: field.description,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder,
    options: field.options?.length ? field.options : Prisma.JsonNull,
    sortOrder: field.sortOrder,
  }));
}

async function nextForumSortOrder(categoryId: string): Promise<number> {
  const result = await prisma.forum.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  return (result._max.sortOrder ?? -1) + 1;
}

export async function adminCreateForm(input: FormInput): Promise<FormActionResult> {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false, error: "Not authenticated." };
  }

  const permError = await assertFormPermission(actor.id, "form.create");
  if (permError) {
    return permError;
  }

  const validation = validateFormInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const data = validation.data!;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true },
  });
  if (!category) {
    return { success: false, error: "Selected category not found." };
  }

  const forumSlug = generateForumSlug(data.title, category.name);
  const slugError = await ensureUniqueForumSlug(forumSlug);
  if (slugError) {
    return slugError;
  }

  const roleCount = await prisma.appRole.count({
    where: { id: { in: data.reviewerRoleIds } },
  });
  if (roleCount !== data.reviewerRoleIds.length) {
    return { success: false, error: "One or more reviewer roles are invalid." };
  }

  const sortOrder = await nextForumSortOrder(category.id);

  const form = await prisma.$transaction(async (tx) => {
    const forum = await tx.forum.create({
      data: {
        categoryId: category.id,
        name: data.title,
        slug: forumSlug,
        description: data.description,
        sortOrder,
        isVisible: true,
        isLocked: false,
      },
      select: { id: true, slug: true },
    });

    const created = await tx.form.create({
      data: {
        title: data.title,
        slug: forumSlug,
        description: data.description,
        buttonLabel: data.buttonLabel,
        isOpen: data.isOpen,
        requiresLogin: true,
        categoryId: category.id,
        forumId: forum.id,
        createdById: actor.id,
        fields: {
          create: fieldCreateData(data.fields),
        },
        reviewerRoles: {
          create: data.reviewerRoleIds.map((roleId) => ({ roleId })),
        },
      },
      select: { id: true, forumId: true },
    });

    return { ...created, forumSlug: forum.slug };
  });

  await syncFormForumPermissions(form.forumId, data.reviewerRoleIds);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORM_CREATED,
    details: {
      formId: form.id,
      slug: forumSlug,
      title: data.title,
      categoryId: category.id,
      forumId: form.forumId,
    },
  });

  revalidateFormPaths(form.id, form.forumSlug);
  return {
    success: true,
    message: "Form created.",
    formId: form.id,
    forumSlug: form.forumSlug,
  };
}

export async function adminUpdateForm(
  formId: string,
  input: FormInput
): Promise<FormActionResult> {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false, error: "Not authenticated." };
  }

  const permError = await assertFormPermission(actor.id, "form.edit");
  if (permError) {
    return permError;
  }

  const existing = await getFormByIdForAdmin(formId);
  if (!existing) {
    return { success: false, error: "Form not found." };
  }

  const validation = validateFormInput(input);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const data = validation.data!;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true, name: true },
  });
  if (!category) {
    return { success: false, error: "Selected category not found." };
  }

  const roleCount = await prisma.appRole.count({
    where: { id: { in: data.reviewerRoleIds } },
  });
  if (roleCount !== data.reviewerRoleIds.length) {
    return { success: false, error: "One or more reviewer roles are invalid." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.formField.deleteMany({ where: { formId } });
    await tx.formReviewerRole.deleteMany({ where: { formId } });

    await tx.form.update({
      where: { id: formId },
      data: {
        title: data.title,
        description: data.description,
        buttonLabel: data.buttonLabel,
        isOpen: data.isOpen,
        requiresLogin: true,
        categoryId: category.id,
        fields: {
          create: fieldCreateData(data.fields),
        },
        reviewerRoles: {
          create: data.reviewerRoleIds.map((roleId) => ({ roleId })),
        },
      },
    });

    await tx.forum.update({
      where: { id: existing.forumId },
      data: {
        name: data.title,
        description: data.description,
        categoryId: category.id,
      },
    });
  });

  await syncFormForumPermissions(existing.forumId, data.reviewerRoleIds);

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORM_UPDATED,
    details: { formId, slug: existing.slug, title: data.title },
  });

  revalidateFormPaths(formId, existing.forumSlug);
  return { success: true, message: "Form updated.", formId };
}

export async function adminSetFormOpen(
  formId: string,
  isOpen: boolean
): Promise<FormActionResult> {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false, error: "Not authenticated." };
  }

  const permError = await assertFormPermission(actor.id, "form.edit");
  if (permError) {
    return permError;
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      isOpen: true,
      forum: { select: { slug: true } },
    },
  });
  if (!form) {
    return { success: false, error: "Form not found." };
  }

  if (form.isOpen === isOpen) {
    return {
      success: false,
      error: isOpen ? "Form is already open." : "Form is already closed.",
    };
  }

  await prisma.form.update({
    where: { id: formId },
    data: { isOpen },
  });

  await createModerationLog({
    actorId: actor.id,
    action: isOpen ? MODERATION_ACTIONS.FORM_OPENED : MODERATION_ACTIONS.FORM_CLOSED,
    details: { formId, slug: form.forum.slug },
  });

  revalidateFormPaths(formId, form.forum.slug);
  return {
    success: true,
    message: isOpen ? "Form opened." : "Form closed.",
  };
}

export async function adminDeleteForm(formId: string): Promise<FormActionResult> {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false, error: "Not authenticated." };
  }

  const permError = await assertFormPermission(actor.id, "form.delete");
  if (permError) {
    return permError;
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true, title: true, forumId: true, forum: { select: { slug: true } } },
  });
  if (!form) {
    return { success: false, error: "Form not found." };
  }

  const submissionCount = await getFormSubmissionCount(formId);
  if (submissionCount > 0) {
    return {
      success: false,
      error: "Cannot delete a form that has submissions. Close it instead.",
    };
  }

  await prisma.forum.delete({ where: { id: form.forumId } });

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORM_DELETED,
    details: { formId, slug: form.forum.slug, title: form.title },
  });

  revalidateFormPaths(formId, form.forum.slug);
  return { success: true, message: "Form deleted." };
}

export async function adminReviewSubmission(
  submissionId: string,
  status: FormSubmissionStatus,
  internalNote?: string | null,
  publicMessage?: string | null
): Promise<FormActionResult> {
  const actor = await getSessionUser();
  if (!actor) {
    return { success: false, error: "Not authenticated." };
  }

  const permError = await assertFormPermission(actor.id, "form.manageResponses");
  if (permError) {
    return permError;
  }

  if (status === "PENDING") {
    return { success: false, error: "Choose accept, deny, or closed to review." };
  }

  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      status: true,
      formId: true,
      threadId: true,
      submittedById: true,
    },
  });

  if (!submission) {
    return { success: false, error: "Submission not found." };
  }

  if (submission.status !== "PENDING") {
    return {
      success: false,
      error: "This submission has already been reviewed.",
    };
  }

  const trimmedNote = internalNote?.trim() || null;
  const reviewStatus = status as ReviewedFormSubmissionStatus;
  const trimmedPublicMessage = publicMessage?.trim() ?? "";

  let postContent: string;
  if (trimmedPublicMessage) {
    const contentValidation = validatePostContent(trimmedPublicMessage);
    if (!contentValidation.valid) {
      return { success: false, error: contentValidation.error };
    }
    postContent = trimmedPublicMessage;
  } else {
    postContent = formatFormReviewPostContent(reviewStatus, actor.username);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.formSubmission.updateMany({
        where: { id: submissionId, status: "PENDING" },
        data: {
          status,
          internalNote: trimmedNote,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });

      if (updated.count === 0) {
        throw new Error("ALREADY_REVIEWED");
      }

      if (!submission.threadId) {
        return;
      }

      await tx.thread.update({
        where: { id: submission.threadId },
        data: { isLocked: true },
      });

      const post = await tx.post.create({
        data: {
          content: postContent,
          threadId: submission.threadId,
          authorId: actor.id,
        },
        select: { id: true },
      });

      if (submission.submittedById) {
        await tx.forumNotification.create({
          data: {
            userId: submission.submittedById,
            actorUserId: actor.id,
            type: ForumNotificationType.FORM_SUBMISSION_REVIEWED,
            threadId: submission.threadId,
            postId: post.id,
            roleName: reviewStatus.toLowerCase(),
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_REVIEWED") {
      return {
        success: false,
        error: "This submission has already been reviewed.",
      };
    }
    throw error;
  }

  await createModerationLog({
    actorId: actor.id,
    action: MODERATION_ACTIONS.FORM_SUBMISSION_REVIEWED,
    details: {
      submissionId,
      formId: submission.formId,
      status,
      previousStatus: submission.status,
    },
  });

  revalidatePath(`/admin/forms/${submission.formId}/submissions`);
  revalidatePath(`/admin/forms/${submission.formId}/submissions/${submissionId}`);
  revalidatePath("/messages");
  if (submission.threadId) {
    revalidatePath(`/thread/${submission.threadId}`);
  }

  const statusMessages: Record<Exclude<FormSubmissionStatus, "PENDING">, string> = {
    ACCEPTED: "Submission accepted, thread locked, and submitter notified.",
    DENIED: "Submission denied, thread locked, and submitter notified.",
    CLOSED: "Submission closed, thread locked, and submitter notified.",
  };

  return {
    success: true,
    message: statusMessages[reviewStatus],
  };
}
