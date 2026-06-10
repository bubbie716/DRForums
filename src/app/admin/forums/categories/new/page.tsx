import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin/auth";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { CategoryForm } from "@/components/admin/CategoryForm";

export const metadata: Metadata = {
  title: "New Category",
};

export default async function NewCategoryPage() {
  await requireAdminPermission("admin.forums.manage");

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Forum Structure", href: "/admin/forums" },
            { label: "New Category" },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark">
            New Category
          </h1>
          <p className="mt-3 text-text-secondary">
            Create a top-level category for grouping related subcategories.
          </p>
        </div>

        <CategoryForm mode="create" />
      </div>
    </div>
  );
}
