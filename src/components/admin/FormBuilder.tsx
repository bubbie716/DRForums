"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormFieldType } from "@prisma/client";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { formInputClassName } from "@/components/ui/fieldStyles";
import {
  adminCreateForm,
  adminDeleteForm,
  adminSetFormOpen,
  adminUpdateForm,
} from "@/lib/form/admin-actions";
import {
  FORM_FIELD_TYPE_LABELS,
  OPTION_FIELD_TYPES,
  type FormCategoryOption,
  type FormFieldInput,
  type FormAdminView,
  type FormRoleOption,
} from "@/lib/form/types";
import { cn } from "@/lib/utils";
import {
  useUnsavedChangesFlag,
  useUnsavedChangesForm,
} from "@/components/shared/unsaved-changes/UnsavedChangesProvider";

type FormBuilderSnapshot = {
  title: string;
  categoryId: string;
  buttonLabel: string;
  reviewerRoleIds: string[];
  description: string;
  isOpen: boolean;
  fields: Array<{
    id?: string;
    label: string;
    description: string | null;
    fieldType: FormFieldType;
    required: boolean;
    placeholder: string | null;
    options: string[];
    sortOrder: number;
  }>;
};

function normalizeFieldsForSnapshot(fields: FormFieldInput[]): FormBuilderSnapshot["fields"] {
  return fields.map((field, index) => ({
    id: field.id,
    label: field.label.trim(),
    description: field.description?.trim() || null,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder?.trim() || null,
    options: OPTION_FIELD_TYPES.includes(field.fieldType)
      ? (field.options ?? []).map((option) => option.trim()).filter(Boolean)
      : [],
    sortOrder: index,
  }));
}

function buildSnapshotFromAdminView(form: FormAdminView): FormBuilderSnapshot {
  return {
    title: form.title.trim(),
    categoryId: form.categoryId,
    buttonLabel: form.buttonLabel.trim(),
    reviewerRoleIds: [...form.reviewerRoleIds].sort(),
    description: form.description?.trim() ?? "",
    isOpen: form.isOpen,
    fields: normalizeFieldsForSnapshot(
      form.fields.map((field) => ({
        id: field.id,
        label: field.label,
        description: field.description,
        fieldType: field.fieldType,
        required: field.required,
        placeholder: field.placeholder,
        options: field.options,
        sortOrder: field.sortOrder,
      }))
    ),
  };
}

function buildSnapshotFromState(input: {
  title: string;
  categoryId: string;
  buttonLabel: string;
  reviewerRoleIds: string[];
  description: string;
  isOpen: boolean;
  fields: FormFieldInput[];
}): FormBuilderSnapshot {
  return {
    title: input.title.trim(),
    categoryId: input.categoryId,
    buttonLabel: input.buttonLabel.trim(),
    reviewerRoleIds: [...input.reviewerRoleIds].sort(),
    description: input.description.trim(),
    isOpen: input.isOpen,
    fields: normalizeFieldsForSnapshot(input.fields),
  };
}

function snapshotsEqual(
  left: FormBuilderSnapshot,
  right: FormBuilderSnapshot
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

type FormBuilderProps = {
  mode: "create" | "edit";
  initial?: FormAdminView;
  canDelete: boolean;
  categories: FormCategoryOption[];
  roles: FormRoleOption[];
};

const FIELD_TYPE_HINTS: Record<FormFieldType, string> = {
  SHORT_TEXT: "A single-line answer, like a name or username.",
  LONG_TEXT: "A longer written response, like an explanation.",
  NUMBER: "A numeric answer only.",
  DROPDOWN: "Pick one option from a dropdown list.",
  CHECKBOX: "Pick one or more options from a list.",
  RADIO: "Pick exactly one option from a list.",
  DATE: "A calendar date picker.",
};

const PLACEHOLDER_FIELD_TYPES: FormFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
];

function createEmptyField(sortOrder: number, fieldType: FormFieldType): FormFieldInput {
  return {
    label: "",
    description: null,
    fieldType,
    required: false,
    placeholder: null,
    options: OPTION_FIELD_TYPES.includes(fieldType) ? [""] : undefined,
    sortOrder,
  };
}

function fieldSummaryLabel(field: FormFieldInput): string {
  return field.label.trim() || "Untitled question";
}

type OptionListEditorProps = {
  options: string[];
  onChange: (options: string[]) => void;
};

function OptionListEditor({ options, onChange }: OptionListEditorProps) {
  const list = options.length > 0 ? options : [""];

  return (
    <div className="space-y-2">
      {list.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={option}
            onChange={(event) => {
              const next = [...list];
              next[index] = event.target.value;
              onChange(next);
            }}
            placeholder={`Option ${index + 1}`}
            className={formInputClassName}
          />
          <button
            type="button"
            onClick={() => {
              if (list.length <= 1) {
                return;
              }
              onChange(list.filter((_, optionIndex) => optionIndex !== index));
            }}
            disabled={list.length <= 1}
            className="shrink-0 min-h-10 px-3 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-red-600 disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...list, ""])}
        className="text-sm font-semibold text-accent hover:underline"
      >
        + Add option
      </button>
    </div>
  );
}

type FieldEditorProps = {
  field: FormFieldInput;
  index: number;
  total: number;
  onChange: (patch: Partial<FormFieldInput>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onCollapse: () => void;
};

function FieldEditor({
  field,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  onCollapse,
}: FieldEditorProps) {
  const [showHelpText, setShowHelpText] = useState(Boolean(field.description));
  const needsOptions = OPTION_FIELD_TYPES.includes(field.fieldType);
  const showPlaceholder = PLACEHOLDER_FIELD_TYPES.includes(field.fieldType);

  return (
    <div className="rounded-xl border-2 border-accent/30 bg-white p-4 md:p-5 space-y-4 shadow-warm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">
            Question {index + 1}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {FIELD_TYPE_HINTS[field.fieldType]}
          </p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="text-xs font-semibold text-text-secondary hover:text-accent"
        >
          Done
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div>
          <FieldLabel>Question label</FieldLabel>
          <input
            value={field.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className={`${formInputClassName} mt-1`}
            placeholder="e.g. Why do you want to join staff?"
            required
          />
        </div>
        <div className="md:w-44">
          <FieldLabel>Type</FieldLabel>
          <select
            value={field.fieldType}
            onChange={(event) => {
              const fieldType = event.target.value as FormFieldType;
              onChange({
                fieldType,
                options: OPTION_FIELD_TYPES.includes(fieldType)
                  ? field.options?.length
                    ? field.options
                    : [""]
                  : undefined,
              });
            }}
            className={`${formInputClassName} mt-1`}
          >
            {Object.entries(FORM_FIELD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(event) => onChange({ required: event.target.checked })}
          className="w-4 h-4 accent-accent"
        />
        <span className="text-sm font-semibold text-text-dark">
          Required question
        </span>
      </label>

      {showPlaceholder ? (
        <div>
          <FieldLabel>Placeholder (optional)</FieldLabel>
          <input
            value={field.placeholder ?? ""}
            onChange={(event) =>
              onChange({ placeholder: event.target.value || null })
            }
            className={`${formInputClassName} mt-1`}
            placeholder="Hint text inside the answer box"
          />
        </div>
      ) : null}

      {needsOptions ? (
        <div>
          <FieldLabel>Answer choices</FieldLabel>
          <p className="text-xs text-text-secondary mt-1 mb-2">
            Add every option the user can pick from.
          </p>
          <OptionListEditor
            options={field.options ?? [""]}
            onChange={(options) => onChange({ options })}
          />
        </div>
      ) : null}

      {showHelpText ? (
        <div>
          <FieldLabel>Help text (optional)</FieldLabel>
          <input
            value={field.description ?? ""}
            onChange={(event) =>
              onChange({ description: event.target.value || null })
            }
            className={`${formInputClassName} mt-1`}
            placeholder="Extra guidance shown below the question"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowHelpText(true)}
          className="text-sm font-semibold text-accent hover:underline"
        >
          + Add help text
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="min-h-9 px-3 text-xs font-semibold rounded-lg border border-border bg-cream disabled:opacity-40"
        >
          Move up
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="min-h-9 px-3 text-xs font-semibold rounded-lg border border-border bg-cream disabled:opacity-40"
        >
          Move down
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={total <= 1}
          className="min-h-9 px-3 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-600 disabled:opacity-40"
        >
          Delete question
        </button>
      </div>
    </div>
  );
}

export function FormBuilder({
  mode,
  initial,
  canDelete,
  categories,
  roles,
}: FormBuilderProps) {
  const router = useRouter();
  const { markSaved } = useUnsavedChangesForm("form-builder");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? ""
  );
  const [buttonLabel, setButtonLabel] = useState(
    initial?.buttonLabel ?? "Submit"
  );
  const [reviewerRoleIds, setReviewerRoleIds] = useState<string[]>(
    initial?.reviewerRoleIds ?? []
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isOpen, setIsOpen] = useState(initial?.isOpen ?? true);
  const [fields, setFields] = useState<FormFieldInput[]>(
    initial?.fields.length
      ? initial.fields.map((field) => ({
          id: field.id,
          label: field.label,
          description: field.description,
          fieldType: field.fieldType,
          required: field.required,
          placeholder: field.placeholder,
          options: field.options,
          sortOrder: field.sortOrder,
        }))
      : []
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [newFieldType, setNewFieldType] = useState<FormFieldType>("SHORT_TEXT");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);
  const [savedBaseline, setSavedBaseline] = useState<FormBuilderSnapshot | null>(
    mode === "edit" && initial ? buildSnapshotFromAdminView(initial) : null
  );

  const hasSubmissions = (initial?.submissionCount ?? 0) > 0;

  const currentSnapshot = useMemo(
    () =>
      buildSnapshotFromState({
        title,
        categoryId,
        buttonLabel,
        reviewerRoleIds,
        description,
        isOpen,
        fields,
      }),
    [
      title,
      categoryId,
      buttonLabel,
      reviewerRoleIds,
      description,
      isOpen,
      fields,
    ]
  );

  const isDirty =
    mode === "edit" &&
    savedBaseline !== null &&
    !snapshotsEqual(currentSnapshot, savedBaseline);

  useUnsavedChangesFlag("form-builder", isDirty);

  function toggleReviewerRole(roleId: string) {
    setReviewerRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    );
  }

  const fieldCountLabel = useMemo(() => {
    const count = fields.length;
    return `${count} ${count === 1 ? "question" : "questions"}`;
  }, [fields.length]);

  function updateField(index: number, patch: Partial<FormFieldInput>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) {
      return;
    }
    setFields((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next.map((field, sortOrder) => ({ ...field, sortOrder }));
    });
    setExpandedIndex(target);
  }

  function removeField(index: number) {
    if (fields.length <= 1) {
      return;
    }
    setFields((current) =>
      current
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, sortOrder) => ({ ...field, sortOrder }))
    );
    setExpandedIndex((current) => {
      if (current === null) {
        return null;
      }
      if (current === index) {
        return Math.max(0, index - 1);
      }
      if (current > index) {
        return current - 1;
      }
      return current;
    });
  }

  function addField() {
    setFields((current) => {
      const next = [...current, createEmptyField(current.length, newFieldType)];
      setExpandedIndex(next.length - 1);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (fields.length === 0) {
      setError("Add at least one question before saving.");
      return;
    }

    setLoading(true);

    if (!categoryId) {
      setError("Select a parent category for this form.");
      setLoading(false);
      return;
    }

    if (reviewerRoleIds.length === 0) {
      setError("Select at least one reviewer role.");
      setLoading(false);
      return;
    }

    const payload = {
      title,
      categoryId,
      buttonLabel,
      reviewerRoleIds,
      description: description || null,
      isOpen,
      fields: fields.map((field, index) => ({
        ...field,
        sortOrder: index,
        options: OPTION_FIELD_TYPES.includes(field.fieldType)
          ? (field.options ?? []).map((o) => o.trim()).filter(Boolean)
          : undefined,
      })),
    };

    const result =
      mode === "create"
        ? await adminCreateForm(payload)
        : await adminUpdateForm(initial!.id, payload);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setSuccess(result.message ?? "Saved.");
    if (mode === "create" && result.forumSlug) {
      router.push(`/forum/${result.forumSlug}`);
      return;
    }
    setSavedBaseline(currentSnapshot);
    markSaved();
    router.refresh();
  }

  async function handleToggleOpen() {
    if (!initial) {
      return;
    }
    setTogglingOpen(true);
    setError("");
    const result = await adminSetFormOpen(initial.id, !isOpen);
    setTogglingOpen(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    setSavedBaseline(
      buildSnapshotFromState({
        title,
        categoryId,
        buttonLabel,
        reviewerRoleIds,
        description,
        isOpen: nextIsOpen,
        fields,
      })
    );
    markSaved();
    setSuccess(result.message ?? "Updated.");
    router.refresh();
  }

  async function handleDelete() {
    if (!initial || !canDelete || hasSubmissions) {
      return;
    }
    if (!window.confirm("Delete this form permanently?")) {
      return;
    }
    setDeleting(true);
    const result = await adminDeleteForm(initial.id);
    setDeleting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/admin/forms");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
          {success}
        </div>
      ) : null}

      {/* Step 1: Form info */}
      <section className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Step 1
          </p>
          <h2 className="text-lg font-bold text-text-dark mt-1">Form info</h2>
          <p className="text-sm text-text-secondary mt-1">
            Choose the parent category, name the form, and configure who can
            review submissions. A forum subcategory is created automatically.
          </p>
        </div>

        <div>
          <FieldLabel>Parent category</FieldLabel>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={`${formInputClassName} mt-1`}
            required
          >
            <option value="" disabled>
              Select a category
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-secondary mt-1">
            e.g. Department of Commerce
          </p>
        </div>

        <div>
          <FieldLabel>Form title</FieldLabel>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${formInputClassName} mt-1`}
            placeholder="e.g. Business Registration"
            required
          />
          <p className="text-xs text-text-secondary mt-1">
            Creates a forum subcategory with this name.
          </p>
        </div>

        <div>
          <FieldLabel>Button label</FieldLabel>
          <input
            value={buttonLabel}
            onChange={(event) => setButtonLabel(event.target.value)}
            className={`${formInputClassName} mt-1`}
            placeholder="e.g. Register"
            required
            maxLength={40}
          />
          <p className="text-xs text-text-secondary mt-1">
            Shown on the forum page to open the submission form.
          </p>
        </div>

        <div>
          <FieldLabel>Description (optional)</FieldLabel>
          <AutoResizeTextarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="form-field mt-1 min-h-[80px]"
            placeholder="Shown above the form when someone clicks the button"
          />
        </div>

        <div>
          <FieldLabel>Reviewer roles</FieldLabel>
          <p className="text-xs text-text-secondary mt-1 mb-3">
            These roles can view all submissions and reply. Everyone else only
            sees their own submission.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => {
              const checked = reviewerRoleIds.includes(role.id);
              return (
                <label
                  key={role.id}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3 cursor-pointer transition-colors",
                    checked
                      ? "border-accent/40 bg-yellow/20"
                      : "border-border bg-cream/30"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleReviewerRole(role.id)}
                    className="mt-0.5 w-4 h-4 accent-accent"
                  />
                  <span>
                    <span className="block text-sm font-bold text-text-dark">
                      {role.name}
                    </span>
                    <span className="block text-xs text-text-secondary mt-0.5">
                      {role.slug}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label
          className={cn(
            "flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
            isOpen
              ? "border-accent/40 bg-yellow/20"
              : "border-border bg-cream/30"
          )}
        >
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(event) => setIsOpen(event.target.checked)}
            className="mt-0.5 w-4 h-4 accent-accent"
          />
          <span>
            <span className="block text-sm font-bold text-text-dark">
              Accepting submissions
            </span>
            <span className="block text-xs text-text-secondary mt-1">
              Turn off to close the form without deleting it. Only logged-in
              Citizens can submit.
            </span>
          </span>
        </label>
      </section>

      {/* Step 2: Questions */}
      <section className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Step 2
            </p>
            <h2 className="text-lg font-bold text-text-dark mt-1">Questions</h2>
            <p className="text-sm text-text-secondary mt-1">
              Add the questions people will answer. Click a question to edit it.
            </p>
          </div>
          <p className="text-sm font-semibold text-text-secondary">{fieldCountLabel}</p>
        </div>

        {fields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-cream/30 px-6 py-10 text-center">
            <p className="font-semibold text-text-dark">No questions yet</p>
            <p className="text-sm text-text-secondary mt-2 max-w-md mx-auto">
              Choose a question type below and add your first question.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const isExpanded = expandedIndex === index;

              if (isExpanded) {
                return (
                  <FieldEditor
                    key={field.id ?? `new-${index}`}
                    field={field}
                    index={index}
                    total={fields.length}
                    onChange={(patch) => updateField(index, patch)}
                    onMove={(direction) => moveField(index, direction)}
                    onRemove={() => removeField(index)}
                    onCollapse={() => setExpandedIndex(null)}
                  />
                );
              }

              return (
                <button
                  key={field.id ?? `new-${index}`}
                  type="button"
                  onClick={() => setExpandedIndex(index)}
                  className="w-full text-left rounded-xl border border-border bg-cream/40 px-4 py-3.5 hover:border-accent/40 hover:bg-yellow/10 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text-dark truncate">
                        {index + 1}. {fieldSummaryLabel(field)}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">
                        {FORM_FIELD_TYPE_LABELS[field.fieldType]}
                        {field.required ? " · Required" : ""}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-accent shrink-0">
                      Edit
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
          <p className="text-sm font-bold text-text-dark">Add a question</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newFieldType}
              onChange={(event) =>
                setNewFieldType(event.target.value as FormFieldType)
              }
              className={formInputClassName}
            >
              {Object.entries(FORM_FIELD_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addField}
              className="min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm transition-all shrink-0"
            >
              Add question
            </button>
          </div>
          <p className="text-xs text-text-secondary">
            {FIELD_TYPE_HINTS[newFieldType]}
          </p>
        </div>
      </section>

      {/* Save */}
      <section className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-dark">Save form</h2>
            <p className="text-sm text-text-secondary mt-1">
              {mode === "create"
                ? "Creates the form forum under the selected category."
                : "Save your changes when you're done editing."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl disabled:opacity-60"
            >
              {loading ? "Saving…" : mode === "create" ? "Create form" : "Save changes"}
            </button>
            {mode === "edit" && initial ? (
              <>
                <a
                  href={`/forum/${initial.forumSlug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center px-5 py-3 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
                >
                  View forum
                </a>
                <a
                  href={`/admin/forms/${initial.id}/submissions`}
                  className="inline-flex min-h-11 items-center px-5 py-3 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
                >
                  Submissions ({initial.submissionCount})
                </a>
              </>
            ) : null}
          </div>
        </div>

        {mode === "edit" && initial ? (
          <div className="mt-5 pt-5 border-t border-border flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleToggleOpen}
              disabled={togglingOpen}
              className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary disabled:opacity-60"
            >
              {togglingOpen
                ? "Updating…"
                : isOpen
                  ? "Close form now"
                  : "Reopen form"}
            </button>
            {canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || hasSubmissions}
                className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 bg-white text-red-600 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete form"}
              </button>
            ) : null}
            {hasSubmissions ? (
              <p className="text-sm text-text-secondary self-center">
                Forms with submissions cannot be deleted.
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </form>
  );
}
