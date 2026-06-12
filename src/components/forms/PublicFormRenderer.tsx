"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { submitForm } from "@/lib/form/actions";
import { OPTION_FIELD_TYPES, type PublicFormView } from "@/lib/form/types";

type PublicFormRendererProps = {
  form: PublicFormView;
  isLoggedIn: boolean;
  variant?: "card" | "fullscreen";
  onSubmitted?: () => void;
  onCancel?: () => void;
};

export function PublicFormRenderer({
  form,
  isLoggedIn,
  variant = "card",
  onSubmitted,
  onCancel,
}: PublicFormRendererProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const forumPath = `/forum/${form.forumSlug}`;
  const isFullscreen = variant === "fullscreen";
  const panelClassName = isFullscreen
    ? "space-y-6"
    : "bg-white border border-border rounded-2xl shadow-warm p-5 md:p-8 space-y-6";
  const statePanelClassName = isFullscreen
    ? "px-2 py-12 text-center"
    : "bg-white border border-border rounded-2xl shadow-warm px-6 py-12 text-center";

  if (!form.isOpen) {
    return (
      <div className={statePanelClassName}>
        <p className="text-lg font-bold text-text-dark">This form is closed</p>
        <p className="text-text-secondary mt-2">
          This form is no longer accepting new submissions.
        </p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={statePanelClassName}>
        <p className="text-lg font-bold text-text-dark">Sign in required</p>
        <p className="text-text-secondary mt-2">
          You must be logged in to submit this form.
        </p>
        <Link
          href={`/login?next=${forumPath}`}
          className="inline-flex mt-6 min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className={statePanelClassName}>
        <p className="text-lg font-bold text-text-dark">Submission received</p>
        <p className="text-text-secondary mt-2">{success}</p>
      </div>
    );
  }

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await submitForm(form.forumSlug, answers);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSuccess(result.message ?? "Your submission has been received.");
    onSubmitted?.();
    if (result.threadId) {
      router.push(`/thread/${result.threadId}`);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={panelClassName}>
      {error ? (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {error}
        </div>
      ) : null}

      {form.fields.map((field) => {
        const needsOptions = OPTION_FIELD_TYPES.includes(field.fieldType);

        return (
          <div key={field.id} className="space-y-2">
            <FieldLabel>
              {field.label}
              {field.required ? (
                <span className="text-accent ml-1" aria-hidden="true">
                  *
                </span>
              ) : null}
            </FieldLabel>
            {field.description ? (
              <p className="text-sm text-text-secondary">{field.description}</p>
            ) : null}

            {field.fieldType === "LONG_TEXT" ? (
              <AutoResizeTextarea
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className="form-field min-h-[140px]"
                placeholder={field.placeholder ?? undefined}
                required={field.required}
              />
            ) : field.fieldType === "SHORT_TEXT" ? (
              <input
                type="text"
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className={formInputClassName}
                placeholder={field.placeholder ?? undefined}
                required={field.required}
              />
            ) : field.fieldType === "NUMBER" ? (
              <input
                type="number"
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className={formInputClassName}
                placeholder={field.placeholder ?? undefined}
                required={field.required}
              />
            ) : field.fieldType === "DATE" ? (
              <input
                type="date"
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className={formInputClassName}
                required={field.required}
              />
            ) : field.fieldType === "DROPDOWN" ? (
              <select
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className={formInputClassName}
                required={field.required}
              >
                <option value="">Select an option</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.fieldType === "RADIO" ? (
              <div className="space-y-2">
                {field.options.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-xl border border-border bg-cream/40 px-4 py-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`field-${field.id}`}
                      value={option}
                      checked={answers[field.id] === option}
                      onChange={() => setAnswer(field.id, option)}
                      required={field.required}
                      className="accent-accent"
                    />
                    <span className="text-sm font-medium text-text-dark">
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            ) : field.fieldType === "CHECKBOX" ? (
              <div className="space-y-2">
                {field.options.map((option) => {
                  const selected = Array.isArray(answers[field.id])
                    ? (answers[field.id] as string[]).includes(option)
                    : false;

                  return (
                    <label
                      key={option}
                      className="flex items-center gap-3 rounded-xl border border-border bg-cream/40 px-4 py-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) => {
                          const current = Array.isArray(answers[field.id])
                            ? [...(answers[field.id] as string[])]
                            : [];
                          const next = event.target.checked
                            ? [...current, option]
                            : current.filter((value) => value !== option);
                          setAnswer(field.id, next);
                        }}
                        className="accent-accent"
                      />
                      <span className="text-sm font-medium text-text-dark">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : needsOptions ? null : (
              <input
                type="text"
                value={String(answers[field.id] ?? "")}
                onChange={(event) => setAnswer(field.id, event.target.value)}
                className={formInputClassName}
                required={field.required}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 pt-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-h-11 px-8 py-3 font-bold rounded-xl border border-border bg-white text-text-secondary hover:text-text-dark transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 px-8 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 sm:ml-auto"
        >
          {loading ? "Submitting…" : form.buttonLabel}
        </button>
      </div>
    </form>
  );
}
