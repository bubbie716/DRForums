"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormSubmissionStatus } from "@prisma/client";
import { SubmissionStatusBadge } from "@/components/forms/SubmissionStatusBadge";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { adminReviewSubmission } from "@/lib/form/admin-actions";
import {
  getDefaultFormReviewPostContent,
  type ReviewedFormSubmissionStatus,
} from "@/lib/form/review-messages";
import type { SubmissionDetailView } from "@/lib/form/types";
import { formatDate } from "@/lib/utils";

type SubmissionReviewPanelProps = {
  submission: SubmissionDetailView;
  canManage: boolean;
  reviewerUsername: string;
};

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

const REVIEW_COMPLETE_MESSAGES: Record<
  Exclude<FormSubmissionStatus, "PENDING">,
  string
> = {
  ACCEPTED: "This submission was accepted. The thread is locked and the submitter was notified.",
  DENIED: "This submission was denied. The thread is locked and the submitter was notified.",
  CLOSED: "This submission was closed. The thread is locked and the submitter was notified.",
};

export function SubmissionReviewPanel({
  submission,
  canManage,
  reviewerUsername,
}: SubmissionReviewPanelProps) {
  const router = useRouter();
  const [internalNote, setInternalNote] = useState(submission.internalNote ?? "");
  const [previewStatus, setPreviewStatus] =
    useState<ReviewedFormSubmissionStatus>("ACCEPTED");
  const [reviewMessage, setReviewMessage] = useState(() =>
    getDefaultFormReviewPostContent("ACCEPTED", reviewerUsername)
  );
  const [messageCustomized, setMessageCustomized] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [reviewLocked, setReviewLocked] = useState(false);

  const isReviewComplete = submission.status !== "PENDING" || reviewLocked;
  const controlsDisabled = isReviewComplete || loading !== null;

  function applyDefaultMessage(status: ReviewedFormSubmissionStatus) {
    setPreviewStatus(status);
    if (!messageCustomized) {
      setReviewMessage(getDefaultFormReviewPostContent(status, reviewerUsername));
    }
  }

  function resetMessageToDefault() {
    setMessageCustomized(false);
    setReviewMessage(
      getDefaultFormReviewPostContent(previewStatus, reviewerUsername)
    );
  }

  async function updateStatus(status: FormSubmissionStatus) {
    if (controlsDisabled) {
      return;
    }

    setLoading(status);
    setError("");
    setSuccess("");

    const publicMessage = messageCustomized
      ? reviewMessage.trim()
      : getDefaultFormReviewPostContent(
          status as ReviewedFormSubmissionStatus,
          reviewerUsername
        );

    const result = await adminReviewSubmission(
      submission.id,
      status,
      internalNote,
      publicMessage
    );

    setLoading(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setReviewLocked(true);
    setSuccess(result.message ?? "Submission reviewed.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              Submission
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-text-dark">
              {submission.formTitle}
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              Submitted{" "}
              <time dateTime={submission.createdAt}>
                {formatDate(submission.createdAt)}
              </time>
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <SubmissionStatusBadge status={submission.status} />
            {submission.threadId ? (
              <Link
                href={`/thread/${submission.threadId}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                View submission thread →
              </Link>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-text-secondary">Submitter</dt>
            <dd className="font-semibold text-text-dark mt-1">
              {submission.submitter.username ?? "Anonymous"}
            </dd>
          </div>
          <div>
            <dt className="text-text-secondary">Minecraft</dt>
            <dd className="font-semibold text-text-dark mt-1">
              {submission.submitter.minecraftUsername ?? "—"}
            </dd>
          </div>
          {submission.reviewedBy ? (
            <div>
              <dt className="text-text-secondary">Reviewed by</dt>
              <dd className="font-semibold text-text-dark mt-1">
                {submission.reviewedBy.username}
                {submission.reviewedAt ? (
                  <span className="text-text-secondary font-normal">
                    {" "}
                    · {formatDate(submission.reviewedAt)}
                  </span>
                ) : null}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <div className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-bold text-text-dark">Answers</h2>
        <div className="space-y-4">
          {submission.answers.map((answer) => (
            <div
              key={answer.fieldId}
              className="rounded-xl border border-border bg-cream/40 px-4 py-3"
            >
              <p className="text-sm font-bold text-text-dark">{answer.fieldLabel}</p>
              <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">
                {formatAnswerValue(answer.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {canManage ? (
        <div className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6 space-y-4">
          <h2 className="text-lg font-bold text-text-dark">Staff review</h2>

          {isReviewComplete && submission.status !== "PENDING" ? (
            <div className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-text-secondary">
              {REVIEW_COMPLETE_MESSAGES[submission.status]}
            </div>
          ) : null}

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

          <div>
            <FieldLabel>Internal note</FieldLabel>
            <AutoResizeTextarea
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="form-field mt-1 min-h-[120px]"
              placeholder="Staff-only notes about this submission"
              disabled={controlsDisabled}
            />
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <FieldLabel>Message posted to the submission thread</FieldLabel>
              {messageCustomized && !controlsDisabled ? (
                <button
                  type="button"
                  onClick={resetMessageToDefault}
                  className="text-xs font-semibold text-accent hover:underline self-start sm:self-auto"
                >
                  Reset to default
                </button>
              ) : null}
            </div>
            <p className="text-xs text-text-secondary mt-1 mb-2">
              This is what the submitter will see in their thread. The default
              updates for each action until you edit it.
            </p>
            <AutoResizeTextarea
              value={reviewMessage}
              onChange={(event) => {
                setMessageCustomized(true);
                setReviewMessage(event.target.value);
              }}
              className="form-field min-h-[160px]"
              disabled={controlsDisabled}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onMouseDown={() => applyDefaultMessage("ACCEPTED")}
              onClick={() => updateStatus("ACCEPTED")}
              disabled={controlsDisabled}
              className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === "ACCEPTED" ? "Saving…" : "Mark accepted"}
            </button>
            <button
              type="button"
              onMouseDown={() => applyDefaultMessage("DENIED")}
              onClick={() => updateStatus("DENIED")}
              disabled={controlsDisabled}
              className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl bg-red-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === "DENIED" ? "Saving…" : "Mark denied"}
            </button>
            <button
              type="button"
              onMouseDown={() => applyDefaultMessage("CLOSED")}
              onClick={() => updateStatus("CLOSED")}
              disabled={controlsDisabled}
              className="min-h-10 px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === "CLOSED" ? "Saving…" : "Mark closed"}
            </button>
          </div>
        </div>
      ) : submission.internalNote ? (
        <div className="bg-white border border-border rounded-2xl shadow-warm p-5 md:p-6">
          <h2 className="text-lg font-bold text-text-dark">Internal note</h2>
          <p className="text-sm text-text-secondary mt-3 whitespace-pre-wrap">
            {submission.internalNote}
          </p>
        </div>
      ) : null}
    </div>
  );
}
