import type { ForumNotificationItem } from "@/lib/forum-notifications/queries";
import { ForumNotificationRow } from "@/components/messages/ForumNotificationRow";

type ForumNotificationsListProps = {
  notifications: ForumNotificationItem[];
};

export function ForumNotificationsList({
  notifications,
}: ForumNotificationsListProps) {
  if (notifications.length === 0) {
    return (
      <div className="bg-white border border-border rounded-2xl shadow-warm px-4 md:px-8 py-12 md:py-16 text-center">
        <h3 className="text-lg font-bold text-text-dark">No forum notifications</h3>
        <p className="text-text-secondary mt-2 max-w-md mx-auto">
          Mentions, replies to your threads, and reactions to your posts will
          appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden divide-y divide-border/60">
      {notifications.map((notification) => (
        <ForumNotificationRow
          key={notification.id}
          notification={notification}
        />
      ))}
    </div>
  );
}
