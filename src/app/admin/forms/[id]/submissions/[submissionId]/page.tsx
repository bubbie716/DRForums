import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SubmissionReviewPanel } from "@/components/admin/SubmissionReviewPanel";
import { getSessionUser } from "@/lib/auth";
import {
  getFormByIdForAdmin,
  getSubmissionDetail,
} from "@/lib/form/queries";
import { hasPermission } from "@/lib/permissions";

type Props = {
  params: Promise<{ id: string; submissionId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { submissionId } = await params;
  const submission = await getSubmissionDetail(submissionId);
  return {
    title: submission
      ? `Submission · ${submission.formTitle} · Admin`
      : "Submission · Admin",
  };
}

export default async function AdminSubmissionDetailPage({ params }: Props) {
  const { id, submissionId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [canView, canManage, form, submission] = await Promise.all([
    hasPermission(user.id, "form.viewResponses"),
    hasPermission(user.id, "form.manageResponses"),
    getFormByIdForAdmin(id),
    getSubmissionDetail(submissionId),
  ]);

  if (!canView) {
    redirect("/access-denied");
  }

  if (!form || !submission || submission.formId !== form.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/admin/forms/${form.id}/submissions`}
          className="inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
        >
          ← Back to submissions
        </Link>
      </div>
      <SubmissionReviewPanel
        submission={submission}
        canManage={canManage}
        reviewerUsername={user.username}
      />
    </div>
  );
}
