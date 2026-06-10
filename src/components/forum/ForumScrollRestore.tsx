"use client";

import { useEffect } from "react";
import { consumeForumIndexScrollRestore } from "@/lib/forum/scrollRestore";

export function ForumScrollRestore() {
  useEffect(() => {
    const scrollY = consumeForumIndexScrollRestore();
    if (scrollY === null) {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    });
  }, []);

  return null;
}
