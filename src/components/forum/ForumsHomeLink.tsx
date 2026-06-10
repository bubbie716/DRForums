"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { markForumIndexScrollRestore } from "@/lib/forum/scrollRestore";

type ForumsHomeLinkProps = {
  children: ReactNode;
  className?: string;
};

export function ForumsHomeLink({ children, className }: ForumsHomeLinkProps) {
  return (
    <Link
      href="/"
      scroll={false}
      className={className}
      onClick={() => markForumIndexScrollRestore()}
    >
      {children}
    </Link>
  );
}
