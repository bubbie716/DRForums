"use client";

import { useRouter } from "next/navigation";
import { formatRelativeDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ConversationListItem } from "@/lib/messages/queries";
import { UserProfileLink } from "@/components/profile/UserProfileLink";

type ConversationListRowProps = {
  conversation: ConversationListItem;
};

function truncatePreview(content: string, maxLength = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function getConversationTitle(conversation: ConversationListItem): string {
  return (
    conversation.subject ??
    conversation.latestMessage?.content.trim() ??
    "Untitled conversation"
  );
}

export function ConversationListRow({ conversation }: ConversationListRowProps) {
  const router = useRouter();
  const hasUnread = conversation.unreadCount > 0;
  const title = getConversationTitle(conversation);
  const preview = conversation.latestMessage
    ? truncatePreview(conversation.latestMessage.content)
    : "No messages yet.";

  function openConversation() {
    router.push(`/messages/${conversation.id}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openConversation();
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openConversation}
      onKeyDown={handleKeyDown}
      className={cn(
        "block px-6 py-5 transition-colors duration-200 hover:bg-hover cursor-pointer",
        hasUnread && "bg-yellow/15 hover:bg-yellow/25"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "font-bold line-clamp-1",
                hasUnread ? "text-accent-dark" : "text-text-dark"
              )}
            >
              {title}
            </span>
            {hasUnread && (
              <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums">
                {conversation.unreadCount}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            with{" "}
            <UserProfileLink
              username={conversation.otherUser.username}
              className="font-semibold text-text-dark"
              onClick={(event) => event.stopPropagation()}
            />
          </p>
          <p
            className={cn(
              "mt-1 text-sm line-clamp-2 whitespace-pre-wrap",
              hasUnread ? "text-text-dark font-medium" : "text-text-secondary"
            )}
          >
            {conversation.latestMessage &&
              (conversation.latestMessage.senderUsername ===
              conversation.otherUser.username ? (
                <span className="text-text-secondary">
                  {conversation.otherUser.username}:{" "}
                </span>
              ) : (
                <span className="text-text-secondary">You: </span>
              ))}
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
    </div>
  );
}
