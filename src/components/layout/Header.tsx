import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getSessionUser } from "@/lib/auth";
import { getUnreadForumNotificationCount } from "@/lib/forum-notifications/queries";
import { getUnreadMessageCount } from "@/lib/messages/queries";
import { MessagesUnreadBadge } from "@/components/messages/MessagesUnreadBadge";
import { NavLink } from "./NavLink";

export async function Header() {
  const user = await getSessionUser();
  const [unreadDirectMessageCount, unreadForumNotificationCount] = user
    ? await Promise.all([
        getUnreadMessageCount(user.id),
        getUnreadForumNotificationCount(user.id),
      ])
    : [0, 0];
  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur-md border-b border-border shadow-sm shadow-accent/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-[80px]">
          <Link href="/" className="flex items-center gap-4 group">
            <Image
              src="/district-roleplay-logo.png"
              alt="District Roleplay"
              width={56}
              height={56}
              className="rounded-2xl object-contain shrink-0 shadow-warm group-hover:shadow-warm-lg transition-shadow duration-300"
              priority
            />
            <div>
              <div className="font-bold text-text-dark text-lg leading-tight group-hover:text-accent transition-colors duration-200">
                District Roleplay
              </div>
              <div className="text-sm text-text-secondary mt-0.5">
                Community Forum
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/" exact>
              Forums
            </NavLink>

            {user ? (
              <>
                <NavLink href="/messages">
                  <span className="inline-flex items-center gap-2">
                    Messages
                    <Suspense fallback={null}>
                      <MessagesUnreadBadge
                        unreadForumNotificationCount={
                          unreadForumNotificationCount
                        }
                        unreadDirectMessageCount={unreadDirectMessageCount}
                      />
                    </Suspense>
                  </span>
                </NavLink>
                <NavLink href={`/profile/${user.username}`} exact>
                  Profile
                </NavLink>
                <NavLink href="/settings" exact>
                  Settings
                </NavLink>
                <form action="/api/auth/logout" method="POST" className="ml-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <NavLink href="/login" exact>
                  Login
                </NavLink>
                <Link
                  href="/register"
                  className="ml-2 px-6 py-2.5 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
