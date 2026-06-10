"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { getMessagesUnreadDisplayCount } from "@/lib/messages/unread-count";

type MessagesUnreadBadgeProps = {
  unreadForumNotificationCount: number;
  unreadDirectMessageCount: number;
};

export function MessagesUnreadBadge({
  unreadForumNotificationCount,
  unreadDirectMessageCount,
}: MessagesUnreadBadgeProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unreadCount = getMessagesUnreadDisplayCount(
    pathname,
    searchParams.get("tab"),
    unreadForumNotificationCount,
    unreadDirectMessageCount
  );

  if (unreadCount <= 0) {
    return null;
  }

  return (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums">
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  );
}
