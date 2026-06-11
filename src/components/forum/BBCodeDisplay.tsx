"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type BBCodeDisplayProps = {
  html: string;
  className?: string;
};

export function BBCodeDisplay({ html, className }: BBCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    function handleSpoilerClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }
      if (!target.classList.contains("bbcode-spoiler-toggle")) {
        return;
      }

      const spoiler = target.closest(".bbcode-spoiler");
      const content = spoiler?.querySelector(".bbcode-spoiler-content");
      if (!content) {
        return;
      }

      content.classList.toggle("hidden");
      target.textContent = content.classList.contains("hidden")
        ? "Spoiler"
        : "Hide spoiler";
    }

    function handleImageClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) {
        return;
      }
      if (!target.classList.contains("bbcode-img") || !target.src) {
        return;
      }

      window.open(target.src, "_blank", "noopener,noreferrer");
    }

    container.addEventListener("click", handleSpoilerClick);
    container.addEventListener("click", handleImageClick);

    return () => {
      container.removeEventListener("click", handleSpoilerClick);
      container.removeEventListener("click", handleImageClick);
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={cn("bbcode-content break-words", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
