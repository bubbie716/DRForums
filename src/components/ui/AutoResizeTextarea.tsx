"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const textareaClassName =
  "auto-resize-textarea w-full px-4 py-3 rounded-xl bg-cream border border-border text-text-dark placeholder:text-text-muted focus:outline-none focus-visible:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none overflow-hidden";

type AutoResizeTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function syncTextareaHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function AutoResizeTextarea({
  className,
  value,
  defaultValue,
  onChange,
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    syncTextareaHeight(textarea);
  }, [value, defaultValue]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      defaultValue={defaultValue}
      onChange={(event) => {
        onChange?.(event);
        syncTextareaHeight(event.currentTarget);
      }}
      className={cn(textareaClassName, className)}
      {...props}
    />
  );
}
