import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormsAdminList } from "@/components/admin/FormsAdminList";
import { requireFormStaffAccess } from "@/lib/form/access";
import { getAdminFormsList } from "@/lib/form/queries";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "Forms · Admin" };

export default async function AdminFormsPage() {
  const user = await requireFormStaffAccess();
  const [forms, canCreate] = await Promise.all([
    getAdminFormsList(),
    hasPermission(user.id, "form.create"),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Forms"
        description="Create and manage application forms, reports, and support requests."
        actions={
          canCreate ? (
            <Link
              href="/admin/forms/new"
              className="inline-flex min-h-11 items-center justify-center px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all"
            >
              New form
            </Link>
          ) : null
        }
      />
      <FormsAdminList forms={forms} canCreate={canCreate} />
    </div>
  );
}
