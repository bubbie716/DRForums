"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { formInputClassName } from "@/components/ui/fieldStyles";
import { syncTextareaHeight } from "@/lib/autoResizeField";
import { cn } from "@/lib/utils";

export const textareaClassName = cn(
  formInputClassName,
  "resize-none overflow-hidden"
);

type AutoResizeTextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const AutoResizeTextarea = forwardRef<
  HTMLTextAreaElement,
  AutoResizeTextareaProps
>(function AutoResizeTextarea(
  { className, value, defaultValue, onChange, ...props },
  forwardedRef
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(forwardedRef, () => textareaRef.current!, []);

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
});
