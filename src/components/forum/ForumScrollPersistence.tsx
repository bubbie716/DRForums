"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isForumIndexScrollRestorePending,
  saveForumIndexScrollPosition,
} from "@/lib/forum/scrollRestore";

export function ForumScrollPersistence() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") {
      return;
    }

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

    persistScrollPosition();
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

      if (isForumIndexScrollRestorePending()) {
        return;
      }

      const currentScrollY = window.scrollY;
      const previousScrollY = Number.parseInt(
        sessionStorage.getItem("forum-index-scroll-y") ?? "0",
        10
      );

      if (currentScrollY > 0 || !Number.isFinite(previousScrollY) || previousScrollY <= 0) {
        saveForumIndexScrollPosition(currentScrollY);
      }
    };
  }, [pathname]);

  return null;
}
