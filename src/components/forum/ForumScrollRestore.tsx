"use client";

import { useLayoutEffect } from "react";
import { consumeForumIndexScrollRestore } from "@/lib/forum/scrollRestore";

function restoreScrollPositionInstant(scrollY: number): void {
  const { documentElement: html, body } = document;
  const htmlBehavior = html.style.scrollBehavior;
  const bodyBehavior = body.style.scrollBehavior;

  html.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";
  window.scrollTo(0, scrollY);

  html.style.scrollBehavior = htmlBehavior;
  body.style.scrollBehavior = bodyBehavior;
}

export function ForumScrollRestore() {
  useLayoutEffect(() => {
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
  }, []);

  return null;
}
