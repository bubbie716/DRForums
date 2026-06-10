"use client";

import type { ReactionType } from "@prisma/client";
import { toggleMessageReaction } from "@/lib/messages/actions";
import { ReactionsBar } from "@/components/shared/ReactionsBar";
import type { ReactionCounts } from "@/lib/forum/reactions";

type MessageReactionsProps = {
  messageId: string;
  counts: ReactionCounts;
  userReactions: ReactionType[];
  isLoggedIn: boolean;
};

export function MessageReactions({
  messageId,
  counts,
  userReactions,
  isLoggedIn,
}: MessageReactionsProps) {
  return (
    <ReactionsBar
      itemId={messageId}
      counts={counts}
      userReactions={userReactions}
      isLoggedIn={isLoggedIn}
      onToggle={(type) => toggleMessageReaction(messageId, type)}
    />
  );
}
