export function getMessagesUnreadDisplayCount(
  pathname: string,
  tab: string | null,
  unreadForumNotificationCount: number,
  unreadDirectMessageCount: number
): number {
  if (!pathname.startsWith("/messages")) {
    return unreadForumNotificationCount + unreadDirectMessageCount;
  }

  if (pathname === "/messages") {
    if (tab === "direct") {
      return 0;
    }

    return unreadDirectMessageCount;
  }

  return 0;
}
