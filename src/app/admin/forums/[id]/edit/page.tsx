import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  getAdminCategoryOptions,
  getAdminForumById,
} from "@/lib/admin/queries";
import { getForumRoleAccessRows } from "@/lib/admin/forum-role-permission-queries";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { ForumForm } from "@/components/admin/ForumForm";
import { ForumRoleAccessSection } from "@/components/admin/ForumRoleAccessSection";
import { getAdminForumEditTitle } from "@/lib/metadata";

type EditForumPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: EditForumPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: await getAdminForumEditTitle(id) };
}

export default async function EditForumPage({ params }: EditForumPageProps) {
  await requireAdminPermission("admin.forums.manage");
  const { id } = await params;
  const [forum, categories, roleAccessRows] = await Promise.all([
    getAdminForumById(id),
    getAdminCategoryOptions(),
    getForumRoleAccessRows(id),
  ]);

  if (!forum) {
    notFound();
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Forum Structure", href: "/admin/forums" },
            { label: forum.name },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark break-words">
            Edit Subcategory
          </h1>
          <p className="mt-3 text-text-secondary">
            Update subcategory details, parent category, visibility, and lock
            status.
          </p>
        </div>

        <div className="space-y-8">
          <ForumForm
            mode="edit"
            categories={categories}
            initialValues={{
              id: forum.id,
              categoryId: forum.categoryId,
              name: forum.name,
              slug: forum.slug,
              description: forum.description,
              sortOrder: forum.sortOrder,
              isVisible: forum.isVisible,
              isLocked: forum.isLocked,
              threadCount: forum._count.threads,
            }}
          />

          <ForumRoleAccessSection
            scope="forum"
            targetId={forum.id}
            initialRows={roleAccessRows}
          />
        </div>
      </div>
    </div>
  );
}
