import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdminPermission } from "@/lib/admin/auth";
import { getAdminForumTree } from "@/lib/admin/queries";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { AdminNoticeBanner } from "@/components/admin/AdminNoticeBanner";
import { ForumManagementList } from "@/components/admin/ForumManagementList";

export const metadata: Metadata = {
  title: "Forum Structure · Admin",
};

export default async function AdminForumsPage() {
  await requireAdminPermission("admin.forums.manage");
  const categories = await getAdminForumTree();

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Admin", href: "/admin" },
            { label: "Forum Structure" },
          ]}
        />

        <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-dark">
              Forum Structure
            </h1>
            <p className="mt-3 text-text-secondary max-w-2xl leading-relaxed">
              Categories group subcategories. Subcategories are where members post
              threads.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin/forums/categories/new"
              className="inline-flex items-center justify-center min-h-11 px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
            >
              New Category
            </Link>
            <Link
              href="/admin/forums/new"
              className="inline-flex items-center justify-center min-h-11 px-6 py-3 bg-yellow text-text-dark font-bold rounded-xl hover:shadow-warm transition-all duration-200"
            >
              Add Subcategory
            </Link>
          </div>
        </div>

        <div className="mt-8 bg-cream border border-border rounded-2xl px-4 py-4 md:px-5 md:py-5 text-sm text-text-secondary leading-relaxed">
          <span className="font-bold text-text-dark">How it&apos;s organized:</span>{" "}
          Categories are the big sections. Subcategories are where members
          actually post. Use display order to control what shows up first.
        </div>

        <div className="mt-6">
          <Suspense fallback={null}>
            <AdminNoticeBanner />
          </Suspense>
          <ForumManagementList
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              slug: category.slug,
              description: category.description,
              sortOrder: category.sortOrder,
              isVisible: category.isVisible,
              forumCount: category._count.forums,
              forums: category.forums.map((forum) => ({
                id: forum.id,
                name: forum.name,
                slug: forum.slug,
                description: forum.description,
                sortOrder: forum.sortOrder,
                isVisible: forum.isVisible,
                isLocked: forum.isLocked,
                threadCount: forum._count.threads,
              })),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
