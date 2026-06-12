import { prisma } from "@/lib/prisma";
import { parseFieldOptions } from "@/lib/form/validation";
import type {
  FormAdminView,
  FormFieldView,
  FormListItem,
  PublicFormView,
  SubmissionDetailView,
  SubmissionListItem,
} from "@/lib/form/types";

function mapField(field: {
  id: string;
  label: string;
  description: string | null;
  fieldType: FormFieldView["fieldType"];
  required: boolean;
  placeholder: string | null;
  options: unknown;
  sortOrder: number;
}): FormFieldView {
  return {
    id: field.id,
    label: field.label,
    description: field.description,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder,
    options: parseFieldOptions(field.options),
    sortOrder: field.sortOrder,
  };
}

function mapPublicForm(form: {
  id: string;
  title: string;
  slug: string;
  forumId: string;
  description: string | null;
  buttonLabel: string;
  isOpen: boolean;
  requiresLogin: boolean;
  forum: { slug: string };
  fields: Array<{
    id: string;
    label: string;
    description: string | null;
    fieldType: FormFieldView["fieldType"];
    required: boolean;
    placeholder: string | null;
    options: unknown;
    sortOrder: number;
  }>;
}): PublicFormView {
  return {
    id: form.id,
    title: form.title,
    slug: form.slug,
    forumId: form.forumId,
    forumSlug: form.forum.slug,
    description: form.description,
    buttonLabel: form.buttonLabel,
    isOpen: form.isOpen,
    requiresLogin: form.requiresLogin,
    fields: form.fields.map(mapField),
  };
}

export async function getAdminFormsList(): Promise<FormListItem[]> {
  const forms = await prisma.form.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      category: { select: { name: true } },
      forum: { select: { slug: true } },
      _count: {
        select: { submissions: true },
      },
    },
  });

  return forms.map((form) => ({
    id: form.id,
    title: form.title,
    slug: form.slug,
    categoryName: form.category.name,
    forumSlug: form.forum.slug,
    buttonLabel: form.buttonLabel,
    isOpen: form.isOpen,
    submissionCount: form._count.submissions,
    createdAt: form.createdAt.toISOString(),
  }));
}

export async function getFormByIdForAdmin(
  formId: string
): Promise<FormAdminView | null> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    include: {
      category: { select: { id: true, name: true } },
      forum: { select: { slug: true } },
      fields: { orderBy: { sortOrder: "asc" } },
      reviewerRoles: { select: { roleId: true } },
      _count: { select: { submissions: true } },
    },
  });

  if (!form) {
    return null;
  }

  return {
    id: form.id,
    title: form.title,
    slug: form.slug,
    forumId: form.forumId,
    forumSlug: form.forum.slug,
    description: form.description,
    buttonLabel: form.buttonLabel,
    categoryId: form.categoryId,
    categoryName: form.category.name,
    reviewerRoleIds: form.reviewerRoles.map((entry) => entry.roleId),
    isOpen: form.isOpen,
    requiresLogin: form.requiresLogin,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    submissionCount: form._count.submissions,
    fields: form.fields.map(mapField),
  };
}

export async function getPublicFormByForumSlug(
  forumSlug: string
): Promise<PublicFormView | null> {
  const form = await prisma.form.findFirst({
    where: { forum: { slug: forumSlug } },
    include: {
      forum: { select: { slug: true } },
      fields: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!form) {
    return null;
  }

  return mapPublicForm(form);
}

export async function getPublicFormByForumId(
  forumId: string
): Promise<PublicFormView | null> {
  const form = await prisma.form.findUnique({
    where: { forumId },
    include: {
      forum: { select: { slug: true } },
      fields: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!form) {
    return null;
  }

  return mapPublicForm(form);
}

export async function getFormSubmissionsList(
  formId: string
): Promise<SubmissionListItem[]> {
  const submissions = await prisma.formSubmission.findMany({
    where: { formId },
    orderBy: { createdAt: "desc" },
    include: {
      submittedBy: {
        select: {
          username: true,
          minecraftUsername: true,
        },
      },
      thread: {
        select: { id: true },
      },
    },
  });

  return submissions.map((submission) => ({
    id: submission.id,
    status: submission.status,
    createdAt: submission.createdAt.toISOString(),
    threadId: submission.threadId,
    submitterUsername: submission.submittedBy?.username ?? null,
    submitterMinecraft: submission.submittedBy?.minecraftUsername ?? null,
  }));
}

export async function getSubmissionDetail(
  submissionId: string
): Promise<SubmissionDetailView | null> {
  const submission = await prisma.formSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: { select: { id: true, title: true } },
      submittedBy: {
        select: {
          id: true,
          username: true,
          minecraftUsername: true,
        },
      },
      reviewedBy: {
        select: {
          id: true,
          username: true,
        },
      },
      answers: {
        include: {
          field: {
            select: {
              id: true,
              label: true,
              fieldType: true,
            },
          },
        },
        orderBy: {
          field: { sortOrder: "asc" },
        },
      },
    },
  });

  if (!submission) {
    return null;
  }

  return {
    id: submission.id,
    formId: submission.form.id,
    formTitle: submission.form.title,
    threadId: submission.threadId,
    status: submission.status,
    internalNote: submission.internalNote,
    createdAt: submission.createdAt.toISOString(),
    reviewedAt: submission.reviewedAt?.toISOString() ?? null,
    submitter: {
      id: submission.submittedBy?.id ?? null,
      username: submission.submittedBy?.username ?? null,
      minecraftUsername: submission.submittedBy?.minecraftUsername ?? null,
    },
    reviewedBy: submission.reviewedBy
      ? {
          id: submission.reviewedBy.id,
          username: submission.reviewedBy.username,
        }
      : null,
    answers: submission.answers.map((answer) => ({
      fieldId: answer.field.id,
      fieldLabel: answer.field.label,
      fieldType: answer.field.fieldType,
      value: answer.value,
    })),
  };
}

export async function getFormSubmissionCount(formId: string): Promise<number> {
  return prisma.formSubmission.count({ where: { formId } });
}
