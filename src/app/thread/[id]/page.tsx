import type { Metadata } from "next";
import Link from "next/link";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { notFound } from "next/navigation";
import { canPost, getSessionUser, isModerator } from "@/lib/auth";
import { ThreadViewRecorder } from "@/components/forum/ThreadViewRecorder";
import { getThreadById } from "@/lib/forum/queries";
import { formatDate } from "@/lib/utils";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { PostCard } from "@/components/forum/PostCard";
import { MinecraftLinkRequiredNotice } from "@/components/forum/MinecraftLinkRequiredNotice";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ModThreadControls } from "@/components/forum/ModThreadControls";
import { QuoteReplyProvider } from "@/components/shared/QuoteReplyContext";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  const thread = await getThreadById(id);
  return {
    title: thread ? thread.title : "Thread",
  };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  const [thread, user] = await Promise.all([
    getThreadById(id),
    getSessionUser(),
  ]);

  if (!thread) {
    notFound();
  }

  const canModerate = user ? isModerator(user.role) : false;
  const canQuoteReply = !!(
    user &&
    canPost(user) &&
    !thread.isLocked
  );
  const replies = thread.posts.slice(1);

  return (
    <div className="bg-surface min-h-full">
      <ThreadViewRecorder threadId={thread.id} />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Forums", href: "/", restoreScroll: true },
            { label: thread.forum.category.name },
            {
              label: thread.forum.name,
              href: `/forum/${thread.forum.slug}`,
            },
            { label: thread.title },
          ]}
        />

        <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-text-dark">
                  {thread.title}
                </h1>
                {thread.isPinned && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-yellow/50 text-accent border border-accent/30">
                    Pinned
                  </span>
                )}
                {thread.isLocked && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-surface text-text-secondary border border-border">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-sm text-text-secondary mt-2">
                by{" "}
                <UserProfileLink
                  username={thread.author.username}
                  className="font-semibold text-text-dark"
                />
                <span className="mx-2">·</span>
                <time dateTime={thread.createdAt.toISOString()}>
                  {formatDate(thread.createdAt)}
                </time>
                <span className="mx-2">·</span>
                {thread.viewCount} views
              </p>
            </div>

            {canModerate && (
              <ModThreadControls
                threadId={thread.id}
                isPinned={thread.isPinned}
                isLocked={thread.isLocked}
              />
            )}
          </div>
        </div>

        <QuoteReplyProvider>
          <div className="mt-6 space-y-4">
            {thread.posts.length > 0 && (
              <PostCard
                threadId={thread.id}
                post={thread.posts[0]}
                currentUserId={user?.id}
                isLoggedIn={!!user}
                isOriginalPost
                canQuoteReply={canQuoteReply}
              />
            )}

            {replies.length > 0 && (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary pt-2">
                  {replies.length}{" "}
                  {replies.length === 1 ? "Reply" : "Replies"}
                </h2>
                {replies.map((post) => (
                  <PostCard
                    key={post.id}
                    threadId={thread.id}
                    post={post}
                    currentUserId={user?.id}
                    isLoggedIn={!!user}
                    canQuoteReply={canQuoteReply}
                  />
                ))}
              </>
            )}
          </div>

          <div className="mt-8">
            {thread.isLocked ? (
              <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-8 text-center">
                <p className="text-text-secondary font-medium">
                  This thread is locked. No new replies can be posted.
                </p>
              </div>
            ) : user ? (
              canPost(user) ? (
                <ReplyForm threadId={thread.id} />
              ) : (
                <MinecraftLinkRequiredNotice action="post replies" />
              )
            ) : (
              <div className="bg-white border border-border rounded-2xl shadow-warm px-6 py-8 text-center">
                <p className="text-text-secondary">
                  <Link
                    href="/login"
                    className="text-accent font-semibold hover:underline"
                  >
                    Sign in
                  </Link>{" "}
                  to post a reply.
                </p>
              </div>
            )}
          </div>
        </QuoteReplyProvider>
      </div>
    </div>
  );
}
