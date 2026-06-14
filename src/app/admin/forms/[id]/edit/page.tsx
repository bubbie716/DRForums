import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormBuilder } from "@/components/admin/FormBuilder";
import { getAdminCategoryOptions } from "@/lib/admin/queries";
import { getAdminRoles } from "@/lib/admin/role-queries";
import { getSessionUser } from "@/lib/auth";
import { getFormByIdForAdmin } from "@/lib/form/queries";
import { getAdminFormEditTitle } from "@/lib/metadata";
import { hasPermission } from "@/lib/permissions";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: await getAdminFormEditTitle(id) };
}

export default async function AdminEditFormPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [form, canEdit, canDelete, categories, roles] = await Promise.all([
    getFormByIdForAdmin(id),
    hasPermission(user.id, "form.edit"),
    hasPermission(user.id, "form.delete"),
    getAdminCategoryOptions(),
    getAdminRoles(),
  ]);

  if (!form) {
    notFound();
  }

  if (!canEdit) {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Edit ${form.title}`}
        description="Edit form info in Step 1, then click any question in Step 2 to change it."
        actions={
          <Link
            href="/admin/forms"
            className="inline-flex min-h-10 items-center px-4 py-2 text-sm font-semibold rounded-xl border border-border bg-white text-text-secondary hover:text-accent transition-colors"
          >
            ← Back to forms
          </Link>
        }
      />
      <FormBuilder
        mode="edit"
        initial={form}
        canDelete={canDelete}
        categories={categories}
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          slug: role.slug,
        }))}
      />
    </div>
  );
}
