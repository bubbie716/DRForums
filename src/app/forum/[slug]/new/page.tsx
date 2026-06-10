import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canPost, getSessionUser } from "@/lib/auth";
import { getForumBySlug } from "@/lib/forum/queries";
import {
  canCreateThread,
  canReadForum,
  canViewForum,
} from "@/lib/forumAccess";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { CreateThreadForm } from "@/components/forum/CreateThreadForm";
import { MinecraftLinkRequiredNotice } from "@/components/forum/MinecraftLinkRequiredNotice";

type NewThreadPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: NewThreadPageProps): Promise<Metadata> {
  const { slug } = await params;
  const forum = await getForumBySlug(slug);
  return {
    title: forum ? `New Thread · ${forum.name}` : "New Thread",
  };
}

export default async function NewThreadPage({ params }: NewThreadPageProps) {
  const { slug } = await params;
  const [user, forum] = await Promise.all([
    getSessionUser(),
    getForumBySlug(slug),
  ]);

  if (!user) {
    redirect(`/login`);
  }

  if (!forum) {
    notFound();
  }

  const [canView, canRead, canCreate] = await Promise.all([
    canViewForum(user.id, forum.id),
    canReadForum(user.id, forum.id),
    canCreateThread(user.id, forum.id),
  ]);

  if (!canView || !canRead || !canCreate) {
    notFound();
  }

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/", restoreScroll: true },
            { label: forum.category.name },
            { label: forum.name, href: `/forum/${forum.slug}` },
            { label: "New Thread" },
          ]}
        />

        <h1 className="mt-6 text-xl sm:text-2xl font-extrabold text-text-dark">
          Create Thread
        </h1>
        <p className="text-text-secondary mt-2">
          Posting in <span className="font-semibold text-text-dark">{forum.name}</span>
        </p>

        <div className="mt-8">
          {forum.isLocked ? (
            <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-6 py-8 text-center">
              <p className="text-text-secondary font-medium">
                This forum is locked. No new threads can be created.
              </p>
            </div>
          ) : canPost(user) ? (
            <CreateThreadForm forumSlug={forum.slug} />
          ) : (
            <MinecraftLinkRequiredNotice action="create threads" />
          )}
        </div>
      </div>
    </div>
  );
}
