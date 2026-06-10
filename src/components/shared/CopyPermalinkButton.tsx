"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

type CopyPermalinkButtonProps = {
  href: string;
  label?: string;
};

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

export function CopyPermalinkButton({
  href,
  label = "Copy link",
}: CopyPermalinkButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  async function handleCopy() {
    const url = `${window.location.origin}${href}`;
    await copyText(url);

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleCopy}
        aria-label={label}
        className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-lg text-text-secondary hover:text-accent hover:bg-hover transition-colors"
      >
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.5 11.5a3.5 3.5 0 0 0 4.95 0l2.12-2.12a3.5 3.5 0 0 0-4.95-4.95L10.73 5.4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.5 8.5a3.5 3.5 0 0 0-4.95 0L4.43 10.62a3.5 3.5 0 0 0 4.95 4.95l.79-.79"
          />
        </svg>
      </button>
      {copied &&
        createPortal(
          <span
            role="status"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
            }}
            className="fixed z-50 -translate-x-1/2 -translate-y-full px-3 py-1.5 text-xs font-semibold text-white bg-text-dark rounded-lg shadow-warm whitespace-nowrap pointer-events-none"
          >
            Copied
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-dark" />
          </span>,
          document.body
        )}
    </>
  );
}
