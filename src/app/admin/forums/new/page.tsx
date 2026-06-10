import type { Metadata } from "next";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminCategoryOptions } from "@/lib/admin/queries";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { ForumForm } from "@/components/admin/ForumForm";

export const metadata: Metadata = {
  title: "New Subcategory · Admin",
};

type NewForumPageProps = {
  searchParams: Promise<{ categoryId?: string }>;
};

export default async function NewForumPage({ searchParams }: NewForumPageProps) {
  await requireAdminPermission("admin.forums.manage");
  const { categoryId } = await searchParams;
  const categories = await getAdminCategoryOptions();

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Forum Structure", href: "/admin/forums" },
            { label: "New Subcategory" },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark">
            New Subcategory
          </h1>
          <p className="mt-3 text-text-secondary">
            Add a subcategory inside an existing category. This is where members
            will post threads.
          </p>
        </div>

        {categories.length > 0 ? (
          <ForumForm
            mode="create"
            categories={categories}
            defaultCategoryId={categoryId}
          />
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-10 text-center text-text-secondary">
            Create a category before adding subcategories.
          </div>
        )}
      </div>
    </div>
  );
}
