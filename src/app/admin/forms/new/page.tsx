import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FormBuilder } from "@/components/admin/FormBuilder";
import { getAdminCategoryOptions } from "@/lib/admin/queries";
import { getAdminRoles } from "@/lib/admin/role-queries";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = { title: "New Form · Admin" };

export default async function AdminNewFormPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [canCreate, categories, roles] = await Promise.all([
    hasPermission(user.id, "form.create"),
    getAdminCategoryOptions(),
    getAdminRoles(),
  ]);
  if (!canCreate) {
    redirect("/access-denied");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Create form"
        description="Pick a parent category, configure reviewer roles, add questions, then save. A forum subcategory is created automatically."
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
        mode="create"
        canDelete={false}
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
