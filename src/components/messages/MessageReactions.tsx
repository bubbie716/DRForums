"use client";

import dynamic from "next/dynamic";
import type { ReactionType } from "@prisma/client";
import { toggleMessageReaction } from "@/lib/messages/actions";
import { ReactionsBarPlaceholder } from "@/components/shared/ReactionsBarPlaceholder";
import type { ReactionCounts } from "@/lib/forum/reactions";

const ReactionsBar = dynamic(
  () =>
    import("@/components/shared/ReactionsBar").then((module) => module.ReactionsBar),
  { ssr: false, loading: () => <ReactionsBarPlaceholder /> }
);

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
