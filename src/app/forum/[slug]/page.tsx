import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canPost, getSessionUser } from "@/lib/auth";
import { getForumBySlug, getForumThreads } from "@/lib/forum/queries";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { MinecraftLinkRequiredNotice } from "@/components/forum/MinecraftLinkRequiredNotice";
import { ThreadRow } from "@/components/forum/ThreadRow";

type ForumPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ForumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const forum = await getForumBySlug(slug);
  return {
    title: forum ? forum.name : "Forum",
  };
}

export default async function ForumPage({ params }: ForumPageProps) {
  const { slug } = await params;
  const [forum, user] = await Promise.all([
    getForumBySlug(slug),
    getSessionUser(),
  ]);

  if (!forum) {
    notFound();
  }

  const threads = await getForumThreads(forum.id);

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/" },
            { label: forum.category.name },
            { label: forum.name },
          ]}
        />

        <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-text-dark">
              {forum.name}
            </h1>
            {forum.description && (
              <p className="text-text-secondary mt-2 max-w-2xl leading-relaxed">
                {forum.description}
              </p>
            )}
          </div>

          {user &&
            (canPost(user) ? (
              <Link
                href={`/forum/${forum.slug}/new`}
                className="shrink-0 inline-flex items-center justify-center px-6 py-3 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Create Thread
              </Link>
            ) : (
              <Link
                href="/settings"
                className="shrink-0 inline-flex items-center justify-center px-6 py-3 bg-yellow text-text-dark font-bold rounded-xl hover:shadow-warm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Link Minecraft to Post
              </Link>
            ))}
        </div>

        <div className="mt-8 bg-cream border border-border rounded-2xl shadow-warm overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3.5 bg-surface border-b border-border text-xs font-bold text-text-secondary uppercase tracking-widest">
            <div className="col-span-5">Thread</div>
            <div className="col-span-1 text-center">Replies</div>
            <div className="col-span-1 text-center">Views</div>
            <div className="col-span-2 text-center">Started</div>
            <div className="col-span-3 text-right">Last Reply</div>
          </div>

          {threads.length > 0 ? (
            threads.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))
          ) : (
            <div className="px-6 py-16 text-center">
              <p className="text-text-secondary">No threads yet.</p>
              {user &&
                (canPost(user) ? (
                  <Link
                    href={`/forum/${forum.slug}/new`}
                    className="inline-block mt-4 text-accent font-semibold hover:underline"
                  >
                    Start the first discussion
                  </Link>
                ) : (
                  <Link
                    href="/settings"
                    className="inline-block mt-4 text-accent font-semibold hover:underline"
                  >
                    Link Minecraft to start the first discussion
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
