import Link from "next/link";
import { cn } from "@/lib/utils";

export type MessagesTab = "direct" | "notifications";

type MessagesSidebarProps = {
  activeTab: MessagesTab;
  unreadForumNotificationCount?: number;
  unreadDirectMessageCount?: number;
};

const tabs: {
  id: MessagesTab;
  label: string;
  mobileLabel: string;
  href: string;
}[] = [
  {
    id: "notifications",
    label: "Forum Notifications",
    mobileLabel: "Notifications",
    href: "/messages",
  },
  {
    id: "direct",
    label: "Direct Messages",
    mobileLabel: "Messages",
    href: "/messages?tab=direct",
  },
];

function getTabUnreadCount(
  tabId: MessagesTab,
  unreadForumNotificationCount: number,
  unreadDirectMessageCount: number
): number {
  return tabId === "notifications"
    ? unreadForumNotificationCount
    : unreadDirectMessageCount;
}

export function MessagesSidebar({
  activeTab,
  unreadForumNotificationCount = 0,
  unreadDirectMessageCount = 0,
}: MessagesSidebarProps) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        <div className="hidden lg:block px-5 py-4 border-b border-border bg-surface">
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-secondary">
            Mail
          </h2>
        </div>
        <nav className="p-2 flex flex-row lg:flex-col gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const unreadCount = getTabUnreadCount(
              tab.id,
              unreadForumNotificationCount,
              unreadDirectMessageCount
            );

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex flex-1 lg:flex-none items-center justify-between gap-2 min-h-11 px-3 lg:px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "bg-yellow/40 text-accent-dark border border-accent/30"
                    : "text-text-secondary hover:bg-hover hover:text-text-dark border border-transparent"
                )}
              >
                <span className="truncate">
                  <span className="lg:hidden">{tab.mobileLabel}</span>
                  <span className="hidden lg:inline">{tab.label}</span>
                </span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums shrink-0">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
