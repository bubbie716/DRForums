"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearForumIndexScrollRestore,
  getPendingForumIndexScrollRestore,
  hasForumIndexScrollRestoreSettled,
  isForumIndexScrollRestoreReady,
  restoreForumIndexScrollInstant,
} from "@/lib/forum/scrollRestore";

const RETRY_DELAYS_MS = [0, 16, 50, 100, 200, 400, 800, 1200, 1800];

function tryRestorePendingScroll(): boolean {
  const scrollY = getPendingForumIndexScrollRestore();
  if (scrollY === null) {
    return false;
  }

  if (!isForumIndexScrollRestoreReady(scrollY)) {
    return false;
  }

  restoreForumIndexScrollInstant(scrollY);

  if (hasForumIndexScrollRestoreSettled(scrollY)) {
    clearForumIndexScrollRestore();
    return true;
  }

  return false;
}

export function ForumScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/") {
      return;
    }

    tryRestorePendingScroll();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

    if (!getPendingForumIndexScrollRestore()) {
      return;
    }

    if (tryRestorePendingScroll()) {
      return;
    }

    const timeouts = RETRY_DELAYS_MS.map((delay) =>
      window.setTimeout(() => {
        tryRestorePendingScroll();
      }, delay)
    );

    const resizeObserver = new ResizeObserver(() => {
      tryRestorePendingScroll();
    });

    resizeObserver.observe(document.documentElement);

    const giveUpTimer = window.setTimeout(() => {
      const scrollY = getPendingForumIndexScrollRestore();
      if (scrollY !== null) {
        restoreForumIndexScrollInstant(scrollY);
      }
      clearForumIndexScrollRestore();
      resizeObserver.disconnect();
    }, 2500);

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
      window.clearTimeout(giveUpTimer);
      resizeObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
