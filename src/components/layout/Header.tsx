import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getUnreadForumNotificationCount } from "@/lib/forum-notifications/queries";
import { getUnreadMessageCount } from "@/lib/messages/queries";
import { HeaderNavigation } from "./HeaderNavigation";
import { ScrollAwareHeader } from "./ScrollAwareHeader";

export async function Header() {
  const user = await getSessionUser();
  const [unreadDirectMessageCount, unreadForumNotificationCount, showAdmin] =
    user
      ? await Promise.all([
          getUnreadMessageCount(user.id),
          getUnreadForumNotificationCount(user.id),
          hasPermission(user.id, "admin.dashboard.view"),
        ])
      : [0, 0, false];

  return (
    <ScrollAwareHeader>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-[80px]">
          <Link href="/" className="flex items-center gap-3 md:gap-4 group min-w-0">
            <Image
              src="/district-roleplay-logo.png"
              alt="District Roleplay"
              width={56}
              height={56}
              className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl object-contain shrink-0 shadow-warm group-hover:shadow-warm-lg transition-shadow duration-300"
              priority
            />
            <div className="min-w-0">
              <div className="font-bold text-text-dark text-base md:text-lg leading-tight group-hover:text-accent transition-colors duration-200 truncate">
                District Roleplay
              </div>
              <div className="hidden sm:block text-sm text-text-secondary mt-0.5">
                Community Forum
              </div>
            </div>
          </Link>

          <HeaderNavigation
            user={
              user
                ? { username: user.username, isAdmin: showAdmin }
                : null
            }
            unreadForumNotificationCount={unreadForumNotificationCount}
            unreadDirectMessageCount={unreadDirectMessageCount}
          />
        </div>
      </div>
    </ScrollAwareHeader>
  );
}
