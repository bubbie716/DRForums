"use client";

import type { ReactionType } from "@prisma/client";
import { togglePostReaction } from "@/lib/forum/actions";
import { ReactionsBar } from "@/components/shared/ReactionsBar";
import type { ReactionCounts } from "@/lib/forum/reactions";

type PostReactionsProps = {
  postId: string;
  counts: ReactionCounts;
  userReactions: ReactionType[];
  isLoggedIn: boolean;
};

export function PostReactions({
  postId,
  counts,
  userReactions,
  isLoggedIn,
}: PostReactionsProps) {
  return (
    <ReactionsBar
      itemId={postId}
      counts={counts}
      userReactions={userReactions}
      isLoggedIn={isLoggedIn}
      onToggle={(type) => togglePostReaction(postId, type)}
    />
  );
}
