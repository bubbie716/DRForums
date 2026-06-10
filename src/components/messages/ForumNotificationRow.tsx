"use client";

import { useRouter } from "next/navigation";
import { formatRelativeDate } from "@/lib/utils";
import { MinecraftHead } from "@/components/forum/MinecraftHead";
import { REACTION_META } from "@/lib/forum/reactions";
import type { ForumNotificationItem } from "@/lib/forum-notifications/queries";
import { markForumNotificationAsRead } from "@/lib/forum-notifications/actions";
import { cn } from "@/lib/utils";

type ForumNotificationRowProps = {
  notification: ForumNotificationItem;
};

function truncateContent(content: string, maxLength = 120): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}…`;
}

function getNotificationHref(notification: ForumNotificationItem): string {
  const threadId = notification.thread?.id ?? notification.post?.thread.id;
  const postId = notification.post?.id;

  if (threadId && postId) {
    return `/thread/${threadId}#post-${postId}`;
  }

  if (threadId) {
    return `/thread/${threadId}`;
  }

  if (notification.type === "ROLE_ASSIGNED" || notification.type === "ROLE_REMOVED") {
    return `/profile/${notification.recipientUsername}`;
  }

  return "/messages";
}

function getNotificationMessage(notification: ForumNotificationItem): string {
  const threadTitle = notification.thread?.title;

  switch (notification.type) {
    case "MENTION":
      return threadTitle
        ? `mentioned you in ${threadTitle}`
        : "mentioned you in a forum post";
    case "THREAD_REPLY":
      return threadTitle
        ? `replied to your thread ${threadTitle}`
        : "replied to your thread";
    case "POST_REACTION": {
      const emoji = notification.reactionType
        ? REACTION_META[notification.reactionType].emoji
        : "reacted";
      return threadTitle
        ? `reacted ${emoji} to your post in ${threadTitle}`
        : `reacted ${emoji} to your post`;
    }
    case "ROLE_ASSIGNED":
      return notification.roleName
        ? `assigned you the ${notification.roleName} role`
        : "assigned you a new role";
    case "ROLE_REMOVED":
      return notification.roleName
        ? `removed your ${notification.roleName} role`
        : "removed a role from you";
    default:
      return "interacted with your forum activity";
  }
}

export function ForumNotificationRow({
  notification,
}: ForumNotificationRowProps) {
  const router = useRouter();
  const isUnread = notification.readAt === null;
  const href = getNotificationHref(notification);
  const preview =
    notification.type === "POST_REACTION"
      ? null
      : notification.post
        ? truncateContent(notification.post.content)
        : null;
  const message = getNotificationMessage(notification);

  async function openNotification() {
    if (isUnread) {
      await markForumNotificationAsRead(notification.id);
    }

    router.push(href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void openNotification();
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => void openNotification()}
      onKeyDown={handleKeyDown}
      className={cn(
        "block px-4 md:px-6 py-4 md:py-5 transition-colors duration-200 hover:bg-hover cursor-pointer",
        isUnread && "bg-yellow/15 hover:bg-yellow/25"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MinecraftHead
            seed={notification.actor.id}
            minecraftUsername={notification.actor.minecraftUsername}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="inline-flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    "font-bold",
                    isUnread ? "text-accent-dark" : "text-text-dark"
                  )}
                >
                  {notification.actor.username}
                </span>
                {isUnread && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold uppercase tracking-wide">
                    New
                  </span>
                )}
              </span>{" "}
              <span
                className={cn(
                  isUnread ? "text-text-dark" : "text-text-secondary"
                )}
              >
                {message}
              </span>
            </p>
            {preview && (
              <p
                className={cn(
                  "mt-1 text-sm line-clamp-2 whitespace-pre-wrap",
                  isUnread
                    ? "text-text-dark font-medium"
                    : "text-text-secondary"
                )}
              >
                {preview}
              </p>
            )}
          </div>
        </div>
        <time
          dateTime={notification.createdAt.toISOString()}
          className="shrink-0 text-xs text-text-secondary tabular-nums"
        >
          {formatRelativeDate(notification.createdAt)}
        </time>
      </div>
    </div>
  );
}
