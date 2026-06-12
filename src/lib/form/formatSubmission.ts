import type { FormFieldType } from "@prisma/client";

type AnswerField = {
  label: string;
  fieldType: FormFieldType;
};

function formatValue(value: unknown, fieldType: FormFieldType): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (fieldType === "LONG_TEXT") {
    return String(value);
  }

  return String(value);
}

export function formatSubmissionAsPostContent(
  fields: AnswerField[],
  answers: Record<string, unknown>
): string {
  const lines = [
    "[b]Form submission[/b]",
    "",
  ];

  for (const field of fields) {
    const value = answers[field.label] ?? answers[field.label.toLowerCase()];
    // answers keyed by field id in our system
    lines.push(`[b]${field.label}[/b]`);
    lines.push(formatValue(value, field.fieldType));
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function formatSubmissionFromFieldIds(
  fields: Array<{ id: string; label: string; fieldType: FormFieldType }>,
  answers: Record<string, unknown>
): string {
  const lines = [
    "[b]Form submission[/b]",
    "",
  ];

  for (const field of fields) {
    lines.push(`[b]${field.label}[/b]`);
    lines.push(formatValue(answers[field.id], field.fieldType));
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function submissionThreadTitle(
  formTitle: string,
  username: string
): string {
  return `${formTitle} — ${username}`;
}
