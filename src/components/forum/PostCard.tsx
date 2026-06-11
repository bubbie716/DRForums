import { formatDate } from "@/lib/utils";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import {
  getReactionStateKey,
  summarizePostReactions,
} from "@/lib/forum/reactions";
import type { ReactionType } from "@prisma/client";
import { MinecraftHead } from "./MinecraftHead";
import { PostReactions } from "./PostReactions";
import { RoleBadge } from "./RoleBadge";
import { RenderedContent } from "@/components/forum/RenderedContent";
import { CopyPermalinkButton } from "@/components/shared/CopyPermalinkButton";
import { QuoteReplyButton } from "@/components/shared/QuoteReplyButton";
import type { DisplayRole } from "@/lib/display-role";

type PostAuthor = {
  id: string;
  username: string;
  displayRole: DisplayRole | null;
  createdAt: Date;
  minecraftUsername: string | null;
};

type PostCardProps = {
  threadId: string;
  post: {
    id: string;
    content: string;
    createdAt: Date;
    author: PostAuthor;
    reactions: { type: ReactionType; userId: string }[];
  };
  currentUserId?: string | null;
  isLoggedIn?: boolean;
  isThreadOp?: boolean;
  canQuoteReply?: boolean;
};

function getPostPermalink(threadId: string, postId: string): string {
  return `/thread/${threadId}#post-${postId}`;
}

export function PostCard({
  threadId,
  post,
  currentUserId = null,
  isLoggedIn = false,
  isThreadOp = false,
  canQuoteReply = false,
}: PostCardProps) {
  const reactionSummary = summarizePostReactions(
    post.reactions,
    currentUserId
  );
  const permalink = getPostPermalink(threadId, post.id);
  return (
    <article
      id={`post-${post.id}`}
      className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row">
        <aside className="sm:w-48 shrink-0 bg-surface border-b sm:border-b-0 sm:border-r border-border px-4 py-3 sm:px-4 sm:py-6">
          <div className="profile-author-block flex sm:hidden items-center gap-3 min-w-0">
            <MinecraftHead
              seed={post.author.id}
              minecraftUsername={post.author.minecraftUsername}
              profileUsername={post.author.username}
              size={36}
            />
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <UserProfileLink
                  username={post.author.username}
                  className="text-sm font-bold text-text-dark truncate"
                />
                {isThreadOp && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                    OP
                  </span>
                )}
              </div>
              <RoleBadge displayRole={post.author.displayRole} />
            </div>
          </div>

          <div className="profile-author-block hidden sm:flex flex-col items-center gap-2.5 text-center w-full">
            <MinecraftHead
              seed={post.author.id}
              minecraftUsername={post.author.minecraftUsername}
              profileUsername={post.author.username}
              size={52}
            />
            <div className="flex items-center justify-center gap-2 max-w-full">
              <UserProfileLink
                username={post.author.username}
                className="font-bold text-text-dark break-words leading-tight"
              />
              {isThreadOp && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent">
                  OP
                </span>
              )}
            </div>
            <RoleBadge displayRole={post.author.displayRole} />
            <p className="text-xs text-text-secondary">
              Joined {formatDate(post.author.createdAt).split(",")[0]}
            </p>
          </div>
        </aside>

        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 min-w-0">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-border/60">
            <time
              dateTime={post.createdAt.toISOString()}
              className="text-xs text-text-secondary"
            >
              {formatDate(post.createdAt)}
            </time>
            <div className="flex items-center gap-1 shrink-0">
              {canQuoteReply && (
                <QuoteReplyButton
                  username={post.author.username}
                  content={post.content}
                  replyToPostId={post.id}
                />
              )}
              <CopyPermalinkButton
                href={permalink}
                label="Copy link to this post"
              />
            </div>
          </div>
          <RenderedContent
            content={post.content}
            className="text-text-primary leading-relaxed whitespace-pre-wrap break-words"
          />

          <PostReactions
            key={getReactionStateKey(
              reactionSummary.counts,
              reactionSummary.userReactions
            )}
            postId={post.id}
            counts={reactionSummary.counts}
            userReactions={reactionSummary.userReactions}
            isLoggedIn={isLoggedIn}
          />
        </div>
      </div>
    </article>
  );
}
