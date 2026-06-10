"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  stacked?: boolean;
  onNavigate?: () => void;
};

export function NavLink({
  href,
  children,
  exact = false,
  stacked = false,
  onNavigate,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        stacked
          ? "flex items-center min-h-11 px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200"
          : "group/nav relative inline-flex items-center min-h-11 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
        isActive
          ? "text-accent bg-yellow/30"
          : "text-text-secondary hover:text-accent hover:bg-hover"
      )}
    >
      {children}
      {!stacked && (
        <span
          className={cn(
            "absolute bottom-0 left-5 right-5 h-[3px] bg-gradient-orange rounded-full transition-opacity duration-200",
            isActive ? "opacity-100" : "opacity-0 group-hover/nav:opacity-100"
          )}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}
