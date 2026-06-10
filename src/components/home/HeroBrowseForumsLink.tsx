"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type HeroBrowseForumsLinkProps = {
  children: ReactNode;
  className?: string;
};

function getHeaderScrollOffset(): number {
  const headerSpacer = document.querySelector<HTMLElement>(
    "header + div[aria-hidden='true']"
  );

  if (headerSpacer) {
    return headerSpacer.getBoundingClientRect().height;
  }

  const header = document.querySelector("header");
  return header?.getBoundingClientRect().height ?? 0;
}

function scrollToForumsColorBreak(): void {
  const forums = document.getElementById("forums");
  if (!forums) {
    return;
  }

  const breakY = forums.getBoundingClientRect().top + window.scrollY;
  const target = Math.max(0, breakY - getHeaderScrollOffset());

  window.scrollTo({ top: target, behavior: "smooth" });
}

export function HeroBrowseForumsLink({
  children,
  className,
}: HeroBrowseForumsLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    scrollToForumsColorBreak();
  }

  return (
    <Link href="#forums" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
