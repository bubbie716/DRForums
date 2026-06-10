"use client";

import { useEffect } from "react";
import {
  isForumIndexScrollRestorePending,
  saveForumIndexScrollPosition,
} from "@/lib/forum/scrollRestore";

export function ForumScrollTracker() {
  useEffect(() => {
    let frameId: number | null = null;

    function persistScrollPosition() {
      if (isForumIndexScrollRestorePending()) {
        return;
      }

      saveForumIndexScrollPosition(window.scrollY);
    }

    function handleScroll() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        persistScrollPosition();
      });
    }

    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      saveForumIndexScrollPosition(window.scrollY);
    }

    if (!isForumIndexScrollRestorePending()) {
      persistScrollPosition();
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", persistScrollPosition);
    document.addEventListener("click", handleClick, true);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", persistScrollPosition);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
