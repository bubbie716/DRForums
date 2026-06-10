"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { consumeForumIndexScrollRestore } from "@/lib/forum/scrollRestore";

function restoreScrollPositionInstant(scrollY: number): void {
  const { documentElement: html, body } = document;
  const htmlBehavior = html.style.scrollBehavior;
  const bodyBehavior = body.style.scrollBehavior;
  const previousHistoryRestoration = history.scrollRestoration;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  history.scrollRestoration = "manual";
  window.scrollTo(0, scrollY);

  html.style.scrollBehavior = htmlBehavior;
  body.style.scrollBehavior = bodyBehavior;
  history.scrollRestoration = previousHistoryRestoration;
}

export function ForumScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/") {
      return;
    }

    const scrollY = consumeForumIndexScrollRestore();
    if (scrollY === null) {
      return;
    }

    restoreScrollPositionInstant(scrollY);

    const frameId = window.requestAnimationFrame(() => {
      restoreScrollPositionInstant(scrollY);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return null;
}
