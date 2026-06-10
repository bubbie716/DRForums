import { formatDate } from "@/lib/utils";
import { UserProfileLink } from "@/components/profile/UserProfileLink";
import { cn } from "@/lib/utils";
import {
  getReactionStateKey,
  summarizePostReactions,
} from "@/lib/forum/reactions";
import type { ReactionType } from "@prisma/client";
import { MessageReactions } from "@/components/messages/MessageReactions";
import { RenderedContent } from "@/components/forum/RenderedContent";
import { CopyPermalinkButton } from "@/components/shared/CopyPermalinkButton";
import { QuoteReplyButton } from "@/components/shared/QuoteReplyButton";

type MessageThreadProps = {
  conversationId: string;
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

function getMessagePermalink(
  conversationId: string,
  messageId: string
): string {
  return `/messages/${conversationId}#message-${messageId}`;
}

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
  isLoggedIn = true,
}: MessageThreadProps) {
  if (messages.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-8 py-12 text-center text-text-secondary">
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

        const permalink = getMessagePermalink(conversationId, message.id);

        return (
          <article
            key={message.id}
            id={`message-${message.id}`}
            className={cn(
              "bg-white border border-border rounded-2xl shadow-warm px-4 py-4 md:px-6 md:py-5 scroll-mt-24",
              isOwnMessage && "border-accent/20 bg-yellow/10"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <UserProfileLink
                  username={message.sender.username}
                  className="font-bold text-text-dark"
                />
                {isOwnMessage && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow/50 text-accent-dark border border-accent/20">
                    You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <time
                  dateTime={message.createdAt.toISOString()}
                  className="text-xs text-text-secondary tabular-nums"
                >
                  {formatDate(message.createdAt)}
                </time>
                {isLoggedIn && (
                  <QuoteReplyButton
                    username={message.sender.username}
                    content={message.content}
                    replyToMessageId={message.id}
                  />
                )}
                <CopyPermalinkButton
                  href={permalink}
                  label="Copy link to this message"
                />
              </div>
            </div>
            <RenderedContent
              content={message.content}
              className="text-text-primary leading-relaxed whitespace-pre-wrap break-words"
            />

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
