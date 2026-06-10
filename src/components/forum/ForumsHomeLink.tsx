"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { markForumIndexScrollRestore } from "@/lib/forum/scrollRestore";

type ForumsHomeLinkProps = {
  children: ReactNode;
  className?: string;
};

export function ForumsHomeLink({ children, className }: ForumsHomeLinkProps) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    markForumIndexScrollRestore();
    router.push("/", { scroll: false });
  }

  return (
    <Link href="/" scroll={false} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
