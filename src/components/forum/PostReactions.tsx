"use client";

import dynamic from "next/dynamic";
import type { ReactionType } from "@prisma/client";
import { togglePostReaction } from "@/lib/forum/actions";
import { ReactionsBarPlaceholder } from "@/components/shared/ReactionsBarPlaceholder";
import type { ReactionCounts } from "@/lib/forum/reactions";

const ReactionsBar = dynamic(
  () =>
    import("@/components/shared/ReactionsBar").then((module) => module.ReactionsBar),
  { ssr: false, loading: () => <ReactionsBarPlaceholder /> }
);

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
