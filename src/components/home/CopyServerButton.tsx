"use client";

import { useState } from "react";

const SERVER_IP = "play.districtrp.xyz";

export function CopyServerButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SERVER_IP);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = SERVER_IP;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="relative inline-flex">
      {copied && (
        <span
          role="status"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-semibold text-white bg-text-dark rounded-lg shadow-warm whitespace-nowrap"
        >
          Copied
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-text-dark" />
        </span>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-2.5 px-8 py-4 bg-yellow text-text-dark font-bold rounded-2xl cursor-pointer hover:shadow-warm-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
      >
        <svg
          className="w-5 h-5 text-accent shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {SERVER_IP}
      </button>
    </div>
  );
}
