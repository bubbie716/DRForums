"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import {
  clearForumIndexScrollRestore,
  isForumIndexScrollRestorePending,
  restoreForumIndexScrollByAnchor,
} from "@/lib/forum/scrollRestore";

const LAYOUT_RETRY_MS = [100, 300, 600];

function runRestoreOnce(): boolean {
  if (!isForumIndexScrollRestorePending()) {
    return false;
  }

  const forums = document.getElementById("forums");
  if (!forums) {
    return false;
  }

  restoreForumIndexScrollByAnchor();
  clearForumIndexScrollRestore();

  return true;
}

export function ForumScrollRestore() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (pathname !== "/" || !isForumIndexScrollRestorePending()) {
      return;
    }

    runRestoreOnce();
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/" || !isForumIndexScrollRestorePending()) {
      return;
    }

    const timeouts = LAYOUT_RETRY_MS.map((delay) =>
      window.setTimeout(() => {
        if (!isForumIndexScrollRestorePending()) {
          return;
        }

        runRestoreOnce();
      }, delay)
    );

    const giveUpTimeout = window.setTimeout(() => {
      if (isForumIndexScrollRestorePending()) {
        clearForumIndexScrollRestore();
      }
    }, 1000);

    return () => {
      for (const timeout of timeouts) {
        window.clearTimeout(timeout);
      }
      window.clearTimeout(giveUpTimeout);
    };
  }, [pathname]);

  return null;
}
