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
      className={className}
      onClick={() => markForumIndexScrollRestore()}
    >
      {children}
    </Link>
  );
}
