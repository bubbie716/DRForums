"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  canUserPost,
  isUserBanned,
  MINECRAFT_LINK_REQUIRED_MESSAGE,
  BAN_RESTRICTED_MESSAGE,
} from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isFormsEnabled } from "@/lib/settings";
import { getPublicFormByForumSlug } from "@/lib/form/queries";
import { validateSubmissionAnswers } from "@/lib/form/validation";
import {
  formatSubmissionFromFieldIds,
  submissionThreadTitle,
} from "@/lib/form/formatSubmission";
import { generateThreadSlug } from "@/lib/slug";
import {
  FORM_CITIZEN_REQUIRED_MESSAGE,
  type FormActionResult,
} from "@/lib/form/types";

export async function submitForm(
  forumSlug: string,
  answers: Record<string, unknown>
): Promise<FormActionResult> {
  if (!(await isFormsEnabled())) {
    return { success: false, error: "Form submissions are currently disabled." };
  }

  const form = await getPublicFormByForumSlug(forumSlug);
  if (!form) {
    return { success: false, error: "Form not found." };
  }

  if (!form.isOpen) {
    return {
      success: false,
      error: "This form is closed and no longer accepting submissions.",
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "You must be logged in to submit this form." };
  }

  if (await isUserBanned(user.id)) {
    return { success: false, error: BAN_RESTRICTED_MESSAGE };
  }

  if (!(await canUserPost(user))) {
    return { success: false, error: MINECRAFT_LINK_REQUIRED_MESSAGE };
  }

  if (!(await hasPermission(user.id, "form.respond"))) {
    return { success: false, error: FORM_CITIZEN_REQUIRED_MESSAGE };
  }

  const forum = await prisma.forum.findUnique({
    where: { id: form.forumId },
    select: {
      id: true,
      slug: true,
      isLocked: true,
      isVisible: true,
      category: { select: { isVisible: true } },
    },
  });

  if (!forum || !forum.isVisible || !forum.category.isVisible) {
    return { success: false, error: "Forum not found." };
  }

  if (forum.isLocked) {
    return {
      success: false,
      error: "This forum is locked. No new submissions can be created.",
    };
  }

  const validation = validateSubmissionAnswers(form.fields, answers);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const normalizedAnswers = validation.data ?? {};
  const content = formatSubmissionFromFieldIds(form.fields, normalizedAnswers);
  const title = submissionThreadTitle(form.title, user.username);
  const threadSlug = generateThreadSlug(title);

  let createdThreadId: string | null = null;

  const submission = await prisma.$transaction(async (tx) => {
    const thread = await tx.thread.create({
      data: {
        title,
        slug: threadSlug,
        content,
        forumId: forum.id,
        authorId: user.id,
        posts: {
          create: {
            content,
            authorId: user.id,
          },
        },
      },
      select: { id: true, slug: true },
    });

    createdThreadId = thread.id;

    return tx.formSubmission.create({
      data: {
        formId: form.id,
        threadId: thread.id,
        submittedById: user.id,
        answers: {
          create: Object.entries(normalizedAnswers).map(([fieldId, value]) => ({
            fieldId,
            value: value as Prisma.InputJsonValue,
          })),
        },
      },
      select: { id: true, threadId: true },
    });
  });

  revalidatePath(`/forum/${forum.slug}`);
  if (createdThreadId) {
    revalidatePath(`/thread/${createdThreadId}`);
  }
  revalidatePath(`/admin/forms/${form.id}/submissions`);

  return {
    success: true,
    message: "Your submission has been received. Thank you!",
    threadId: submission.threadId ?? undefined,
  };
}
