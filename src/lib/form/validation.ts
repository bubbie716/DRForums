import type { FormFieldType } from "@prisma/client";
import {
  validateAdminDescription,
  validateAdminName,
} from "@/lib/admin/validation";
import type { ValidationResult } from "@/lib/auth";
import {
  FORM_FIELD_TYPE_LABELS,
  OPTION_FIELD_TYPES,
  type FormFieldInput,
  type FormInput,
} from "@/lib/form/types";

const MAX_FIELDS = 50;
const MAX_OPTIONS = 30;
const MAX_OPTION_LENGTH = 120;
const MAX_BUTTON_LABEL_LENGTH = 40;

export function validateFormInput(input: FormInput): ValidationResult & { data?: FormInput } {
  const titleValidation = validateAdminName(input.title, "Title");
  if (!titleValidation.valid) {
    return titleValidation;
  }

  const descriptionValidation = validateAdminDescription(input.description);
  if (!descriptionValidation.valid) {
    return descriptionValidation;
  }

  if (!input.categoryId?.trim()) {
    return { valid: false, error: "Select a parent category for this form." };
  }

  const buttonLabel = input.buttonLabel?.trim() ?? "";
  if (!buttonLabel) {
    return { valid: false, error: "Button label is required." };
  }
  if (buttonLabel.length > MAX_BUTTON_LABEL_LENGTH) {
    return {
      valid: false,
      error: `Button label must be at most ${MAX_BUTTON_LABEL_LENGTH} characters.`,
    };
  }

  if (!Array.isArray(input.reviewerRoleIds) || input.reviewerRoleIds.length === 0) {
    return {
      valid: false,
      error: "Select at least one reviewer role who can view and reply to submissions.",
    };
  }

  if (!Array.isArray(input.fields) || input.fields.length === 0) {
    return { valid: false, error: "Add at least one field to the form." };
  }

  if (input.fields.length > MAX_FIELDS) {
    return { valid: false, error: `Forms can have at most ${MAX_FIELDS} fields.` };
  }

  const normalizedFields: FormFieldInput[] = [];

  for (let index = 0; index < input.fields.length; index++) {
    const field = input.fields[index];
    const fieldValidation = validateFormFieldInput(field, index + 1);
    if (!fieldValidation.valid) {
      return { valid: false, error: fieldValidation.error };
    }
    normalizedFields.push(fieldValidation.data!);
  }

  const reviewerRoleIds = [...new Set(input.reviewerRoleIds.filter(Boolean))];

  return {
    valid: true,
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      categoryId: input.categoryId.trim(),
      buttonLabel,
      isOpen: input.isOpen,
      reviewerRoleIds,
      fields: normalizedFields.map((field, index) => ({
        ...field,
        sortOrder: index,
      })),
    },
  };
}

export function validateFormFieldInput(
  field: FormFieldInput,
  fieldNumber: number
): ValidationResult & { data?: FormFieldInput } {
  const labelValidation = validateAdminName(field.label, `Field ${fieldNumber} label`);
  if (!labelValidation.valid) {
    return labelValidation;
  }

  if (!FORM_FIELD_TYPE_LABELS[field.fieldType as FormFieldType]) {
    return { valid: false, error: `Field ${fieldNumber} has an invalid type.` };
  }

  const descriptionValidation = validateAdminDescription(field.description);
  if (!descriptionValidation.valid) {
    return descriptionValidation;
  }

  const placeholder = field.placeholder?.trim() || null;
  if (placeholder && placeholder.length > 200) {
    return {
      valid: false,
      error: `Field ${fieldNumber} placeholder must be at most 200 characters.`,
    };
  }

  const needsOptions = OPTION_FIELD_TYPES.includes(field.fieldType);
  const options = (field.options ?? [])
    .map((option) => option.trim())
    .filter(Boolean);

  if (needsOptions) {
    if (options.length === 0) {
      return {
        valid: false,
        error: `${FORM_FIELD_TYPE_LABELS[field.fieldType]} fields need at least one option.`,
      };
    }

    if (options.length > MAX_OPTIONS) {
      return {
        valid: false,
        error: `Field ${fieldNumber} can have at most ${MAX_OPTIONS} options.`,
      };
    }

    for (const option of options) {
      if (option.length > MAX_OPTION_LENGTH) {
        return {
          valid: false,
          error: `Field ${fieldNumber} options must be at most ${MAX_OPTION_LENGTH} characters.`,
        };
      }
    }
  } else if (options.length > 0) {
    return {
      valid: false,
      error: `${FORM_FIELD_TYPE_LABELS[field.fieldType]} fields cannot have options.`,
    };
  }

  return {
    valid: true,
    data: {
      id: field.id,
      label: field.label.trim(),
      description: field.description?.trim() || null,
      fieldType: field.fieldType,
      required: field.required,
      placeholder,
      options: needsOptions ? options : undefined,
      sortOrder: field.sortOrder,
    },
  };
}

export function parseFieldOptions(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .filter((option): option is string => typeof option === "string")
    .map((option) => option.trim())
    .filter(Boolean);
}

export function validateSubmissionAnswers(
  fields: Array<{
    id: string;
    label: string;
    fieldType: FormFieldType;
    required: boolean;
    options: string[];
  }>,
  answers: Record<string, unknown>
): ValidationResult & { data?: Record<string, unknown> } {
  const normalized: Record<string, unknown> = {};

  for (const field of fields) {
    const rawValue = answers[field.id];

    if (
      rawValue === undefined ||
      rawValue === null ||
      rawValue === "" ||
      (Array.isArray(rawValue) && rawValue.length === 0)
    ) {
      if (field.required) {
        return { valid: false, error: `"${field.label}" is required.` };
      }
      continue;
    }

    switch (field.fieldType) {
      case "SHORT_TEXT":
      case "LONG_TEXT": {
        if (typeof rawValue !== "string") {
          return { valid: false, error: `"${field.label}" must be text.` };
        }
        const trimmed = rawValue.trim();
        if (!trimmed && field.required) {
          return { valid: false, error: `"${field.label}" is required.` };
        }
        if (trimmed) {
          normalized[field.id] = trimmed;
        }
        break;
      }
      case "NUMBER": {
        const parsed =
          typeof rawValue === "number"
            ? rawValue
            : Number.parseFloat(String(rawValue));
        if (!Number.isFinite(parsed)) {
          return { valid: false, error: `"${field.label}" must be a valid number.` };
        }
        normalized[field.id] = parsed;
        break;
      }
      case "DATE": {
        if (typeof rawValue !== "string" || !rawValue.trim()) {
          return { valid: false, error: `"${field.label}" must be a valid date.` };
        }
        const date = new Date(rawValue);
        if (Number.isNaN(date.getTime())) {
          return { valid: false, error: `"${field.label}" must be a valid date.` };
        }
        normalized[field.id] = rawValue;
        break;
      }
      case "DROPDOWN":
      case "RADIO": {
        if (typeof rawValue !== "string") {
          return { valid: false, error: `"${field.label}" has an invalid selection.` };
        }
        if (!field.options.includes(rawValue)) {
          return { valid: false, error: `"${field.label}" has an invalid selection.` };
        }
        normalized[field.id] = rawValue;
        break;
      }
      case "CHECKBOX": {
        const values = Array.isArray(rawValue)
          ? rawValue.map(String)
          : [String(rawValue)];
        const unique = [...new Set(values)];
        if (unique.some((value) => !field.options.includes(value))) {
          return { valid: false, error: `"${field.label}" has an invalid selection.` };
        }
        if (field.required && unique.length === 0) {
          return { valid: false, error: `"${field.label}" is required.` };
        }
        if (unique.length > 0) {
          normalized[field.id] = unique;
        }
        break;
      }
      default:
        return { valid: false, error: "Invalid field type." };
    }
  }

  return { valid: true, data: normalized };
}
