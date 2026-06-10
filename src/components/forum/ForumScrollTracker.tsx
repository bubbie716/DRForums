"use client";

import { useEffect } from "react";
import { saveForumIndexScrollPosition } from "@/lib/forum/scrollRestore";

export function ForumScrollTracker() {
  useEffect(() => {
    let frameId: number | null = null;

    function persistScrollPosition() {
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

    persistScrollPosition();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", persistScrollPosition);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", persistScrollPosition);
    };
  }, []);

  return null;
}
