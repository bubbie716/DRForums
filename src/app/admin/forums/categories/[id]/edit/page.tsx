import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminCategoryById } from "@/lib/admin/queries";
import { getCategoryRoleAccessRows } from "@/lib/admin/forum-role-permission-queries";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { ForumRoleAccessSection } from "@/components/admin/ForumRoleAccessSection";
import { getAdminCategoryEditTitle } from "@/lib/metadata";

type EditCategoryPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditCategoryPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: await getAdminCategoryEditTitle(id) };
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  await requireAdminPermission("admin.forums.manage");
  const { id } = await params;
  const [category, roleAccessRows] = await Promise.all([
    getAdminCategoryById(id),
    getCategoryRoleAccessRows(id),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Forum Structure", href: "/admin/forums" },
            { label: category.name },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark break-words">
            Edit Category
          </h1>
          <p className="mt-3 text-text-secondary">
            Change the name, description, visibility, or display order.
          </p>
        </div>

        <div className="space-y-8">
          <CategoryForm
            mode="edit"
            initialValues={{
              id: category.id,
              name: category.name,
              slug: category.slug,
              description: category.description,
              sortOrder: category.sortOrder,
              isVisible: category.isVisible,
              forumCount: category._count.forums,
              threadCount: category.threadCount,
            }}
          />

          <ForumRoleAccessSection
            scope="category"
            targetId={category.id}
            initialRows={roleAccessRows}
          />
        </div>
      </div>
    </div>
  );
}
