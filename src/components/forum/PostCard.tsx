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
import type { Role } from "@prisma/client";

type PostAuthor = {
  id: string;
  username: string;
  role: Role;
  createdAt: Date;
  minecraftUsername: string | null;
};

type PostCardProps = {
  post: {
    id: string;
    content: string;
    createdAt: Date;
    author: PostAuthor;
    reactions: { type: ReactionType; userId: string }[];
  };
  currentUserId?: string | null;
  isLoggedIn?: boolean;
  isOriginalPost?: boolean;
};

export function PostCard({
  post,
  currentUserId = null,
  isLoggedIn = false,
  isOriginalPost = false,
}: PostCardProps) {
  const reactionSummary = summarizePostReactions(
    post.reactions,
    currentUserId
  );
  return (
    <article
      id={`post-${post.id}`}
      className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden scroll-mt-24"
    >
      <div className="flex flex-col sm:flex-row">
        <aside className="sm:w-44 shrink-0 bg-surface border-b sm:border-b-0 sm:border-r border-border px-5 py-5 text-center sm:text-left">
          <div className="profile-author-block flex flex-col items-center sm:items-start">
            <MinecraftHead
              seed={post.author.id}
              minecraftUsername={post.author.minecraftUsername}
              profileUsername={post.author.username}
              size={48}
            />
            <UserProfileLink
              username={post.author.username}
              className="mt-3 font-bold text-text-dark"
            />
          </div>
          <div className="mt-2 flex justify-center sm:justify-start">
            <RoleBadge role={post.author.role} />
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Joined {formatDate(post.author.createdAt).split(",")[0]}
          </p>
          {isOriginalPost && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-accent">
              OP
            </p>
          )}
        </aside>

        <div className="flex-1 px-6 py-5 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-border/60">
            <time
              dateTime={post.createdAt.toISOString()}
              className="text-xs text-text-secondary"
            >
              {formatDate(post.createdAt)}
            </time>
          </div>
          <div className="text-text-primary leading-relaxed whitespace-pre-wrap break-words">
            {post.content}
          </div>

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
