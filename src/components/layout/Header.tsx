import Link from "next/link";
import Image from "next/image";
import { getSessionUser } from "@/lib/auth";
import { getUnreadMessageCount } from "@/lib/messages/queries";
import { NavLink } from "./NavLink";

export async function Header() {
  const user = await getSessionUser();
  const unreadMessageCount = user
    ? await getUnreadMessageCount(user.id)
    : 0;

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
                Municipal Forum
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
                    {unreadMessageCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold tabular-nums">
                        {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                      </span>
                    )}
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
