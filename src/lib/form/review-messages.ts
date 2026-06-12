import type { FormSubmissionStatus } from "@prisma/client";

const REVIEW_HEADINGS: Record<
  Exclude<FormSubmissionStatus, "PENDING">,
  string
> = {
  ACCEPTED: "Submission accepted",
  DENIED: "Submission denied",
  CLOSED: "Submission closed",
};

const REVIEW_MESSAGES: Record<
  Exclude<FormSubmissionStatus, "PENDING">,
  string
> = {
  ACCEPTED: "This form submission has been accepted.",
  DENIED: "This form submission has been denied.",
  CLOSED: "This form submission has been closed.",
};

export type ReviewedFormSubmissionStatus = Exclude<
  FormSubmissionStatus,
  "PENDING"
>;

export function getDefaultFormReviewPostContent(
  status: ReviewedFormSubmissionStatus,
  reviewerUsername: string
): string {
  return formatFormReviewPostContent(status, reviewerUsername);
}

export function formatFormReviewPostContent(
  status: ReviewedFormSubmissionStatus,
  reviewerUsername: string
): string {
  return [
    `[b]${REVIEW_HEADINGS[status]}[/b]`,
    "",
    REVIEW_MESSAGES[status],
    "",
    `Reviewed by ${reviewerUsername}.`,
  ].join("\n");
}

export function formReviewNotificationRoleName(
  status: ReviewedFormSubmissionStatus
): string {
  return status.toLowerCase();
}
