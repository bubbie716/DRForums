import type { FormSubmissionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<FormSubmissionStatus, string> = {
  PENDING: "bg-yellow/40 text-accent border-accent/30",
  ACCEPTED: "bg-green-100 text-green-800 border-green-200",
  DENIED: "bg-red-50 text-red-700 border-red-200",
  CLOSED: "bg-surface text-text-secondary border-border",
};

const STATUS_LABELS: Record<FormSubmissionStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DENIED: "Denied",
  CLOSED: "Closed",
};

export function SubmissionStatusBadge({
  status,
}: {
  status: FormSubmissionStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
