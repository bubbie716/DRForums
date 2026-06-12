import Link from "next/link";
import type { FormListItem } from "@/lib/form/types";
import { formatDate } from "@/lib/utils";

type FormsAdminListProps = {
  forms: FormListItem[];
  canCreate: boolean;
};

export function FormsAdminList({ forms, canCreate }: FormsAdminListProps) {
  if (forms.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-16 text-center">
        <p className="text-text-secondary">No forms yet.</p>
        {canCreate ? (
          <Link
            href="/admin/forms/new"
            className="inline-block mt-4 text-accent font-semibold hover:underline"
          >
            Create your first form
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-widest">
        <div className="col-span-3">Form</div>
        <div className="col-span-2">Category</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-1 text-center">Submissions</div>
        <div className="col-span-2">Created</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      <div className="divide-y divide-border">
        {forms.map((form) => (
          <div
            key={form.id}
            className="px-5 py-4 md:grid md:grid-cols-12 md:gap-4 md:items-center"
          >
            <div className="md:col-span-3 min-w-0">
              <p className="font-bold text-text-dark truncate">{form.title}</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Button: {form.buttonLabel}
              </p>
            </div>

            <div className="mt-2 md:mt-0 md:col-span-2 text-sm text-text-secondary">
              {form.categoryName}
            </div>

            <div className="mt-2 md:mt-0 md:col-span-2">
              <span
                className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                  form.isOpen
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-surface text-text-secondary border-border"
                }`}
              >
                {form.isOpen ? "Open" : "Closed"}
              </span>
            </div>

            <div className="mt-2 md:mt-0 md:col-span-1 md:text-center text-sm font-semibold text-text-dark">
              {form.submissionCount}
            </div>

            <div className="mt-2 md:mt-0 md:col-span-2 text-sm text-text-secondary">
              {formatDate(form.createdAt)}
            </div>

            <div className="mt-3 md:mt-0 md:col-span-2 flex flex-wrap justify-start md:justify-end gap-2">
              <Link
                href={`/forum/${form.forumSlug}`}
                className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
              >
                Forum
              </Link>
              <Link
                href={`/admin/forms/${form.id}/submissions`}
                className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
              >
                Submissions
              </Link>
              <Link
                href={`/admin/forms/${form.id}/edit`}
                className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-white text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
              >
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
