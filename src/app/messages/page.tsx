import Link from "next/link";
import { ConversationList } from "@/components/messages/ConversationList";
import { ClearAllNotificationsButton } from "@/components/messages/ClearAllNotificationsButton";
import { ForumNotificationsList } from "@/components/messages/ForumNotificationsList";
import { MarkAllDirectMessagesReadButton } from "@/components/messages/MarkAllDirectMessagesReadButton";
import {
  MessagesSidebar,
  type MessagesTab,
} from "@/components/messages/MessagesSidebar";
import { getSessionUser } from "@/lib/auth";
import {
  getConversationList,
  getUnreadMessageCount,
} from "@/lib/messages/queries";
import {
  getForumNotifications,
  getUnreadForumNotificationCount,
} from "@/lib/forum-notifications/queries";

type MessagesPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

function parseTab(tab?: string): MessagesTab {
  return tab === "direct" ? "direct" : "notifications";
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const isDirectTab = tab === "direct";

  const [
    conversations,
    forumNotifications,
    unreadDirectMessageCount,
    unreadForumNotificationCount,
  ] = await Promise.all([
    isDirectTab ? getConversationList(user.id) : Promise.resolve([]),
    isDirectTab ? Promise.resolve([]) : getForumNotifications(user.id),
    getUnreadMessageCount(user.id),
    getUnreadForumNotificationCount(user.id),
  ]);

  return (
    <div className="bg-surface min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 lg:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-dark">Messages</h1>
            <p className="text-text-secondary mt-1">
              {isDirectTab
                ? "Private conversations with forum members"
                : "Updates from forum activity"}
            </p>
          </div>
          {isDirectTab ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
              {unreadDirectMessageCount > 0 && (
                <MarkAllDirectMessagesReadButton />
              )}
              <Link
                href="/messages/new"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-11 px-6 py-2.5 bg-gradient-orange text-white font-bold rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Compose
              </Link>
            </div>
          ) : forumNotifications.length > 0 ? (
            <ClearAllNotificationsButton />
          ) : null}
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-6">
          <MessagesSidebar
            activeTab={tab}
            unreadForumNotificationCount={
              isDirectTab ? unreadForumNotificationCount : 0
            }
            unreadDirectMessageCount={
              isDirectTab ? 0 : unreadDirectMessageCount
            }
          />
          <div className="flex-1 min-w-0">
            {isDirectTab ? (
              <ConversationList
                conversations={conversations}
                emptyTitle="No direct messages"
                emptyDescription="Start a private conversation with another member."
              />
            ) : (
              <ForumNotificationsList notifications={forumNotifications} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
