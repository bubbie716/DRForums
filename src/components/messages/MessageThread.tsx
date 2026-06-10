import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  getReactionStateKey,
  summarizePostReactions,
} from "@/lib/forum/reactions";
import type { ReactionType } from "@prisma/client";
import { MessageReactions } from "@/components/messages/MessageReactions";

type MessageThreadProps = {
  messages: {
    id: string;
    content: string;
    createdAt: Date;
    sender: {
      id: string;
      username: string;
    };
    reactions: { type: ReactionType; userId: string }[];
  }[];
  currentUserId: string;
  isLoggedIn?: boolean;
};

export function MessageThread({
  messages,
  currentUserId,
  isLoggedIn = true,
}: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-8 py-12 text-center text-text-secondary">
        No messages in this conversation yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOwnMessage = message.sender.id === currentUserId;
        const reactionSummary = summarizePostReactions(
          message.reactions,
          currentUserId
        );

        return (
          <article
            key={message.id}
            className={cn(
              "bg-white border border-border rounded-2xl shadow-warm px-6 py-5",
              isOwnMessage && "border-accent/20 bg-yellow/10"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${message.sender.username}`}
                  className="font-bold text-text-dark hover:text-accent transition-colors"
                >
                  {message.sender.username}
                </Link>
                {isOwnMessage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow/50 text-accent-dark border border-accent/20">
                    You
                  </span>
                )}
              </div>
              <time
                dateTime={message.createdAt.toISOString()}
                className="text-xs text-text-secondary tabular-nums"
              >
                {formatDate(message.createdAt)}
              </time>
            </div>
            <div className="text-text-primary leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
            <MessageReactions
              key={getReactionStateKey(
                reactionSummary.counts,
                reactionSummary.userReactions
              )}
              messageId={message.id}
              counts={reactionSummary.counts}
              userReactions={reactionSummary.userReactions}
              isLoggedIn={isLoggedIn}
            />
          </article>
        );
      })}
    </div>
  );
}
