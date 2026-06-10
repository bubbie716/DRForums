"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
};

export function NavLink({ href, children, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "group/nav relative px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
        isActive
          ? "text-accent hover:bg-hover"
          : "text-text-secondary hover:text-accent hover:bg-hover"
      )}
    >
      {children}
      <span
        className={cn(
          "absolute bottom-0 left-5 right-5 h-[3px] bg-gradient-orange rounded-full transition-opacity duration-200",
          isActive ? "opacity-100" : "opacity-0 group-hover/nav:opacity-100"
        )}
        aria-hidden="true"
      />
    </Link>
  );
}
