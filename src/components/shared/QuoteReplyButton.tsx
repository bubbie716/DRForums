"use client";

import { useQuoteReply } from "@/components/shared/QuoteReplyContext";

type QuoteReplyButtonProps = {
  username: string;
  content: string;
  replyToPostId?: string;
  replyToMessageId?: string;
};

export function QuoteReplyButton({
  username,
  content,
  replyToPostId,
  replyToMessageId,
}: QuoteReplyButtonProps) {
  const { requestQuoteReply } = useQuoteReply();

  return (
    <button
      type="button"
      onClick={() =>
        requestQuoteReply({
          username,
          content,
          replyToPostId,
          replyToMessageId,
        })
      }
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-accent hover:bg-hover transition-colors"
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        className="w-3.5 h-3.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h10m0 0-3-3m3 3-3 3M7 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2"
        />
      </svg>
      Quote Reply
    </button>
  );
}
