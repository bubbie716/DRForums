import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/messages/queries";

type ConversationListProps = {
  conversations: ConversationListItem[];
  emptyTitle: string;
  emptyDescription: string;
};

function truncatePreview(content: string, maxLength = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

export function ConversationList({
  conversations,
  emptyTitle,
  emptyDescription,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-8 py-16 text-center">
        <h3 className="text-lg font-bold text-text-dark">{emptyTitle}</h3>
        <p className="text-text-secondary mt-2 max-w-md mx-auto">
          {emptyDescription}
        </p>
        <Link
          href="/messages/new"
          className="inline-block mt-6 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg transition-all duration-200"
        >
          Compose Message
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden divide-y divide-border/60">
      {conversations.map((conversation) => {
        const hasUnread = conversation.unreadCount > 0;
        const preview = conversation.latestMessage
          ? truncatePreview(conversation.latestMessage.content)
          : "No messages yet.";

        return (
          <Link
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            className={cn(
              "block px-6 py-5 transition-colors duration-200 hover:bg-hover",
              hasUnread && "bg-yellow/15 hover:bg-yellow/25"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "font-bold",
                      hasUnread ? "text-accent-dark" : "text-text-dark"
                    )}
                  >
                    {conversation.otherUser.username}
                  </span>
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-sm line-clamp-2 whitespace-pre-wrap",
                    hasUnread
                      ? "text-text-dark font-medium"
                      : "text-text-secondary"
                  )}
                >
                  {conversation.latestMessage &&
                    conversation.latestMessage.senderUsername !==
                      conversation.otherUser.username && (
                      <span className="text-text-secondary">You: </span>
                    )}
                  {preview}
                </p>
              </div>
              {conversation.latestMessage && (
                <time
                  dateTime={conversation.latestMessage.createdAt.toISOString()}
                  className="shrink-0 text-xs text-text-secondary tabular-nums"
                >
                  {formatRelativeDate(conversation.latestMessage.createdAt)}
                </time>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
