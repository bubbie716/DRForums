"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MessagesUnreadBadge } from "@/components/messages/MessagesUnreadBadge";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

type HeaderNavigationProps = {
  user: { username: string } | null;
  unreadForumNotificationCount: number;
  unreadDirectMessageCount: number;
};

function MobileMenuButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-nav-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-text-dark hover:bg-hover transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="w-6 h-6"
        aria-hidden="true"
      >
        {open ? (
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        ) : (
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        )}
      </svg>
    </button>
  );
}

export function HeaderNavigation({
  user,
  unreadForumNotificationCount,
  unreadDirectMessageCount,
}: HeaderNavigationProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, user?.username]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const messagesBadge = (
    <Suspense fallback={null}>
      <MessagesUnreadBadge
        unreadForumNotificationCount={unreadForumNotificationCount}
        unreadDirectMessageCount={unreadDirectMessageCount}
      />
    </Suspense>
  );

  return (
    <>
      <nav className="hidden md:flex items-center gap-1">
        <NavLink href="/" exact>
          Forums
        </NavLink>

        {user ? (
          <>
            <NavLink href="/messages">
              <span className="inline-flex items-center gap-2">
                Messages
                {messagesBadge}
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
                className="min-h-11 px-6 py-2.5 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
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
              className="ml-2 min-h-11 inline-flex items-center px-6 py-2.5 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Register
            </Link>
          </>
        )}
      </nav>

      <MobileMenuButton
        open={mobileOpen}
        onClick={() => setMobileOpen((current) => !current)}
      />

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-50">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-text-dark/20"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            id="mobile-nav-menu"
            className="relative bg-cream border-b border-border shadow-warm-lg px-4 py-4 space-y-1 max-h-[calc(100dvh-3.5rem)] overflow-y-auto"
          >
            <NavLink href="/" exact stacked onNavigate={() => setMobileOpen(false)}>
              Forums
            </NavLink>
            {user ? (
              <>
                <NavLink
                  href="/messages"
                  stacked
                  onNavigate={() => setMobileOpen(false)}
                >
                  <span className="inline-flex items-center gap-2">
                    Messages
                    {messagesBadge}
                  </span>
                </NavLink>
                <NavLink
                  href={`/profile/${user.username}`}
                  exact
                  stacked
                  onNavigate={() => setMobileOpen(false)}
                >
                  Profile
                </NavLink>
                <NavLink
                  href="/settings"
                  exact
                  stacked
                  onNavigate={() => setMobileOpen(false)}
                >
                  Settings
                </NavLink>
                <form
                  action="/api/auth/logout"
                  method="POST"
                  className="pt-2 border-t border-border/60 mt-2"
                >
                  <button
                    type="submit"
                    className="w-full min-h-11 px-4 py-3 text-sm font-bold bg-gradient-orange text-white rounded-xl hover:shadow-warm-lg transition-all duration-200"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <NavLink
                  href="/login"
                  exact
                  stacked
                  onNavigate={() => setMobileOpen(false)}
                >
                  Login
                </NavLink>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center min-h-11 px-4 py-3 text-sm font-bold rounded-xl",
                    "bg-gradient-orange text-white hover:shadow-warm-lg transition-all duration-200"
                  )}
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
