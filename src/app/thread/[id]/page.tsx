import type { Metadata } from "next";
import Link from "next/link";
import { threadPageMetadata } from "@/lib/metadata";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { notFound } from "next/navigation";
import { canPost, getSessionUser, needsMinecraftLink } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  canModerateForum,
  canReplyToThread,
  canViewThread,
} from "@/lib/forumAccess";
import { ThreadViewRecorder } from "@/components/forum/ThreadViewRecorder";
import { getThreadById } from "@/lib/forum/queries";
import { formatDate } from "@/lib/utils";
import { Breadcrumbs } from "@/components/forum/Breadcrumbs";
import { PostCard } from "@/components/forum/PostCard";
import { MinecraftLinkRequiredNotice } from "@/components/forum/MinecraftLinkRequiredNotice";
import { ReplyForm } from "@/components/forum/ReplyForm";
import { ModThreadControls } from "@/components/forum/ModThreadControls";
import { PollCard } from "@/components/forum/PollCard";
import { QuoteReplyProvider } from "@/components/shared/QuoteReplyContext";
import { getThreadPoll } from "@/lib/poll/queries";
import { hasMeaningfulPostContent } from "@/lib/forum/validation";

type ThreadPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  return threadPageMetadata(id);
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

  const allowed = await canViewThread(user?.id ?? null, thread.id);
  if (!allowed) {
    notFound();
  }

  const [canReply, canModerateForumAccess, poll, canReplyPermission] =
    await Promise.all([
      user ? canReplyToThread(user.id, thread.id) : Promise.resolve(false),
      user ? canModerateForum(user.id, thread.forum.id) : Promise.resolve(false),
      getThreadPoll(thread.id, user?.id ?? null),
      user ? hasPermission(user.id, "forum.thread.reply") : Promise.resolve(false),
    ]);

  // forum.thread.move permission exists but move UI is not implemented yet.
  const canModerate = !!(
    user &&
    canModerateForumAccess &&
    ((await hasPermission(user.id, "forum.thread.lock")) ||
      (await hasPermission(user.id, "forum.thread.pin")))
  );

  const canQuoteReply = !!(
    user &&
    canPost(user) &&
    !thread.isLocked &&
    canReply
  );
  const firstPost = thread.posts[0];
  const showOpeningPost =
    !!firstPost && hasMeaningfulPostContent(firstPost.content);
  const replies = (showOpeningPost ? thread.posts.slice(1) : thread.posts).filter(
    (post) => hasMeaningfulPostContent(post.content)
  );

  return (
    <div className="bg-surface min-h-full">
      <ThreadViewRecorder threadId={thread.id} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
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

        <div className="mt-6 bg-white border border-border rounded-2xl shadow-warm px-4 py-4 md:px-6 md:py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-text-dark break-words">
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
            {poll ? <PollCard poll={poll} isLoggedIn={!!user} /> : null}

            {showOpeningPost && firstPost ? (
              <PostCard
                threadId={thread.id}
                post={firstPost}
                currentUserId={user?.id}
                isLoggedIn={!!user}
                isThreadOp={firstPost.author.id === thread.author.id}
                canQuoteReply={canQuoteReply}
              />
            ) : null}

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
                    isThreadOp={post.author.id === thread.author.id}
                    canQuoteReply={canQuoteReply}
                  />
                ))}
              </>
            )}
          </div>

          <div className="mt-8">
            {thread.isLocked ? (
              <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-6 py-8 text-center">
                <p className="text-text-secondary font-medium">
                  This thread is locked. No new replies can be posted.
                </p>
              </div>
            ) : user ? (
              needsMinecraftLink(user) ? (
                <MinecraftLinkRequiredNotice action="post replies" />
              ) : !canReplyPermission ? (
                <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-6 py-8 text-center">
                  <p className="text-text-secondary font-medium">
                    You do not have permission to reply in this forum.
                  </p>
                </div>
              ) : !canReply ? (
                <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-6 py-8 text-center">
                  <p className="text-text-secondary font-medium">
                    You can only reply to threads you created in this forum.
                  </p>
                </div>
              ) : (
                <ReplyForm threadId={thread.id} />
              )
            ) : (
              <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-6 py-8 text-center">
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
