import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SubmissionStatusBadge } from "@/components/forms/SubmissionStatusBadge";
import { getSessionUser } from "@/lib/auth";
import { getFormByIdForAdmin, getFormSubmissionsList } from "@/lib/form/queries";
import { hasPermission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const form = await getFormByIdForAdmin(id);
  return {
    title: form ? `Submissions · ${form.title} · Admin` : "Submissions · Admin",
  };
}

export default async function AdminFormSubmissionsPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const canView = await hasPermission(user.id, "form.viewResponses");
  if (!canView) {
    redirect("/access-denied");
  }

  const [form, submissions] = await Promise.all([
    getFormByIdForAdmin(id),
    getFormSubmissionsList(id),
  ]);

  if (!form) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${form.title} submissions`}
        description="Review and manage responses to this form."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/forms/${form.id}/edit`}
              className="inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
            >
              Edit form
            </Link>
            <Link
              href="/admin/forms"
              className="inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
            >
              ← All forms
            </Link>
          </div>
        }
      />

      <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        {submissions.length === 0 ? (
          <div className="px-6 py-16 text-center text-text-secondary">
            No submissions yet.
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-widest">
              <div className="col-span-3">Submitter</div>
              <div className="col-span-3">Minecraft</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Submitted</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="px-5 py-4 md:grid md:grid-cols-12 md:gap-4 md:items-center"
                >
                  <div className="md:col-span-3 font-semibold text-text-dark">
                    {submission.submitterUsername ?? "Anonymous"}
                  </div>
                  <div className="mt-1 md:mt-0 md:col-span-3 text-sm text-text-secondary">
                    {submission.submitterMinecraft ?? "—"}
                  </div>
                  <div className="mt-2 md:mt-0 md:col-span-2">
                    <SubmissionStatusBadge status={submission.status} />
                  </div>
                  <div className="mt-2 md:mt-0 md:col-span-2 text-sm text-text-secondary">
                    {formatDate(submission.createdAt)}
                  </div>
                  <div className="mt-3 md:mt-0 md:col-span-2 flex flex-wrap justify-end gap-2">
                    {submission.threadId ? (
                      <Link
                        href={`/thread/${submission.threadId}`}
                        className="inline-flex min-h-9 items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                      >
                        Thread
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/forms/${form.id}/submissions/${submission.id}`}
                      className="inline-flex min-h-9 items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
