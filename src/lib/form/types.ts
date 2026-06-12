import type { FormFieldType, FormSubmissionStatus } from "@prisma/client";

export type FormFieldInput = {
  id?: string;
  label: string;
  description?: string | null;
  fieldType: FormFieldType;
  required: boolean;
  placeholder?: string | null;
  options?: string[];
  sortOrder: number;
};

export type FormInput = {
  title: string;
  description?: string | null;
  categoryId: string;
  buttonLabel: string;
  isOpen: boolean;
  reviewerRoleIds: string[];
  fields: FormFieldInput[];
};

export type FormCategoryOption = {
  id: string;
  name: string;
};

export type FormRoleOption = {
  id: string;
  name: string;
  slug: string;
};

export type FormListItem = {
  id: string;
  title: string;
  slug: string;
  categoryName: string;
  forumSlug: string;
  buttonLabel: string;
  isOpen: boolean;
  submissionCount: number;
  createdAt: string;
};

export type FormFieldView = {
  id: string;
  label: string;
  description: string | null;
  fieldType: FormFieldType;
  required: boolean;
  placeholder: string | null;
  options: string[];
  sortOrder: number;
};

export type PublicFormView = {
  id: string;
  title: string;
  slug: string;
  forumId: string;
  forumSlug: string;
  description: string | null;
  buttonLabel: string;
  isOpen: boolean;
  requiresLogin: boolean;
  fields: FormFieldView[];
};

export type FormAdminView = PublicFormView & {
  categoryId: string;
  categoryName: string;
  reviewerRoleIds: string[];
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
};

export type SubmissionListItem = {
  id: string;
  status: FormSubmissionStatus;
  createdAt: string;
  threadId: string | null;
  submitterUsername: string | null;
  submitterMinecraft: string | null;
};

export type SubmissionAnswerView = {
  fieldId: string;
  fieldLabel: string;
  fieldType: FormFieldType;
  value: unknown;
};

export type SubmissionDetailView = {
  id: string;
  formId: string;
  formTitle: string;
  threadId: string | null;
  status: FormSubmissionStatus;
  internalNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  submitter: {
    id: string | null;
    username: string | null;
    minecraftUsername: string | null;
  };
  reviewedBy: {
    id: string | null;
    username: string | null;
  } | null;
  answers: SubmissionAnswerView[];
};

export type FormActionResult =
  | {
      success: true;
      message?: string;
      formId?: string;
      forumSlug?: string;
      threadId?: string;
    }
  | { success: false; error: string };

export const FORM_CITIZEN_REQUIRED_MESSAGE =
  "You must be a Citizen to submit forms. Link your Minecraft account in Settings to become a Citizen.";

export const OPTION_FIELD_TYPES: FormFieldType[] = [
  "DROPDOWN",
  "CHECKBOX",
  "RADIO",
];

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DROPDOWN: "Dropdown",
  CHECKBOX: "Checkbox",
  RADIO: "Radio",
  DATE: "Date",
};
